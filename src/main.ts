import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DaraLearn API')
    .setDescription('DaraLearn backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    customSiteTitle: 'DaraLearn API Documentation',
    customCss: `
      :root {
        --daralearn-purple: #6d28d9;
        --daralearn-dark: #171225;
        --daralearn-muted: #6b6478;
      }

      body {
        background: #f8f7fc;
      }

      .swagger-ui .topbar {
        background: linear-gradient(135deg, var(--daralearn-dark), var(--daralearn-purple));
        padding: 12px 0;
      }

      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }

      .swagger-ui .topbar-wrapper img {
        display: none;
      }

      .swagger-ui .topbar-wrapper::after {
        color: white;
        content: 'DaraLearn API';
        font-size: 20px;
        font-weight: 700;
      }

      .swagger-ui .info {
        margin: 32px 0;
      }

      .swagger-ui .info .title {
        color: var(--daralearn-dark);
        font-size: 34px;
      }

      .swagger-ui .info p,
      .swagger-ui .opblock-description-wrapper p {
        color: var(--daralearn-muted);
      }

      .swagger-ui section.models {
        display: none;
      }

      .swagger-ui .opblock {
        border-radius: 12px;
        box-shadow: 0 4px 18px rgba(23, 18, 37, 0.06);
        overflow: hidden;
      }

      .swagger-ui .btn.authorize {
        border-color: var(--daralearn-purple);
        color: var(--daralearn-purple);
      }

      .swagger-ui .btn.authorize svg {
        fill: var(--daralearn-purple);
      }
    `,
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
