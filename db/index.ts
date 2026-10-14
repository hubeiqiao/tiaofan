import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. An operator must provide a reviewed identity provider and an explicit database binding before enabling persistence."
    );
  }

  return drizzle(env.DB, { schema });
}
