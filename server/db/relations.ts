import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

// Drizzle 1.0 relational queries (RQB v2): relations are declared here, in one place.
export const relations = defineRelations(schema, () => ({}));
