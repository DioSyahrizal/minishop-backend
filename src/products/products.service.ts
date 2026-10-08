import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { type Database, DB } from '../db/db.module.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type {
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.schemas.js';

@Injectable()
export class ProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(dto: CreateProductDto) {
    const [product] = await this.db.insert(products).values(dto).returning();
    return product;
  }

  findAll() {
    return this.db.select().from(products);
  }

  async findOne(id: number) {
    const product = await this.db.query.products.findFirst({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const [updated] = await this.db
      .update(products)
      .set(updateProductDto)
      .where(eq(products.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`Product ${id} not found`);
    return updated;
  }

  async remove(id: number) {
    const [deleted] = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!deleted) throw new NotFoundException(`Product ${id} not found`);
  }
}
