import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  async checkKafka(key: string, client: ClientKafka): Promise<HealthIndicatorResult> {
    try {
      const start = Date.now();
      
      // Check if client is connected
      // Note: This is a simplified check - in production you might want to
      // actually produce/consume a test message
      const isConnected = await this.isKafkaConnected(client);
      const latency = Date.now() - start;

      if (isConnected) {
        return this.getStatus(key, true, {
          status: 'connected',
          latency: `${latency}ms`,
        });
      } else {
        throw new Error('Kafka client not connected');
      }
    } catch (error) {
      throw new HealthCheckError(
        'Kafka health check failed',
        this.getStatus(key, false, {
          status: 'disconnected',
          error: error.message,
        }),
      );
    }
  }

  private async isKafkaConnected(client: ClientKafka): Promise<boolean> {
    try {
      // This is a basic check - you might want to implement a more robust check
      // by actually trying to produce/consume a message
      return client && typeof client.connect === 'function';
    } catch {
      return false;
    }
  }
}