import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');
  
  // Create HTTP application
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Analytics Service API')
    .setDescription('Analytics and insights service for Verpa aquarium management')
    .setVersion('1.0')
    .addTag('analytics')
    .addTag('reports')
    .addTag('metrics')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Create Kafka microservice
  const kafkaMicroservice = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: configService.get('kafka.clientId'),
          brokers: configService.get('kafka.brokers'),
        },
        consumer: {
          groupId: configService.get('kafka.groupId'),
        },
      },
    },
  );

  // Start Kafka microservice
  await kafkaMicroservice.listen();
  logger.log('Analytics Kafka microservice is listening');

  // Start HTTP server
  const port = configService.get('service.port');
  await app.listen(port);
  logger.log(`Analytics Service is running on: http://localhost:${port}`);
  logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();