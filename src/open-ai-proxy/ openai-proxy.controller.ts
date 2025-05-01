import { Controller, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import axios, { AxiosRequestConfig } from 'axios';
// import OpenAI from 'openai';
// import { FinalRequestOptions } from 'openai/core';
// import * as QueryString from 'node:querystring';
import * as https from 'node:https';
// import { https } from 'follow-redirects';
import { IncomingHttpHeaders } from 'http';

function normalizeHeaders(headers: IncomingHttpHeaders): Map<string, string> {
  const normalized: Map<string, string> = new Map();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key] = value;
      normalized.set(key, value);
    } else if (Array.isArray(value)) {
      normalized[key] = value.join(','); // или берёшь value[0], если нужен один
      normalized.set(key, value.join(','));
    } else if (typeof value === 'number') {
      // normalized[key] = value.toString();
      normalized.set(key, value);
    }
  }

  return normalized;
}

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
        Authorization: req.headers['authorization'] || '',
        Host: 'api.openai.com',
        'Content-Type': req.headers['content-type'] || '',
      },
      maxRedirects: 20,
    };

    if (req.headers['openai-beta']) {
      options.headers['openai-beta'] = req.headers['openai-beta'];
    }

    const request = https.request(options, function (response) {
      const chunks: Array<any> = [];

      // res.writeHead(response.statusCode || 500, response.headers);
      // res.flushHeaders();

      // response.pipe(res, { end: true });
      // response.pipe(process.stdout);

      response.on('data', function (chunk) {
        chunks.push(chunk);
        // console.log('data..');
        // res.write(chunk);
      });
      //
      response.on('end', function () {
        console.log('ended!');
        // res.json();
        const body = Buffer.concat(chunks);
        // console.log(body.toString());
        // console.log('headers', response.headers);
        res
          .status(response.statusCode || 500)
          .setHeaders(normalizeHeaders(response.headers))
          .json(JSON.parse(body.toString()));
      });
      //
      response.on('error', function (error) {
        console.error(error);
      });
    });

    request.on('error', (err) => {
      console.error('Proxy error:', err);
      res
        .status(500)
        .json({ error: 'Proxy request failed', details: err.message });
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
    // if (req.readable) {
    //   req.pipe(request);
    // }

    request.end();
  }
}
