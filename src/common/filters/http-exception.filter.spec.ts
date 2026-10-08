import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

function mockHost(originalUrl = '/test') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const req = { method: 'GET', originalUrl };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function run(exception: unknown, url?: string) {
    const { host, res } = mockHost(url);
    filter.catch(exception, host);
    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    return { status: res.status.mock.calls[0][0] as number, body };
  }

  it('keeps status and message of an HttpException', () => {
    const { status, body } = run(
      new NotFoundException('Product 1 not found'),
      '/products/1',
    );

    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Product 1 not found',
      path: '/products/1',
      timestamp: expect.any(String),
    });
    expect(body).not.toHaveProperty('details');
  });

  it('passes validation errors through as details', () => {
    const errors = [{ field: 'name', message: 'Required' }];
    const { status, body } = run(
      new BadRequestException({ message: 'Validation failed', errors }),
    );

    expect(status).toBe(400);
    expect(body).toMatchObject({
      message: 'Validation failed',
      details: errors,
    });
  });

  it("normalizes Nest's array-of-messages format", () => {
    const { body } = run(new BadRequestException(['name is required']));

    expect(body).toMatchObject({
      message: 'Validation failed',
      details: ['name is required'],
    });
  });

  it('keeps custom bodies without a message (e.g. Terminus) as details', () => {
    const healthResult = {
      status: 'error',
      error: { database: { status: 'down' } },
    };
    const { status, body } = run(new ServiceUnavailableException(healthResult));

    expect(status).toBe(503);
    expect(body.details).toEqual(healthResult);
  });

  it('hides internals of unknown errors behind a generic 500', () => {
    const { status, body } = run(new Error('password=hunter2 in SQL'));

    expect(status).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('logs 5xx with the stack trace but not 4xx', () => {
    run(new NotFoundException());
    expect(logError).not.toHaveBeenCalled();

    run(new Error('boom'));
    expect(logError).toHaveBeenCalledWith(
      'GET /test',
      expect.stringContaining('Error: boom'),
    );
  });

  it('handles thrown non-Error values', () => {
    const { status, body } = run('just a string');

    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
