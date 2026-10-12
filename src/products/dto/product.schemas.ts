import { createInsertSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { products } from '../../db/schema.js';

// Derived from the table, then tightened with API rules the DB doesn't enforce.
export const createProductSchema = createInsertSchema(products, {
  name: (s) => s.trim().min(1).max(200),
  priceCents: (s) => s.int().nonnegative(),
  stock: (s) => s.int().nonnegative(),
  // http(s) only: blocks `javascript:` / `data:` URLs a frontend might render.
  imageUrl: (s) => s.trim().pipe(z.url({ protocol: /^https?$/ }).max(2048)),
  // Lowercased so "Kitchen" and "kitchen" filter as the same category.
  category: (s) => s.trim().toLowerCase().min(1).max(100),
  brand: (s) => s.trim().min(1).max(100),
}).omit({ createdAt: true, updatedAt: true });

export const updateProductSchema = createProductSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Body must contain at least one field',
  });

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
