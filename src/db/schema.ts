import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const products = pgTable('products', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  // Money as integer cents: floats can't represent 0.10 exactly.
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  imageUrl: text('image_url'),
  category: text('category'),
  brand: text('brand'),
  ...timestamps,
});

export const userRole = pgEnum('user_role', ['admin', 'customer']);

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('customer'),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
