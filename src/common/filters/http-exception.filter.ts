import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, details } = toMessage(exception);

    // 4xx are the client's fault; 5xx are ours and need the stack trace.
    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      ...(details !== undefined && { details }),
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}

function toMessage(exception: unknown): { message: string; details?: unknown } {
  // Unknown errors may contain internals (SQL, secrets): never send them out.
  if (!(exception instanceof HttpException)) {
    return { message: 'Internal server error' };
  }

  const body = exception.getResponse();
  if (typeof body === 'string') return { message: body };

  const { message, errors } = body as { message?: unknown; errors?: unknown };
  if (Array.isArray(message))
    return { message: 'Validation failed', details: message };
  if (typeof message === 'string') return { message, details: errors };

  // Custom bodies without `message` (e.g. Terminus health results): keep them.
  return { message: exception.message, details: body };
}
