import { Controller, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios, { AxiosRequestConfig } from 'axios';
import OpenAI from 'openai';
import { FinalRequestOptions } from 'openai/core';
import * as QueryString from 'node:querystring';

@Controller('v1')
export class OpenAiProxyController {
  private readonly openaiBase = 'https://api.openai.com';
  private openai: OpenAI;

  constructor(private readonly httpService: HttpService) {
    this.openai = new OpenAI({ apiKey: '' });
  }

  @All('*proxy')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const targetUrl = `${this.openaiBase}${req.url}`;

    console.log('method', req.method);
    console.log('url', targetUrl);
    console.log('body', req.body);

    try {
      const headers = {
        ...req.headers,
        host: 'api.openai.com',
      };
      if ('set-cookie' in headers) {
        delete headers['set-cookie'];
      }

      const conf: FinalRequestOptions<any> = {
        method: req.method as any,
        path: targetUrl,
        headers: {
          Host: 'api.openai.com',
          Authorization: headers.authorization,
          'OpenAI-Beta': headers['OpenAI-Beta'],
          'Content-Type': headers['Content-Type'],
        },
        // data: req.body,
        // responseType:
        //   req.headers.accept === 'text/event-stream' ? 'stream' : 'json',
      };

      const response = await this.openai.request<
        Request<any>,
        Response<Response>
      >(conf);
      console.log('response', response);

      // const response = await axios();

      // SSE поддержка
      if (response.header['content-type']?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        // @ts-ignore
        response.data.pipe(res);
      } else {
        // @ts-ignore
        res.status(response.status).json(response.data);
      }
    } catch (err) {
      const status = err.response?.status || 500;
      const message = err.response?.data || err.message || 'Proxy Error';
      res.status(status).json({ error: message });
    }
  }
}
