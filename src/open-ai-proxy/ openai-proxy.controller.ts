import { Controller, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import axios, { AxiosRequestConfig } from 'axios';
// import OpenAI from 'openai';
// import { FinalRequestOptions } from 'openai/core';
// import * as QueryString from 'node:querystring';
// import * as https from 'node:https';
import { http } from 'follow-redirects';

@Controller('v1')
export class OpenAiProxyController {
  // private readonly openaiBase = 'https://api.openai.com';
  private readonly openaiHost = 'api.openai.com';

  constructor() {}

  @All('*proxy')
  proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.url;

    console.log('method', req.method);
    console.log('url', path);
    console.log('body', req.body);

    // const isStream = req.headers.accept === 'text/event-stream';

    const options = {
      method: req.method,
      hostname: this.openaiHost,
      path,
      headers: {
        Authorization: req.headers['authorization'],
        'OpenAI-Beta': req.headers['openai-beta'],
        Host: 'api.openai.com',
        'Content-Type': req.headers['content-type'],
      },
      maxRedirects: 20,
    };

    const request = http.request(options, function (response) {
      const chunks: Array<any> = [];

      response.on('data', function (chunk) {
        chunks.push(chunk);
      });

      response.on('end', function () {
        const body = Buffer.concat(chunks);
        // console.log(body.toString());
        res.status(response.statusCode).json(JSON.parse(body.toString()));
      });

      response.on('error', function (error) {
        console.error(error);
      });
    });

    // let postData = JSON.stringify({
    //   messages: [
    //     {
    //       role: 'assistant',
    //       content: 'hello my friend2!',
    //     },
    //   ],
    //   metadata: {
    //     assistant_id: 'asst_AEsyidHxgJgV0dSkLPa1hgWe',
    //   },
    // });

    if (req.body) {
      request.write(JSON.stringify(req.body));
    }

    request.end();
  }
}
