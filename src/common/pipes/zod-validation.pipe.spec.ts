import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({ name: z.string().min(1), qty: z.number().int() }),
  );

  it('returns parsed data and strips unknown keys', () => {
    expect(pipe.transform({ name: 'a', qty: 1, extra: true })).toEqual({
      name: 'a',
      qty: 1,
    });
  });

  it('throws BadRequestException listing each invalid field', () => {
    try {
      pipe.transform({ name: '', qty: 1.5 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        errors: { field: string }[];
      };
      expect(body.errors.map((e) => e.field)).toEqual(['name', 'qty']);
    }
  });
});
