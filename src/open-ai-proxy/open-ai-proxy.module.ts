import { Module } from '@nestjs/common';
import { OpenAiProxyController } from './ openai-proxy.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [OpenAiProxyController],
})
export class OpenAiProxyModule {}
