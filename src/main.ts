import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('port', process.env.PORT);
  app.use(json({ limit: '50mb' }));
  const server = app.getHttpServer();

  // The timeout value for sockets
  server.setTimeout(2 * 60 * 1000);
  // The number of milliseconds of inactivity a server needs to wait for additional incoming data
  server.keepAliveTimeout = 30000;
  // Limit the amount of time the parser will wait to receive the complete HTTP headers
  server.headersTimeout = 31000;
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
