import { createInsertSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { products } from '../../db/schema.js';

// Derived from the table, then tightened with API rules the DB doesn't enforce.
export const createProductSchema = createInsertSchema(products, {
  name: (s) => s.trim().min(1).max(200),
  priceCents: (s) => s.int().nonnegative(),
  stock: (s) => s.int().nonnegative(),
}).omit({ createdAt: true, updatedAt: true });

export const updateProductSchema = createProductSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Body must contain at least one field',
  });

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
