import 'dotenv/config';
import { z } from 'zod';

// Only validate what the code uses today; add REDIS_URL / RABBITMQ_URL
// when the phases that need them arrive.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

export const env: Env = parsed.data;
