import { Controller, Req, Res, All, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as https from 'node:https';
import * as http from 'node:http';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { Readable } from 'node:stream';

function normalizeHeaders(
  headers: http.IncomingHttpHeaders,
): Map<string, string> {
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

function webStreamToNodeReadable(webStream: ReadableStream): Readable {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    },
  });
}

function sendMessage(res: Response, mes: string) {
  console.log('sending', new Date());
  const ok = res.write(mes, (err) => {
    console.log('write result', err, new Date());
  });
  if (!ok) {
    res.once('drain', () => {
      console.log('try again');
      sendMessage(res, mes);
    });
  }
}

@Controller('v1')
export class OpenAiProxyController {
  private readonly openaiBase = 'https://api.openai.com';
  private readonly openaiHost = 'api.openai.com';

  constructor(private readonly httpService: HttpService) {}

  @All('*proxynew')
  async proxyNew(@Req() req: Request, @Res() res: Response) {
    const path = req.url;

    console.log('method', req.method);
    console.log('url', path);
    console.log('body', req.body);

    // const isStream = req.headers.accept === 'text/event-stream';

    const options: AxiosRequestConfig = {
      method: req.method,
      url: this.openaiBase + path,
      headers: req.headers,
      // maxRedirects: 20,
      data: req.body,
      validateStatus: () => true,
    };

    if (!options.url) {
      throw new BadRequestException('No url provided');
    }

    // console.log('options:', options);

    const response = await fetch(options.url, {
      method: req.method,
      headers: Object.fromEntries(normalizeHeaders(req.headers)),
    });

    console.log('response', response);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (
        !['content-encoding', 'content-length', 'transfer-encoding'].includes(
          key.toLowerCase(),
        )
      ) {
        res.setHeader(key, value);
      }
    });
    // const rawHeaders = response.headers.toJSON;
    // console.log('raw', rawHeaders);
    // res.json(await response.json());
    if (response.body) {
      const nodeReadable = webStreamToNodeReadable(response.body);
      nodeReadable.pipe(res);
    } else {
      res.send();
    }
  }

  @All('test/*proxy')
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
      // res
      //   .status(response.statusCode || 500)
      //   .setHeaders(normalizeHeaders(response.headers));
      // res.flushHeaders();
      // response.pipe(res);
      // res.flushHeaders();

      const chunks: Array<any> = [];
      let data = '';

      const isStream =
        response.headers['content-type']?.indexOf('text/event-stream') != -1;
      // const isStream = true;

      // res.setHeader('Connection', 'keep-alive');
      // response.headers['content-type'] = 'text/event-stream';

      if (isStream) {
        res.writeHead(response.statusCode || 500, response.headers);
        res.flushHeaders();
      } else {
        res.status(response.statusCode || 500);
        res.setHeaders(normalizeHeaders(response.headers));
      }

      //
      // // response.pipe(res, { end: true });
      // // response.pipe(process.stdout);
      //
      response.on('data', function (chunk) {
        if (!isStream) {
          chunks.push(chunk);
        } else {
          // response.pipe(res);
          // console.log('chunk', chunk.toString());
          // setInterval(() => {
          //   res.write('event: ev\n');
          //   res.write('data: messaggggg\n\n');
          // }, 500);
          data += chunk.toString();
          if (/\n\n$/.test(data)) {
            // queue.push(data);
            console.log('send >> ', data);
            sendMessage(res, data);
            data = '';
          }
        }

        console.log('data..', chunk.toString());
        // res.write('data: ' + chunk.toString());
        // res.write('data: memessage\n\n');
      });
      // //
      response.on('end', function () {
        // console.log('ended!');
        if (!isStream) {
          const body = Buffer.concat(chunks);
          try {
            console.log('sending json...');
            res.json(JSON.parse(body.toString())).end(() => {
              console.log('response sent');
            });
          } catch {
            res.send(body.toString());
          }

          // res.write(body);
        } else {
          res.end();
        }
        // res.json();

        // const body = Buffer.concat(chunks);
        // // console.log(body.toString());
        // // console.log('headers', response.headers);
        // let data = body.toString();
        // try {
        //   data = JSON.parse(data);
        // } catch {
        //   /* empty */
        // }
        // // console.log('method', typeof data === 'string' ? 'send' : 'json');
        // res
        //   .status(response.statusCode || 500)
        //   .setHeaders(normalizeHeaders(response.headers))
        //   [typeof data === 'string' ? 'send' : 'json'](data);
      });
      //
      response.on('error', function (error) {
        console.error(error);
        res.end();
      });
    });

    request.on('error', (err) => {
      console.error('Proxy error:', err);
      res
        .status(500)
        .json({ error: 'Proxy request failed', details: err.message });
    });

    // request.on('close', () => {
    //   console.log('request closed');
    // });

    if (req.body) {
      request.write(JSON.stringify(req.body));
    }
    request.end();
  }
}
