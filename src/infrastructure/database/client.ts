import "server-only";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { readConfig } from "../config";
import * as schema from "./schema";
export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const state = globalThis as typeof globalThis & {
  truckflowDatabaseCurrent?: { schema: typeof schema; database: Database };
  truckflowSqlClient?: ReturnType<typeof postgres>;
};
export function getDatabase(): Database {
  if (!state.truckflowSqlClient) {
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
    state.truckflowSqlClient = client;
  }
  // Keep the connection pool across HMR, but use the current schema/dialect.
  // A cached dialect retains column-name maps from before a schema change.
  if (state.truckflowDatabaseCurrent?.schema !== schema) {
    state.truckflowDatabaseCurrent = {
      schema,
      database: drizzle(state.truckflowSqlClient, { schema }),
    };
  }
  return state.truckflowDatabaseCurrent.database;
}
