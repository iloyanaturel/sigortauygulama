import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_BRANCHES, DEFAULT_PARTAJS, DEFAULT_PRODUCERS } from "@/lib/catalog";
import { uid } from "@/lib/id";
import { foldTurkish } from "@/lib/text";
import type { AppSettings, BranchItem, CatalogItem, Policy } from "@/lib/types";

export class SigortaDB extends Dexie {
  policies!: EntityTable<Policy, "id">;
  partajlar!: EntityTable<CatalogItem, "id">;
  branches!: EntityTable<BranchItem, "id">;
  producers!: EntityTable<CatalogItem, "id">;
  settings!: EntityTable<AppSettings & { id: string }, "id">;

  constructor() {
    super("sigorta-takip-db");
    this.version(1).stores({
      policies:
        "id, issueDate, startDate, endDate, customerName, partaj, branch, policyNo, status, producer, nationalId, plate",
      partajlar: "id, name, active",
      branches: "id, name, profile, active",
      producers: "id, name, active",
      settings: "id",
    });
  }
}

let _db: SigortaDB | null = null;

export function getDb(): SigortaDB {
  if (!_db) _db = new SigortaDB();
  return _db;
}

async function seedIfEmpty() {
  const db = getDb();
  const count = await db.partajlar.count();
  if (count > 0) return;
  await db.partajlar.bulkAdd(DEFAULT_PARTAJS.map((item) => ({ ...item, id: uid() })));
  await db.branches.bulkAdd(DEFAULT_BRANCHES.map((item) => ({ ...item, id: uid() })));
  await db.producers.bulkAdd(DEFAULT_PRODUCERS.map((item) => ({ ...item, id: uid() })));
  await db.settings.put({
    id: "app",
    agencyName: "Sigorta Takip",
  });
}

let ready: Promise<void> | null = null;
export function ensureSeeded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!ready) ready = seedIfEmpty();
  return ready;
}

export async function upsertCatalogName(
  table: "partajlar" | "producers",
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = getDb();
  const all = await db[table].toArray();
  const existing = all.find((item) => foldTurkish(item.name) === foldTurkish(trimmed));
  if (existing) {
    await db[table].update(existing.id, { usageCount: existing.usageCount + 1, active: true });
    return;
  }
  await db[table].add({
    id: uid(),
    name: trimmed,
    usageCount: 1,
    active: true,
  });
}

export async function upsertBranch(name: string, profile: BranchItem["profile"], rate: number) {
  const db = getDb();
  const all = await db.branches.toArray();
  const existing = all.find((item) => foldTurkish(item.name) === foldTurkish(name));
  if (existing) {
    await db.branches.update(existing.id, { usageCount: existing.usageCount + 1, active: true });
    return;
  }
  await db.branches.add({
    id: uid(),
    name,
    profile,
    defaultCommissionRate: rate,
    usageCount: 1,
    active: true,
  });
}
