import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { getCorsOrigins, isOriginAllowed } from './config/env';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const allowedOrigins = getCorsOrigins(configService);

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: CorsOriginCallback,
    ) => {
      if (!requestOrigin || isOriginAllowed(requestOrigin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(`Origin ${requestOrigin} is not allowed by CORS`),
        false,
      );
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EcoTrack API')
    .setDescription('Documentacion de endpoints REST de EcoTrack')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('swagger', app, swaggerDocument, {
    jsonDocumentUrl: 'swagger/json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
