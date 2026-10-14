/**
 * Development seed: an admin account plus sample products.
 * Run with `npm run db:seed`. Safe to run repeatedly.
 */
import * as argon2 from 'argon2';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import { env } from '../config/env.js';
import { products, users, type NewProduct } from './schema.js';

// Seed-only settings: validated here, not in env.ts, because the app itself
// never needs them.
const seedEnv = z
  .object({
    SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
    SEED_ADMIN_PASSWORD: z.string().min(8),
  })
  .parse(process.env);

const sampleProducts: NewProduct[] = [
  {
    name: 'Ceramic Mug',
    priceCents: 1500,
    stock: 40,
    category: 'kitchen',
    brand: 'Acme',
  },
  {
    name: 'Pour-over Kettle',
    priceCents: 4900,
    stock: 12,
    category: 'kitchen',
    brand: 'Brewline',
  },
  {
    name: 'Chef Knife',
    priceCents: 8900,
    stock: 8,
    category: 'kitchen',
    brand: 'Edgecraft',
  },
  {
    name: 'Cotton T-Shirt',
    priceCents: 1900,
    stock: 100,
    category: 'apparel',
    brand: 'Basics Co',
  },
  {
    name: 'Rain Jacket',
    priceCents: 12900,
    stock: 15,
    category: 'apparel',
    brand: 'Northpeak',
  },
  {
    name: 'Wool Socks',
    priceCents: 1200,
    stock: 0,
    category: 'apparel',
    brand: 'Northpeak',
  },
  {
    name: 'Wireless Mouse',
    priceCents: 2900,
    stock: 30,
    category: 'electronics',
    brand: 'Clicky',
  },
  {
    name: 'Mechanical Keyboard',
    priceCents: 9900,
    stock: 10,
    category: 'electronics',
    brand: 'Clicky',
  },
  {
    name: 'USB-C Cable',
    priceCents: 900,
    stock: 200,
    category: 'electronics',
    brand: 'Linkit',
  },
  {
    name: 'Desk Lamp',
    priceCents: 3900,
    stock: 1,
    category: 'home',
    brand: 'Lumo',
  },
  {
    name: 'Throw Blanket',
    priceCents: 5900,
    stock: 20,
    category: 'home',
    brand: 'Softly',
  },
  {
    name: 'Notebook',
    priceCents: 700,
    stock: 75,
    category: 'stationery',
    brand: 'Paperworks',
  },
];

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database');
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Upsert: creates the admin, or resets an existing account to admin with
    // the password from .env. `role` is set explicitly because the API never
    // lets anyone choose it.
    const passwordHash = await argon2.hash(seedEnv.SEED_ADMIN_PASSWORD);
    const [admin] = await db
      .insert(users)
      .values({ email: seedEnv.SEED_ADMIN_EMAIL, passwordHash, role: 'admin' })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash, role: 'admin' },
      })
      .returning({ id: users.id, email: users.email });
    console.log(`admin:    ${admin.email} (id ${admin.id})`);

    // Products have no natural unique key, so only seed an empty table.
    const [{ total }] = await db.select({ total: count() }).from(products);
    if (total === 0) {
      await db.insert(products).values(sampleProducts);
      console.log(`products: inserted ${sampleProducts.length}`);
    } else {
      console.log(`products: skipped (table already has ${total})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
