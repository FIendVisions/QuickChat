// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 启用 CORS（开发环境允许任意来源，便于内网 IP 访问；生产环境白名单）
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd
      ? ([
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          process.env.FRONTEND_URL,
        ].filter(Boolean) as string[])
      : true,
    credentials: true,
  });

  // 启用验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend server is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket server is ready for connections`);
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
