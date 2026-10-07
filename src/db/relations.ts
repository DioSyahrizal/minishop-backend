import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.js';

// No relations yet; add them here when users/orders arrive in Phase 1.
export const relations = defineRelations(schema);
