import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      | { message?: string | string[]; [key: string]: unknown }
      | string;

    // Validation errors ->统一 ფორმატი
    if (status === HttpStatus.BAD_REQUEST && exception instanceof BadRequestException) {
      const payload: any =
        typeof exceptionResponse === 'string' ? { message: [exceptionResponse] } : exceptionResponse;

      const messages = Array.isArray(payload.message) ? payload.message : [payload.message];

      // ვცდილობთ გამოვიყვანოთ field-ებიข้อความებიდან: \"email must be an email\"
      const fields: Record<string, string[]> = {};

      for (const msg of messages) {
        if (typeof msg !== 'string') continue;
        const [field, ...rest] = msg.split(' ');
        const fieldName = field.replace(/[^a-zA-Z0-9_]/g, '') || '_global';
        const text = rest.join(' ') || msg;

        if (!fields[fieldName]) {
          fields[fieldName] = [];
        }
        fields[fieldName].push(text);
      }

      return response.status(HttpStatus.BAD_REQUEST).json({
        code: 'VALIDATION_ERROR',
        fields,
      });
    }

    // 409 Conflict - Per documentation: {code:"CONFLICT", field:"email|username"}
    if (status === HttpStatus.CONFLICT && exception instanceof ConflictException) {
      const payload: any =
        typeof exceptionResponse === 'string' ? { message: exceptionResponse } : exceptionResponse;
      
      // Check if payload already has the correct format
      if (payload.code === 'CONFLICT' && payload.field) {
        return response.status(HttpStatus.CONFLICT).json(payload);
      }

      // Try to extract field from message or use default
      const field = payload.field || 'unknown';
      
      return response.status(HttpStatus.CONFLICT).json({
        code: 'CONFLICT',
        field: field,
        message: typeof payload.message === 'string' ? payload.message : 'Resource conflict',
      });
    }

    // 429 Rate Limit - Per documentation: {retry_after}
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const payload: any =
        typeof exceptionResponse === 'string' ? { message: exceptionResponse } : exceptionResponse;
      
      // Check if payload already has retry_after
      if (payload.retry_after !== undefined) {
        return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
          code: payload.code || 'RATE_LIMITED',
          retry_after: payload.retry_after,
        });
      }

      return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        code: 'RATE_LIMITED',
        retry_after: 60, // Default 60 seconds
      });
    }

    // 503 Service Unavailable - Per documentation: {code:"DEPENDENCY_UNAVAILABLE"}
    if (status === HttpStatus.SERVICE_UNAVAILABLE) {
      const payload: any =
        typeof exceptionResponse === 'string' ? { message: exceptionResponse } : exceptionResponse;
      
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        code: payload.code || 'DEPENDENCY_UNAVAILABLE',
        message: typeof payload.message === 'string' ? payload.message : 'Service temporarily unavailable',
      });
    }

    // სხვა შემთხვევებში დავაბრუნოთ default HttpException response
    return response.status(status).json(
      typeof exceptionResponse === 'string'
        ? { statusCode: status, message: exceptionResponse }
        : exceptionResponse,
    );
  }
}


