import crypto from "crypto";

/**
 * Supabase PostgreSQL Client for Akata Life (Schema: akatalife).
 * Uses Supabase's HTTPS pg-meta SQL endpoint (/pg/query) so the container
 * works across any Coolify network topology without requiring TCP 5432 exposure.
 */

const SCHEMA = "akatalife";

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "expiresAt",
  "lastUsedAt",
  "startDate",
  "cancellationDeadline",
  "renewalDate",
  "archivedAt",
  "issueDate",
  "dueDate",
  "transactionDate",
  "invoiceDate",
  "paidAt",
  "nextRunDate",
  "dueAt",
  "completedAt",
  "moveInDate",
  "purchaseDate",
  "warrantyUntil",
  "performedAt",
  "nextDueAt",
  "readingDate",
  "lastSyncAt",
]);

function generateId(): string {
  return "c" + crypto.randomBytes(12).toString("hex");
}

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return "NULL";
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'::timestamptz`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "ARRAY[]::text[]";
    const items = val.map((item) => `'${String(item).replace(/'/g, "''")}'`);
    return `ARRAY[${items.join(", ")}]::text[]`;
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function hydrateRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined && DATE_FIELDS.has(k)) {
      out[k] = v instanceof Date ? v : new Date(String(v));
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export async function executeSupabaseSql<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const baseUrl = (
    process.env.SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://db.memman.de"
  ).replace(/\/+$/, "");

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_SUPABASESERVICE_KEY ||
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTExODc2MCwiZXhwIjo0OTIwNzkyMzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.SvsiYRbGfXWdCcJc0yVQlfWae7s4SCNjzHo7VAI18XU";

  const dashUser = process.env.SERVICE_USER_ADMIN || "70TvScn19qqgId1M";
  const dashPass =
    process.env.SERVICE_PASSWORD_ADMIN || "feODrK1VHGDL1OPklUGqqlWJDDOM2SZB";
  const basicAuth = Buffer.from(`${dashUser}:${dashPass}`).toString("base64");

  const res = await fetch(`${baseUrl}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ query: sql }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase SQL error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((row) => hydrateRow<T>(row));
}

function buildWhereClause(where?: Record<string, unknown>): string {
  if (!where) return "TRUE";
  const clauses: string[] = [];

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    if (key === "OR" && Array.isArray(val)) {
      const orParts = val
        .map((sub) => `(${buildWhereClause(sub as Record<string, unknown>)})`)
        .filter(Boolean);
      if (orParts.length > 0) {
        clauses.push(`(${orParts.join(" OR ")})`);
      }
      continue;
    }

    if (val === null) {
      clauses.push(`"${key}" IS NULL`);
    } else if (
      typeof val === "object" &&
      !(val instanceof Date) &&
      !Array.isArray(val)
    ) {
      const cond = val as Record<string, unknown>;
      if ("contains" in cond) {
        const needle = String(cond.contains).replace(/'/g, "''");
        clauses.push(`"${key}" ILIKE '%${needle}%'`);
      }
      if ("in" in cond && Array.isArray(cond.in)) {
        const list = cond.in.map((item) => sqlLiteral(item)).join(", ");
        clauses.push(`"${key}" IN (${list})`);
      }
      if ("gte" in cond && cond.gte !== undefined) {
        clauses.push(`"${key}" >= ${sqlLiteral(cond.gte)}`);
      }
      if ("lte" in cond && cond.lte !== undefined) {
        clauses.push(`"${key}" <= ${sqlLiteral(cond.lte)}`);
      }
      if ("not" in cond) {
        if (cond.not === null) {
          clauses.push(`"${key}" IS NOT NULL`);
        } else {
          clauses.push(`"${key}" <> ${sqlLiteral(cond.not)}`);
        }
      }
    } else {
      clauses.push(`"${key}" = ${sqlLiteral(val)}`);
    }
  }

  return clauses.length > 0 ? clauses.join(" AND ") : "TRUE";
}

function buildOrderBy(orderBy?: unknown): string {
  if (!orderBy) return "";
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const item of list) {
    if (typeof item === "object" && item !== null) {
      for (const [k, dir] of Object.entries(item)) {
        const direction =
          String(dir).toUpperCase() === "DESC" ? "DESC NULLS LAST" : "ASC NULLS LAST";
        parts.push(`"${k}" ${direction}`);
      }
    }
  }
  return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : "";
}

async function insertRow<T = any>(
  table: string,
  data: Record<string, unknown>,
  options?: { withId?: boolean; withCreatedAt?: boolean; withUpdatedAt?: boolean }
): Promise<T> {
  const row: Record<string, unknown> = { ...data };
  if (options?.withId !== false && !row.id) {
    row.id = generateId();
  }
  const now = new Date();
  if (options?.withCreatedAt !== false && !("createdAt" in row)) {
    row.createdAt = now;
  }
  if (options?.withUpdatedAt && !("updatedAt" in row)) {
    row.updatedAt = now;
  }

  const cols: string[] = [];
  const vals: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    cols.push(`"${k}"`);
    vals.push(sqlLiteral(v));
  }

  const sql = `INSERT INTO ${SCHEMA}."${table}" (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING *;`;
  const rows = await executeSupabaseSql<T>(sql);
  return rows[0] as T;
}

async function updateRows<T = any>(
  table: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  withUpdatedAt = false
): Promise<T> {
  const updates: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    updates.push(`"${k}" = ${sqlLiteral(v)}`);
  }
  if (withUpdatedAt) {
    updates.push(`"updatedAt" = ${sqlLiteral(new Date())}`);
  }
  const whereSql = buildWhereClause(where);
  const sql = `UPDATE ${SCHEMA}."${table}" SET ${updates.join(", ")} WHERE ${whereSql} RETURNING *;`;
  const rows = await executeSupabaseSql<T>(sql);
  return rows[0] as T;
}

export const prisma = {
  user: {
    async count(args?: { where?: Record<string, unknown> }): Promise<number> {
      const whereSql = buildWhereClause(args?.where);
      const rows = await executeSupabaseSql<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM ${SCHEMA}."User" WHERE ${whereSql};`
      );
      return Number(rows[0]?.count ?? 0);
    },
    async findFirst(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
    }): Promise<any | null> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."User" WHERE ${whereSql} ${orderSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async findUnique(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."User" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("User", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
  },

  session: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Session", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
    async findUnique(args: {
      where: Record<string, unknown>;
      include?: { user?: boolean };
    }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Session" WHERE ${whereSql} LIMIT 1;`
      );
      const session = rows[0];
      if (!session) return null;
      if (args.include?.user) {
        const users = await executeSupabaseSql<any>(
          `SELECT * FROM ${SCHEMA}."User" WHERE "id" = ${sqlLiteral(session.userId)} LIMIT 1;`
        );
        session.user = users[0] ?? null;
      }
      return session;
    },
    async delete(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Session" WHERE ${whereSql};`
      );
    },
    async deleteMany(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Session" WHERE ${whereSql};`
      );
    },
  },

  agentApiKey: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("AgentApiKey", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
    async findUnique(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AgentApiKey" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("AgentApiKey", args.where, args.data, false);
    },
  },

  auditEvent: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("AuditEvent", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AuditEvent" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
    },
  },

  category: {
    async upsert(args: {
      where: { userId_slug: { userId: string; slug: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }): Promise<any> {
      const { userId, slug } = args.where.userId_slug;
      const existing = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Category" WHERE "userId" = ${sqlLiteral(userId)} AND "slug" = ${sqlLiteral(slug)} LIMIT 1;`
      );
      if (existing[0]) return existing[0];
      return insertRow("Category", args.create, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Category" WHERE ${whereSql} ${orderSql};`
      );
    },
    async findFirst(args?: { where?: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args?.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Category" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
  },

  contract: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      include?: { documents?: unknown };
      orderBy?: unknown;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const contracts = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Contract" WHERE ${whereSql} ${orderSql};`
      );
      if (args?.include?.documents && contracts.length > 0) {
        const docs = await executeSupabaseSql<any>(
          `SELECT "id", "title", "originalFilename", "category", "contractId" FROM ${SCHEMA}."Document" WHERE "archivedAt" IS NULL;`
        );
        for (const c of contracts) {
          c.documents = docs.filter((d) => d.contractId === c.id);
        }
      }
      return contracts;
    },
    async findFirst(args: {
      where: Record<string, unknown>;
      include?: { documents?: boolean; invoices?: unknown; reminders?: unknown };
    }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Contract" WHERE ${whereSql} LIMIT 1;`
      );
      const contract = rows[0];
      if (!contract) return null;
      if (args.include) {
        const [documents, invoices, reminders] = await Promise.all([
          args.include.documents
            ? executeSupabaseSql(
                `SELECT * FROM ${SCHEMA}."Document" WHERE "contractId" = ${sqlLiteral(contract.id)};`
              )
            : Promise.resolve([]),
          args.include.invoices
            ? executeSupabaseSql(
                `SELECT * FROM ${SCHEMA}."Invoice" WHERE "contractId" = ${sqlLiteral(contract.id)} ORDER BY "dueDate" DESC;`
              )
            : Promise.resolve([]),
          args.include.reminders
            ? executeSupabaseSql(
                `SELECT * FROM ${SCHEMA}."Reminder" WHERE "contractId" = ${sqlLiteral(contract.id)} ORDER BY "dueAt" ASC;`
              )
            : Promise.resolve([]),
        ]);
        contract.documents = documents;
        contract.invoices = invoices;
        contract.reminders = reminders;
      }
      return contract;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Contract", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("Contract", args.where, args.data, true);
    },
    async delete(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Contract" WHERE ${whereSql};`
      );
    },
  },

  document: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      include?: { contract?: unknown };
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      const docs = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Document" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
      if (args?.include?.contract && docs.length > 0) {
        const contracts = await executeSupabaseSql<any>(
          `SELECT "id", "provider", "title" FROM ${SCHEMA}."Contract";`
        );
        const map = new Map(contracts.map((c) => [c.id, c]));
        for (const d of docs) {
          d.contract = d.contractId ? (map.get(d.contractId) ?? null) : null;
        }
      }
      return docs;
    },
    async findFirst(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Document" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Document", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("Document", args.where, args.data, true);
    },
    async delete(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Document" WHERE ${whereSql};`
      );
    },
  },

  transaction: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      include?: { category?: boolean; contract?: unknown };
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      const txs = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Transaction" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
      if (args?.include?.category && txs.length > 0) {
        const cats = await executeSupabaseSql<any>(
          `SELECT * FROM ${SCHEMA}."Category";`
        );
        const catMap = new Map(cats.map((c) => [c.id, c]));
        for (const t of txs) {
          t.category = catMap.get(t.categoryId) ?? {
            nameDe: "Allgemein",
            nameTr: "Genel",
          };
        }
      }
      return txs;
    },
    async create(args: {
      data: Record<string, unknown>;
      include?: { category?: boolean };
    }): Promise<any> {
      const created = await insertRow("Transaction", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
      if (args.include?.category && created.categoryId) {
        const cats = await executeSupabaseSql<any>(
          `SELECT * FROM ${SCHEMA}."Category" WHERE "id" = ${sqlLiteral(created.categoryId)} LIMIT 1;`
        );
        created.category = cats[0] ?? null;
      }
      return created;
    },
  },

  budget: {
    async findMany(args?: { where?: Record<string, unknown> }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Budget" WHERE ${whereSql};`
      );
    },
  },

  invoice: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      include?: { contract?: unknown; document?: unknown };
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Invoice" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
    },
    async findFirst(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Invoice" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Invoice", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("Invoice", args.where, args.data, true);
    },
    async delete(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Invoice" WHERE ${whereSql};`
      );
    },
  },

  reminder: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Reminder" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
    },
    async findFirst(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."Reminder" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Reminder", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async upsert(args: {
      where: { dedupeKey: string };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }): Promise<any> {
      const existing = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Reminder" WHERE "dedupeKey" = ${sqlLiteral(args.where.dedupeKey)} LIMIT 1;`
      );
      if (existing[0]) {
        return updateRows(
          "Reminder",
          { id: existing[0].id },
          args.update,
          true
        );
      }
      return insertRow("Reminder", args.create, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("Reminder", args.where, args.data, true);
    },
    async updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<void> {
      await updateRows("Reminder", args.where, args.data, true);
    },
    async delete(args: { where: Record<string, unknown> }): Promise<void> {
      const whereSql = buildWhereClause(args.where);
      await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."Reminder" WHERE ${whereSql};`
      );
    },
  },

  property: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      include?: unknown;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const properties = await executeSupabaseSql<any>(
        `SELECT * FROM ${SCHEMA}."Property" WHERE ${whereSql} ORDER BY "createdAt" ASC;`
      );
      for (const prop of properties) {
        const [rooms, assets, meterReadings] = await Promise.all([
          executeSupabaseSql<any>(
            `SELECT * FROM ${SCHEMA}."Room" WHERE "propertyId" = ${sqlLiteral(prop.id)};`
          ),
          executeSupabaseSql<any>(
            `SELECT * FROM ${SCHEMA}."HouseholdAsset" WHERE "propertyId" = ${sqlLiteral(prop.id)};`
          ),
          executeSupabaseSql<any>(
            `SELECT * FROM ${SCHEMA}."MeterReading" WHERE "propertyId" = ${sqlLiteral(prop.id)} ORDER BY "readingDate" DESC LIMIT 30;`
          ),
        ]);
        for (const a of assets) {
          a.room = rooms.find((r) => r.id === a.roomId) ?? null;
          a.maintenanceRecords = [];
          a.documents = [];
        }
        prop.rooms = rooms;
        prop.assets = assets;
        prop.meterReadings = meterReadings;
      }
      return properties;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Property", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
  },

  room: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("Room", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
  },

  householdAsset: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("HouseholdAsset", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
  },

  meterReading: {
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("MeterReading", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: false,
      });
    },
  },

  homeAssistantConfig: {
    async findUnique(args: { where: { id: string } }): Promise<any | null> {
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."HomeAssistantConfig" WHERE "id" = ${sqlLiteral(args.where.id)} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async upsert(args: {
      where: { id: string };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }): Promise<any> {
      const existing = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."HomeAssistantConfig" WHERE "id" = ${sqlLiteral(args.where.id)} LIMIT 1;`
      );
      if (existing[0]) {
        return updateRows("HomeAssistantConfig", args.where, args.update, true);
      }
      return insertRow("HomeAssistantConfig", args.create, {
        withId: false,
        withCreatedAt: false,
        withUpdatedAt: true,
      });
    },
  },

  agentAdvice: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AgentAdvice" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
    },
    async findFirst(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AgentAdvice" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("AgentAdvice", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("AgentAdvice", args.where, args.data, true);
    },
    async delete(args: { where: { id: string } }): Promise<any> {
      const rows = await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."AgentAdvice" WHERE "id" = ${sqlLiteral(args.where.id)} RETURNING *;`
      );
      return rows[0] ?? null;
    },
  },

  agentReport: {
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
    }): Promise<any[]> {
      const whereSql = buildWhereClause(args?.where);
      const orderSql = buildOrderBy(args?.orderBy);
      const limitSql = args?.take ? `LIMIT ${Number(args.take)}` : "";
      return executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AgentReport" WHERE ${whereSql} ${orderSql} ${limitSql};`
      );
    },
    async findFirst(args: { where: Record<string, unknown> }): Promise<any | null> {
      const whereSql = buildWhereClause(args.where);
      const rows = await executeSupabaseSql(
        `SELECT * FROM ${SCHEMA}."AgentReport" WHERE ${whereSql} LIMIT 1;`
      );
      return rows[0] ?? null;
    },
    async create(args: { data: Record<string, unknown> }): Promise<any> {
      return insertRow("AgentReport", args.data, {
        withId: true,
        withCreatedAt: true,
        withUpdatedAt: true,
      });
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<any> {
      return updateRows("AgentReport", args.where, args.data, true);
    },
    async delete(args: { where: { id: string } }): Promise<any> {
      const rows = await executeSupabaseSql(
        `DELETE FROM ${SCHEMA}."AgentReport" WHERE "id" = ${sqlLiteral(args.where.id)} RETURNING *;`
      );
      return rows[0] ?? null;
    },
  },
};
