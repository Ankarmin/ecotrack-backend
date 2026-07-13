import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';

import { AppModule } from './app.module';
import { getCorsOrigins, isOriginAllowed } from './config/env';

function translateValidationErrors(errors: ValidationError[]): string {
  const translatedMessages = errors
    .flatMap((error) => Object.values(error.constraints ?? {}))
    .map(translateConstraint);

  return translatedMessages.join('. ');
}

function translateConstraint(message: string): string {
  const translations: Record<string, string> = {
    'must be an email': 'debe ser un correo electrónico válido',
    'must be a string': 'debe ser texto',
    'should not be empty': 'no debe estar vacío',
    'must be a boolean value': 'debe ser verdadero o falso',
    'must be an integer number': 'debe ser un número entero',
    'must be a UUID': 'debe ser un identificador UUID válido',
    'must be an array': 'debe ser una lista',
  };

  for (const [english, spanish] of Object.entries(translations)) {
    if (message.includes(english)) {
      return message.replace(english, spanish);
    }
  }

  if (message.startsWith('phone must match')) {
    return 'El teléfono solo puede contener números, espacios, +, - y paréntesis';
  }

  if (message.includes('must be longer than or equal to')) {
    return message.replace(
      /must be longer than or equal to (\d+) characters/,
      'debe tener al menos $1 caracteres',
    );
  }

  if (message.includes('must be shorter than or equal to')) {
    return message.replace(
      /must be shorter than or equal to (\d+) characters/,
      'no debe exceder $1 caracteres',
    );
  }

  if (message.includes('must not be less than')) {
    return message.replace(
      /must not be less than (\d+)/,
      'debe ser al menos $1',
    );
  }

  if (message.includes('must not be greater than')) {
    return message.replace(
      /must not be greater than (\d+)/,
      'no debe ser mayor que $1',
    );
  }

  if (message.includes('must be one of the following values')) {
    return message.replace(
      /must be one of the following values: (.+)/,
      'debe ser uno de los siguientes valores: $1',
    );
  }

  if (message.includes('must match')) {
    return message.replace(
      /must match (.+) regular expression/,
      'no cumple con el formato requerido',
    );
  }

  return message;
}

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

export function configureApp(app: INestApplication) {
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
      exceptionFactory(errors: ValidationError[]) {
        return new BadRequestException(translateValidationErrors(errors));
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EcoTrack API')
    .setDescription('Documentación de endpoints REST de EcoTrack')
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

  return app;
}

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  return app;
}
