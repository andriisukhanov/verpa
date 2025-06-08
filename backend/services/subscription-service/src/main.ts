import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SubscriptionService');
  
  // Create HTTP application
  const app = await NestFactory.create(AppModule, {
    // Raw body is needed for Stripe webhooks
    rawBody: true,
  });
  
  const configService = app.get(ConfigService);
  
  // Global prefix (except for webhooks)
  app.setGlobalPrefix('api', {
    exclude: ['webhooks/stripe'],
  });
  
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
    .setTitle('Subscription Service API')
    .setDescription('Subscription and payment management service for Verpa')
    .setVersion('1.0')
    .addTag('subscriptions')
    .addTag('payments')
    .addTag('invoices')
    .addTag('webhooks')
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
  logger.log('Subscription Kafka microservice is listening');

  // Start HTTP server
  const port = configService.get('service.port');
  await app.listen(port);
  logger.log(`Subscription Service is running on: http://localhost:${port}`);
  logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
  logger.log('Stripe webhook endpoint: POST /webhooks/stripe');
}

bootstrap();