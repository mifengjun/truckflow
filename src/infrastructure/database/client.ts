import "server-only";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { readConfig } from "../config";
import * as schema from "./schema";
export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const state = globalThis as typeof globalThis & {
  truckflowDatabase?: Database;
};
export function getDatabase(): Database {
  if (!state.truckflowDatabase) {
    const config = readConfig();
    const client = postgres(config.databaseUrl, {
      max: 1,
      prepare: false,
      ssl: {
        ca: readFileSync(config.caPath, "utf8"),
        rejectUnauthorized: true,
      },
      connect_timeout: 10,
      idle_timeout: 20,
      connection: {
        application_name: "truckflow-runtime",
        statement_timeout: 15000,
      },
    });
    state.truckflowDatabase = drizzle(client, { schema });
  }
  return state.truckflowDatabase;
}
