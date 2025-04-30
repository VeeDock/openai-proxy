import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenAiProxyModule } from './open-ai-proxy/open-ai-proxy.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    OpenAiProxyModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
