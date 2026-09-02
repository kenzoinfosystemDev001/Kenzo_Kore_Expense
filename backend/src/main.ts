import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigins = appConfig.corsOrigins;
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        corsOrigins.includes(cleanOrigin) ||
        corsOrigins.includes('*') ||
        /^https:\/\/.*\.vercel\.app$/.test(cleanOrigin);

      if (isAllowed) {
        callback(null, true);
        return;
      }

      console.warn(`[CORS] Rejected Origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'baggage',
      'sentry-trace',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = appConfig.port;
  await app.listen(port, '0.0.0.0');
  console.log(`Kenzo Kore Enterprise Backend listening on port: ${port} in ${appConfig.nodeEnv} mode`);
}

bootstrap();
