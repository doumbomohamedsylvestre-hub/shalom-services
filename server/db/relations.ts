import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

// Drizzle 1.0 relational queries (RQB v2): all relations are declared here.
export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id, optional: false }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id, optional: false }),
  },
}));
