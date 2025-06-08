import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { EventType } from '@verpa/common';

@Injectable()
export class EventService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'aquarium-service',
      brokers: this.configService.get<string[]>('kafka.brokers') || ['localhost:9092'],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'aquarium-service-group' });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      // In development, we might want to continue without Kafka
      if (this.configService.get('NODE_ENV') !== 'production') {
        console.warn('Running without Kafka connection in development mode');
      } else {
        throw error;
      }
    }
  }

  private async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
    }
  }

  async publishAquariumEvent(eventType: string, data: any) {
    if (!this.isConnected) {
      console.warn('Kafka not connected, skipping event publish');
      return;
    }

    try {
      await this.producer.send({
        topic: 'aquarium-events',
        messages: [
          {
            key: data.aquariumId || data.id,
            value: JSON.stringify({
              type: eventType,
              timestamp: new Date().toISOString(),
              data,
            }),
          },
        ],
      });
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }

  async subscribeToUserEvents(userId: string, handler: (event: any) => void) {
    if (!this.isConnected) {
      console.warn('Kafka not connected, skipping subscription');
      return;
    }

    await this.consumer.subscribe({ topic: 'user-events', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          if (event.data?.userId === userId) {
            handler(event);
          }
        } catch (error) {
          console.error('Failed to process message:', error);
        }
      },
    });
  }
}