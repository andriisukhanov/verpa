import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventPublisher implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.kafka = new Kafka({
      clientId: 'aquarium-service',
      brokers: this.configService.get<string[]>('kafka.brokers'),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.connect();
    this.setupEventListeners();
  }

  private async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      // Retry connection after delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  private setupEventListeners() {
    // Aquarium events
    this.eventEmitter.on('aquarium.created', (data) => this.publish('aquarium.events', 'aquarium.created', data));
    this.eventEmitter.on('aquarium.updated', (data) => this.publish('aquarium.events', 'aquarium.updated', data));
    this.eventEmitter.on('aquarium.deleted', (data) => this.publish('aquarium.events', 'aquarium.deleted', data));
    this.eventEmitter.on('aquarium.restored', (data) => this.publish('aquarium.events', 'aquarium.restored', data));
    this.eventEmitter.on('aquarium.critical', (data) => this.publish('aquarium.alerts', 'aquarium.critical', data));
    this.eventEmitter.on('aquarium.warning', (data) => this.publish('aquarium.alerts', 'aquarium.warning', data));
    this.eventEmitter.on('aquarium.overstocked', (data) => this.publish('aquarium.alerts', 'aquarium.overstocked', data));
    this.eventEmitter.on('aquarium.waterChangeNeeded', (data) => this.publish('aquarium.alerts', 'aquarium.waterChangeNeeded', data));

    // Equipment events
    this.eventEmitter.on('equipment.added', (data) => this.publish('aquarium.events', 'equipment.added', data));
    this.eventEmitter.on('equipment.removed', (data) => this.publish('aquarium.events', 'equipment.removed', data));

    // Inhabitant events
    this.eventEmitter.on('inhabitant.added', (data) => this.publish('aquarium.events', 'inhabitant.added', data));
    this.eventEmitter.on('inhabitant.removed', (data) => this.publish('aquarium.events', 'inhabitant.removed', data));
  }

  async publish(topic: string, eventType: string, data: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('Kafka producer not connected, event dropped:', eventType);
      return;
    }

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: eventType,
          value: JSON.stringify({
            eventType,
            timestamp: new Date().toISOString(),
            data,
          }),
          headers: {
            eventType,
            service: 'aquarium-service',
          },
        },
      ],
    };

    try {
      await this.producer.send(record);
      console.log(`Event published: ${eventType}`);
    } catch (error) {
      console.error(`Failed to publish event ${eventType}:`, error);
      // Could implement retry logic or dead letter queue here
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.producer.disconnect();
      console.log('Kafka producer disconnected');
    }
  }
}