import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class ExternalApiHealthIndicator extends HealthIndicator {
  async checkExternalApi(
    key: string,
    url: string,
    options?: AxiosRequestConfig & { expectedStatus?: number },
  ): Promise<HealthIndicatorResult> {
    const expectedStatus = options?.expectedStatus || 200;
    const timeout = options?.timeout || 5000;

    try {
      const start = Date.now();
      const response = await axios.get(url, {
        ...options,
        timeout,
        validateStatus: () => true, // Don't throw on any status
      });
      const latency = Date.now() - start;

      const isHealthy = response.status === expectedStatus;

      if (isHealthy) {
        return this.getStatus(key, true, {
          url,
          status: response.status,
          latency: `${latency}ms`,
        });
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw new HealthCheckError(
        `External API health check failed for ${url}`,
        this.getStatus(key, false, {
          url,
          error: error.message,
          code: error.code,
        }),
      );
    }
  }

  async checkMultipleApis(
    apis: Array<{ key: string; url: string; options?: AxiosRequestConfig }>,
  ): Promise<HealthIndicatorResult> {
    const results = {};
    let allHealthy = true;

    for (const api of apis) {
      try {
        const result = await this.checkExternalApi(api.key, api.url, api.options);
        results[api.key] = result[api.key];
      } catch (error) {
        allHealthy = false;
        if (error instanceof HealthCheckError) {
          results[api.key] = error.causes[api.key];
        } else {
          results[api.key] = {
            status: 'down',
            error: error.message,
          };
        }
      }
    }

    if (allHealthy) {
      return results;
    } else {
      throw new HealthCheckError('One or more external APIs are unhealthy', results);
    }
  }
}