import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });

  const configService = app.get(ConfigService);
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  logger.log(`PORT env = ${process.env.PORT}, listening on ${port}`);

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: [
      frontendUrl,
      /\.assurancesoueedzem\.ma$/,
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Assurances Oued Zem API')
    .setDescription('API complète de gestion d\'agence d\'assurance')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification')
    .addTag('clients', 'Gestion des clients')
    .addTag('prospects', 'Gestion des prospects')
    .addTag('quotes', 'Gestion des devis')
    .addTag('contracts', 'Gestion des contrats')
    .addTag('claims', 'Gestion des sinistres')
    .addTag('companies', 'Compagnies d\'assurance')
    .addTag('commissions', 'Commissions')
    .addTag('accounting', 'Comptabilité')
    .addTag('documents', 'Documents')
    .addTag('reports', 'Rapports')
    .addTag('dashboard', 'Tableau de bord')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on: http://0.0.0.0:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('=== FATAL STARTUP ERROR ===');
  console.error(err);
  process.exit(1);
});
