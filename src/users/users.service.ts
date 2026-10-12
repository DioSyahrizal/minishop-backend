import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq, getColumns } from 'drizzle-orm';
import { type Database, DB } from '../db/db.module.js';
import { isUniqueViolation } from '../db/errors.js';
import { users } from '../db/schema.js';

// Every column except the hash, so it never leaves this service by accident.
const { passwordHash: _passwordHash, ...publicUserColumns } = getColumns(users);

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Takes only email + hash: `role` stays at its DB default ('customer'),
  // so a sign-up request can never make itself admin.
  async create(data: { email: string; passwordHash: string }) {
    try {
      // No "does it exist?" check first: two concurrent sign-ups could both
      // pass it. The unique constraint is the only race-free check.
      const [user] = await this.db
        .insert(users)
        .values(data)
        .returning(publicUserColumns);
      return user;
    } catch (err) {
      if (isUniqueViolation(err, 'users_email_key')) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  async findById(id: number) {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  // Includes passwordHash: only for AuthService to verify a login.
  async findByEmail(email: string) {
    return this.db.query.users.findFirst({ where: { email } });
  }
}
