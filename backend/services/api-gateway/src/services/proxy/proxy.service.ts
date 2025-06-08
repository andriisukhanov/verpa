import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ServiceDiscoveryService } from './service-discovery.service';

export interface ProxyOptions {
  service: string;
  path: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly defaultTimeout = 30000; // 30 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly serviceDiscovery: ServiceDiscoveryService,
  ) {}

  async forward(options: ProxyOptions): Promise<any> {
    // Use getHealthyServiceUrl to ensure service is healthy before forwarding
    const serviceUrl = await this.serviceDiscovery.getHealthyServiceUrl(options.service);
    const url = `${serviceUrl}${options.path}`;

    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      url,
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      params: options.params,
      timeout: options.timeout || this.defaultTimeout,
    };

    try {
      const response = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      this.handleProxyError(error as AxiosError, options.service, options.path);
    }
  }

  async get(service: string, path: string, options?: Partial<ProxyOptions>): Promise<any> {
    return this.forward({
      service,
      path,
      method: 'GET',
      ...options,
    });
  }

  async post(
    service: string,
    path: string,
    data: any,
    options?: Partial<ProxyOptions>,
  ): Promise<any> {
    return this.forward({
      service,
      path,
      method: 'POST',
      data,
      ...options,
    });
  }

  async put(
    service: string,
    path: string,
    data: any,
    options?: Partial<ProxyOptions>,
  ): Promise<any> {
    return this.forward({
      service,
      path,
      method: 'PUT',
      data,
      ...options,
    });
  }

  async patch(
    service: string,
    path: string,
    data: any,
    options?: Partial<ProxyOptions>,
  ): Promise<any> {
    return this.forward({
      service,
      path,
      method: 'PATCH',
      data,
      ...options,
    });
  }

  async delete(service: string, path: string, options?: Partial<ProxyOptions>): Promise<any> {
    return this.forward({
      service,
      path,
      method: 'DELETE',
      ...options,
    });
  }

  private handleProxyError(error: AxiosError, service: string, path: string): never {
    this.logger.error(
      `Proxy error for ${service}${path}: ${error.message}`,
      error.stack,
    );

    if (error.response) {
      // The service responded with an error
      throw new HttpException(
        error.response.data || 'Service error',
        error.response.status,
      );
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Service is not available
      throw new HttpException(
        `Service '${service}' is not available`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      // Request timeout
      throw new HttpException(
        `Request to '${service}' timed out`,
        HttpStatus.GATEWAY_TIMEOUT,
      );
    } else {
      // Unknown error
      throw new HttpException(
        'Internal gateway error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}