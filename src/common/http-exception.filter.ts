import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
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

    // სხვა შემთხვევებში დავაბრუნოთ default HttpException response
    return response.status(status).json(
      typeof exceptionResponse === 'string'
        ? { statusCode: status, message: exceptionResponse }
        : exceptionResponse,
    );
  }
}


