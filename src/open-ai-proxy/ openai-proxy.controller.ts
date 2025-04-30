import { Controller, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';

@Controller('v1')
export class OpenAiProxyController {
  private readonly openaiBase = 'https://api.openai.com';

  constructor() {}

  @All('*proxy')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const targetUrl = `${this.openaiBase}${req.url}`;

    console.log('method', req.method)
    console.log('url', targetUrl);
    console.log('body', req.body);

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

      // console.log('response', response)

      // SSE поддержка
      if (response.headers['content-type']?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        console.log('stream');
        response.data.pipe(res);
      } else {
        console.log('send response');
        res.status(response.status).json(response.data);
      }
    } catch (err) {
      const status = err.response?.status || 500;
      const message = err.response?.data || err.message || 'Proxy Error';
      res.status(status).json({ error: message });
    }
  }
}
