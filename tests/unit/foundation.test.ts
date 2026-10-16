import { describe, expect, it } from "vitest";
import {
  calculateBudgetSummary,
  calculateMonthlyEquivalentCents,
  formatEurCents,
  parseEurToCents,
  sumCents,
} from "@/lib/finance/money";
import {
  calculateContractDeadlines,
  formatDateDe,
  resolveInvoiceStatus,
} from "@/lib/format/date";
import {
  constantTimeEqualStrings,
  decryptSecret,
  encryptSecret,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/crypto";
import {
  detectMagicByteMime,
  resolveSafeStoragePath,
  validateAndPrepareDocumentUpload,
} from "@/lib/storage/documents";

describe("Milestone 1 Foundation — Financial Integrity (EUR Cents)", () => {
  it("formats integer cents into German EUR notation (1.234,56 €)", () => {
    expect(formatEurCents(0, "de")).toBe("0,00 €");
    expect(formatEurCents(4990, "de")).toBe("49,90 €");
    expect(formatEurCents(123456, "de")).toBe("1.234,56 €");
    expect(formatEurCents(-2505, "de")).toBe("-25,05 €");
  });

  it("parses German comma and thousand-separator strings into exact integer cents", () => {
    expect(parseEurToCents("49,90")).toBe(4990);
    expect(parseEurToCents("1.234,56 €")).toBe(123456);
    expect(parseEurToCents("19.99")).toBe(1999);
    expect(parseEurToCents("100")).toBe(10000);
    expect(parseEurToCents("-12,05")).toBe(-1205);
  });

  it("computes exact cent sums and budget summaries without floating-point drift", () => {
    // Classic IEEE-754 trap: 0.1 + 0.2 = 0.30000000000000004
    expect(sumCents([10, 20])).toBe(30);
    const summary = calculateBudgetSummary({
      budgetLimitCents: 300000, // 3.000,00 €
      recordedExpenseCents: 120050,
      confirmedExpenseCents: 79950,
      plannedExpenseCents: 25000,
    });
    expect(summary.actualSpentCents).toBe(200000);
    expect(summary.remainingCents).toBe(100000);
    expect(summary.projectedRemainingCents).toBe(75000);
    expect(summary.isOverBudget).toBe(false);
    expect(calculateMonthlyEquivalentCents(12000, "ANNUAL")).toBe(1000);
  });
});

describe("Milestone 1 Foundation — Dates, Contract Deadlines & Invoice Status", () => {
  it("formats dates in DD.MM.YYYY for Europe/Berlin", () => {
    const d = new Date("2026-10-16T12:00:00Z");
    expect(formatDateDe(d)).toBe("16.10.2026");
  });

  it("calculates contract renewal date and cancellation deadline accurately", () => {
    const startDate = new Date("2026-01-15T00:00:00.000Z");
    const { renewalDate, cancellationDeadline } = calculateContractDeadlines({
      startDate,
      minimumTermMonths: 12,
      noticePeriodDays: 30,
    });
    expect(renewalDate?.toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(cancellationDeadline?.toISOString().slice(0, 10)).toBe("2026-12-16");
  });

  it("marks unpaid invoices past due date as OVERDUE and never auto-marks PAID", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const pastDue = new Date("2026-10-01T00:00:00Z");
    const futureDue = new Date("2026-11-01T00:00:00Z");

    expect(
      resolveInvoiceStatus({
        status: "UNPAID",
        dueDate: pastDue,
        referenceNow: now,
      })
    ).toBe("OVERDUE");

    expect(
      resolveInvoiceStatus({
        status: "PLANNED",
        dueDate: futureDue,
        referenceNow: now,
      })
    ).toBe("PLANNED");
  });
});

describe("Milestone 1 Foundation — Authentication, Encryption & Document Security", () => {
  it("hashes and verifies passwords and encrypts secrets with AES-256-GCM", () => {
    const hash = hashPassword("CorrectHorseBatteryStaple!2026");
    expect(verifyPassword("CorrectHorseBatteryStaple!2026", hash)).toBe(true);
    expect(verifyPassword("WrongPassword!2026", hash)).toBe(false);

    const encrypted = encryptSecret("totp-secret-123", "test-master-key-64");
    expect(encrypted).not.toContain("totp-secret-123");
    expect(decryptSecret(encrypted, "test-master-key-64")).toBe(
      "totp-secret-123"
    );
    expect(constantTimeEqualStrings("hermes-key-123456", "hermes-key-123456")).toBe(true);
    expect(constantTimeEqualStrings("hermes-key-123456", "hermes-key-999999")).toBe(false);
  });

  it("validates PDF magic bytes and rejects disguised HTML/script files and path traversal", () => {
    const validPdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n", "utf8");
    expect(detectMagicByteMime(validPdf)).toBe("application/pdf");

    const prepared = validateAndPrepareDocumentUpload({
      buffer: validPdf,
      originalFilename: "../secret/Stromvertrag 2026.pdf",
      declaredMimeType: "application/pdf",
    });
    expect(prepared.verifiedMimeType).toBe("application/pdf");
    expect(prepared.storageKey).toMatch(/^[a-f0-9-]+\.pdf$/);
    expect(prepared.sanitizedOriginalFilename).toBe("Stromvertrag 2026.pdf");

    const fakePdfHtml = Buffer.from("<html><script>alert(1)</script></html>");
    expect(() =>
      validateAndPrepareDocumentUpload({
        buffer: fakePdfHtml,
        originalFilename: "evil.pdf",
        declaredMimeType: "application/pdf",
      })
    ).toThrow(/signature/i);

    expect(() => resolveSafeStoragePath("../../etc/passwd")).toThrow();
  });
});


import {
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";
import { extractAgentApiKey } from "@/lib/auth/agent-auth";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("Milestone 1 & 2 — Rate Limiting, Hermes Agent Header Auth & i18n", () => {
  it("enforces login rate limit after 8 failed attempts within 15 minutes", () => {
    const key = "127.0.0.1:test@example.com";
    resetLoginRateLimit(key);
    for (let i = 0; i < 8; i++) {
      expect(checkLoginRateLimit(key, 1000).allowed).toBe(true);
    }
    const ninth = checkLoginRateLimit(key, 1000);
    expect(ninth.allowed).toBe(false);
    expect(ninth.retryAfterSeconds).toBeGreaterThan(0);
    resetLoginRateLimit(key);
  });

  it("extracts Hermes Agent API key from Authorization Bearer or X-Hermes-Api-Key header", () => {
    const reqBearer = new Request("http://localhost:3000/api/v1/agent/summary", {
      headers: { Authorization: "Bearer akata_hermes_secret_1234567890" },
    });
    expect(extractAgentApiKey(reqBearer)).toBe(
      "akata_hermes_secret_1234567890"
    );

    const reqCustom = new Request("http://localhost:3000/api/v1/agent/summary", {
      headers: { "X-Hermes-Api-Key": "custom_hermes_key_1234567890" },
    });
    expect(extractAgentApiKey(reqCustom)).toBe("custom_hermes_key_1234567890");
  });

  it("provides complete German (de) and Turkish (tr) navigation dictionaries", () => {
    const de = getDictionary("de");
    const tr = getDictionary("tr");
    expect(de.nav.contracts).toBe("Verträge");
    expect(tr.nav.contracts).toBe("Sözleşmeler");
  });
});
