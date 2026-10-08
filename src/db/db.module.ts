import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from './relations.js';
import { Pool } from 'pg';
import { env } from '../config/env.js';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');
export type Database = NodePgDatabase<typeof relations>;

const logger = new Logger('DbModule');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const pool = new Pool({
          connectionString: env.DATABASE_URL,
          connectionTimeoutMillis: 2000,
        });
        // Idle clients emit 'error' when the server drops them (DB restart,
        // failover). Without a listener Node treats it as unhandled and exits.
        // The pool discards the broken client and reconnects on next use.
        pool.on('error', (err) => {
          logger.error(`Idle Postgres client error: ${err.message}`);
        });
        return pool;
      },
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database =>
        drizzle({ client: pool, relations }),
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
