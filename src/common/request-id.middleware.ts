import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const headerKey = 'x-request-id';
    const existing = req.headers[headerKey] as string | undefined;
    const id = existing || randomUUID();

    req.requestId = id;
    res.setHeader(headerKey, id);

    next();
  }
}

