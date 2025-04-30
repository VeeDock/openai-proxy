import {
  Controller,
  Req,
  Res,
  All,
} from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';

@Controller('openai-proxy')
export class OpenAiProxyController {
  private readonly openaiBase = 'https://api.openai.com/v1';

  constructor() {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const targetUrl = `${this.openaiBase}${req.url}`;

    try {
      const headers = {
        ...req.headers,
        host: 'api.openai.com',
      };

      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        headers,
        data: req.body,
        responseType:
          req.headers.accept === 'text/event-stream' ? 'stream' : 'json',
      });

      // SSE поддержка
      if (response.headers['content-type']?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        response.data.pipe(res);
      } else {
        res.status(response.status).json(response.data);
      }
    } catch (err) {
      const status = err.response?.status || 500;
      const message = err.response?.data || err.message || 'Proxy Error';
      res.status(status).json({ error: message });
    }
  }
}
