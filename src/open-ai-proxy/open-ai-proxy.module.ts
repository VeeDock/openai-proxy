import { Module } from '@nestjs/common';
import { OpenAiProxyController } from './ openai-proxy.controller';

@Module({
  controllers: [OpenAiProxyController],
})
export class OpenAiProxyModule {}
