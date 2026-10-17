import crypto from "crypto";
import { executeSupabaseSql } from "@/lib/db/prisma";

export const DEFAULT_HOUSEHOLD_CATEGORIES = [
  // Income Categories
  { slug: "salary", nameDe: "Gehalt & Lohn", nameTr: "Maaş & Ücret", type: "INCOME" as const, color: "#059669" },
  { slug: "kindergeld", nameDe: "Kindergeld", nameTr: "Çocuk Parası (Kindergeld)", type: "INCOME" as const, color: "#10b981" },
  { slug: "government-benefits", nameDe: "Staatliche Leistungen", nameTr: "Devlet Destekleri", type: "INCOME" as const, color: "#14b8a6" },
  { slug: "other-household-income", nameDe: "Sonstiges Haushaltseinkommen", nameTr: "Diğer Hane Gelirleri", type: "INCOME" as const, color: "#0d9488" },
  { slug: "other-income", nameDe: "Sonstige Einnahmen", nameTr: "Diğer Gelirler", type: "INCOME" as const, color: "#0f766e" },

  // Expense Categories
  { slug: "rent", nameDe: "Miete & Nebenkosten", nameTr: "Kira & Aidat", type: "EXPENSE" as const, color: "#e11d48" },
  { slug: "gas-heating", nameDe: "Gas & Heizung", nameTr: "Doğalgaz & Isınma", type: "EXPENSE" as const, color: "#ea580c" },
  { slug: "water", nameDe: "Wasser & Abwasser", nameTr: "Su", type: "EXPENSE" as const, color: "#0284c7" },
  { slug: "electricity", nameDe: "Strom", nameTr: "Elektrik", type: "EXPENSE" as const, color: "#d97706" },
  { slug: "internet", nameDe: "Internet & Festnetz", nameTr: "İnternet", type: "EXPENSE" as const, color: "#4f46e5" },
  { slug: "mobile-phone", nameDe: "Mobilfunk", nameTr: "Cep Telefonu", type: "EXPENSE" as const, color: "#7c3aed" },
  { slug: "insurance", nameDe: "Versicherungen", nameTr: "Sigortalar", type: "EXPENSE" as const, color: "#2563eb" },
  { slug: "transport", nameDe: "Mobilität & Auto", nameTr: "Ulaşım & Araç", type: "EXPENSE" as const, color: "#475569" },
  { slug: "groceries", nameDe: "Lebensmittel & Drogerie", nameTr: "Market & Gıda", type: "EXPENSE" as const, color: "#16a34a" },
  { slug: "household-purchases", nameDe: "Haushalt & Anschaffungen", nameTr: "Ev Eşyası & Alışveriş", type: "EXPENSE" as const, color: "#0891b2" },
  { slug: "subscriptions", nameDe: "Abonnements & Medien", nameTr: "Abonelikler", type: "EXPENSE" as const, color: "#9333ea" },
  { slug: "financing", nameDe: "Kredite & Finanzierungen", nameTr: "Kredi & Taksit Ödemeleri", type: "EXPENSE" as const, color: "#dc2626" },
  { slug: "other-expenses", nameDe: "Sonstige Ausgaben", nameTr: "Diğer Giderler", type: "EXPENSE" as const, color: "#64748b" },
];

export async function ensureDefaultCategoriesForUser(userId: string) {
  const safeUser = userId.replace(/'/g, "''");
  const values = DEFAULT_HOUSEHOLD_CATEGORIES.map((cat) => {
    const id = "c" + crypto.randomBytes(12).toString("hex");
    const slug = cat.slug.replace(/'/g, "''");
    const nameDe = cat.nameDe.replace(/'/g, "''");
    const nameTr = cat.nameTr.replace(/'/g, "''");
    const color = cat.color.replace(/'/g, "''");
    return `('${id}', '${slug}', '${nameDe}', '${nameTr}', '${cat.type}', '${color}', 'Wallet', TRUE, '${safeUser}', NOW())`;
  }).join(",\n");

  const sql = `
    INSERT INTO akatalife."Category" ("id", "slug", "nameDe", "nameTr", "type", "color", "icon", "isSystem", "userId", "createdAt")
    VALUES ${values}
    ON CONFLICT ("userId", "slug") DO NOTHING;
  `;

  await executeSupabaseSql(sql);
}
