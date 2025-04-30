import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenAiProxyModule } from './open-ai-proxy/open-ai-proxy.module';

@Module({
  imports: [OpenAiProxyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
