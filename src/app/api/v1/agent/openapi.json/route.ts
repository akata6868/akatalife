import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Akata Life — Hermes Agent Full Access API",
      version: "1.0.0",
      description:
        "Programmatic REST API granting Hermes Agent full read/write access to Contracts, Documents, Household Finances, Invoices, Reminders, Home Inventory, Energy/Home Assistant, and Audit Logs in Akata Life.",
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "https://life.akata.nl",
        description: "Akata Life Production Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Pass HERMES_AGENT_API_KEY in Authorization: Bearer <token>",
        },
        HermesHeaderAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Hermes-Api-Key",
        },
      },
    },
    security: [{ BearerAuth: [] }, { HermesHeaderAuth: [] }],
    paths: {
      "/api/v1/agent/summary": {
        get: {
          operationId: "getHouseholdSummary",
          summary:
            "Get real-time monthly income, expenses, remaining budget, expiring contracts, upcoming invoices, recent documents, and active reminders.",
        },
      },
      "/api/v1/agent/contracts": {
        get: {
          operationId: "listContracts",
          summary:
            "List household contracts (Verträge) including paid so far (effectivePaidCents / paidFormattedDe) and remaining payments (effectiveRemainingCents / remainingFormattedDe).",
        },
        post: {
          operationId: "createContract",
          summary:
            "Create a new contract with automatic cancellation deadline, paid/remaining payment tracking (paidAmountCents/paidAmountEur, remainingAmountCents/remainingAmountEur, paidInstallments, remainingInstallments), and status (ACTIVE, CANCELLATION_PLANNED, CANCELLED, EXPIRED).",
        },
      },
      "/api/v1/agent/contracts/{id}": {
        get: {
          operationId: "getContractById",
          summary: "Get contract details with paid/remaining breakdown, linked documents, invoices, and reminders.",
        },
        patch: {
          operationId: "updateContract",
          summary:
            "Update contract status, category, paidAmountCents/paidAmountEur, remainingAmountCents/remainingAmountEur, paidInstallments, remainingInstallments, or deadlines.",
        },
        delete: {
          operationId: "deleteContract",
          summary: "Delete a contract record.",
        },
      },
      "/api/v1/agent/contracts/export": {
        get: {
          operationId: "exportContracts",
          summary: "Export contracts metadata as CSV (?format=csv) or JSON (?format=json).",
        },
      },
      "/api/v1/agent/documents": {
        get: {
          operationId: "listDocuments",
          summary: "Search and list private documents metadata.",
        },
        post: {
          operationId: "uploadDocument",
          summary:
            "Upload and link a PDF or image document securely via multipart/form-data or JSON fileBase64.",
        },
      },
      "/api/v1/agent/documents/{id}": {
        patch: {
          operationId: "updateDocument",
          summary: "Update document metadata or archive status.",
        },
        delete: {
          operationId: "deleteDocument",
          summary: "Delete a document record and its private storage file.",
        },
      },
      "/api/v1/agent/transactions": {
        get: {
          operationId: "listTransactions",
          summary: "List income and expense transactions in integer EUR cents.",
        },
        post: {
          operationId: "createTransaction",
          summary: "Record a new income or expense transaction.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["description", "transactionDate", "type"],
                  properties: {
                    description: { type: "string" },
                    type: { type: "string", enum: ["INCOME", "EXPENSE"] },
                    amountEur: { type: "number", description: "Amount in EUR (or use amountCents)." },
                    amountCents: { type: "integer" },
                    transactionDate: { type: "string", description: "ISO date, e.g. 2026-10-17" },
                    status: { type: "string", enum: ["PLANNED", "RECORDED", "CONFIRMED"] },
                    categorySlug: { type: "string" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/agent/transactions/{id}": {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        get: {
          operationId: "getTransaction",
          summary: "Get a single income/expense transaction.",
        },
        patch: {
          operationId: "updateTransaction",
          summary:
            "Update a transaction (description, amountEur/amountCents, transactionDate, type, status, categorySlug, notes). Changes immediately affect the monthly financial health score.",
        },
        delete: {
          operationId: "deleteTransaction",
          summary:
            "Delete an income/expense transaction. Changes immediately affect the monthly financial health score.",
        },
      },
      "/api/v1/agent/transactions/export": {
        get: {
          operationId: "exportTransactionsCsv",
          summary: "Export all financial transactions as UTF-8 CSV.",
        },
      },
      "/api/v1/agent/invoices": {
        get: {
          operationId: "listInvoices",
          summary: "List planned, unpaid, paid, and overdue invoices.",
        },
        post: {
          operationId: "createInvoice",
          summary: "Create a new invoice / recurring bill.",
        },
      },
      "/api/v1/agent/invoices/{id}": {
        patch: {
          operationId: "updateInvoiceStatus",
          summary: "Mark an invoice as PAID, UNPAID, or CANCELLED.",
        },
        delete: {
          operationId: "deleteInvoice",
          summary: "Delete an invoice.",
        },
      },
      "/api/v1/agent/reminders": {
        get: {
          operationId: "listReminders",
          summary: "List upcoming deadlines and personal reminders.",
        },
        post: {
          operationId: "createReminder",
          summary: "Create a new reminder with deduplication support.",
        },
      },
      "/api/v1/agent/reminders/{id}": {
        patch: {
          operationId: "updateReminder",
          summary: "Mark a reminder as completed or update its priority/title.",
        },
        delete: {
          operationId: "deleteReminder",
          summary: "Delete a reminder.",
        },
      },
      "/api/v1/agent/home": {
        get: {
          operationId: "getHomeInventory",
          summary:
            "List properties, rooms, household appliances, maintenance records, and meter readings.",
        },
        post: {
          operationId: "createHomeRecord",
          summary:
            "Add a property, room, household asset, maintenance log, or meter reading.",
        },
      },
      "/api/v1/agent/energy": {
        get: {
          operationId: "getHomeAssistantSensors",
          summary:
            "Fetch read-only Home Assistant sensor states when enabled.",
        },
        post: {
          operationId: "configureHomeAssistant",
          summary:
            "Save encrypted server-side Home Assistant connection settings and sensor entity list.",
        },
      },
      "/api/v1/agent/health-score": {
        get: {
          operationId: "getMonthlyFinancialHealthScore",
          summary:
            "Monthly financial health score (SCHUFA-style percent/points/class) based on income vs expenses, savings rate, fixed/variable cost ratios and energy cost, with positive/negative factors and improvement recommendations.",
        },
      },
      "/api/v1/agent/health-score/simulate": {
        post: {
          operationId: "simulateFinancialHealthScore",
          summary:
            "What-if simulation. Body: { expenseCutEur, incomeBoostEur, contractDiscount15, optimizeEnergy }. Returns simulated score, class and yearly savings.",
        },
      },
      "/api/v1/agent/health-score/plan": {
        get: {
          operationId: "listHealthScorePlan",
          summary:
            "List items in the user's monthly financial improvement plan (saved recommendations).",
        },
        post: {
          operationId: "addHealthScorePlanItem",
          summary:
            "Add an item to the improvement plan. Either { recommendationId } (id from GET /health-score recommendations, e.g. rec-optimize-contracts) or a custom item { title, summary, category, priority, actionSteps, monthlySavingsEur }.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    recommendationId: { type: "string" },
                    title: { type: "string" },
                    summary: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["SAVINGS", "WEALTH", "CONTRACT_OPTIMIZATION", "BUDGET", "DEBT_PAYOFF", "GENERAL"],
                    },
                    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                    actionSteps: { type: "array", items: { type: "string" } },
                    monthlySavingsEur: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/agent/health-score/plan/{id}": {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        patch: {
          operationId: "updateHealthScorePlanItem",
          summary:
            "Update a plan item (status OPEN | IN_PROGRESS | APPLIED | DISMISSED, priority, progress).",
        },
        delete: {
          operationId: "deleteHealthScorePlanItem",
          summary: "Remove an item from the improvement plan.",
        },
      },
      "/api/v1/agent/advice": {
        get: {
          operationId: "listSavingsAndWealthAdvice",
          summary:
            "List Hermes Agent savings recommendations, tariff optimization advice, and wealth/accumulation goals.",
        },
        post: {
          operationId: "createSavingsAndWealthAdvice",
          summary:
            "Post a new savings recommendation, tariff optimization tip, or savings/accumulation goal (SAVINGS, WEALTH, CONTRACT_OPTIMIZATION, BUDGET, DEBT_PAYOFF).",
        },
      },
      "/api/v1/agent/advice/{id}": {
        patch: {
          operationId: "updateSavingsAndWealthAdvice",
          summary:
            "Update advice status (OPEN, IN_PROGRESS, APPLIED, DISMISSED), category, or accumulated savings progress.",
        },
        delete: {
          operationId: "deleteSavingsAndWealthAdvice",
          summary: "Delete a savings recommendation or wealth goal.",
        },
      },
      "/api/v1/agent/reports": {
        get: {
          operationId: "listReportsAndLiveAnalytics",
          summary:
            "Get real-time financial & contract analytics and list all saved Hermes Agent reports.",
        },
        post: {
          operationId: "createReport",
          summary:
            "Create a new monthly, annual, contract, or savings report (MONTHLY, ANNUAL, SAVINGS_ANALYSIS, CONTRACT_REVIEW, CUSTOM).",
        },
      },
      "/api/v1/agent/reports/{id}": {
        patch: {
          operationId: "updateReport",
          summary: "Update an existing report.",
        },
        delete: {
          operationId: "deleteReport",
          summary: "Delete a report.",
        },
      },
      "/api/v1/agent/notifications": {
        get: {
          operationId: "listNotifications",
          summary: "List real-time notifications and unread count.",
        },
        post: {
          operationId: "sendRealtimeNotification",
          summary:
            "Send an immediate real-time notification (Benachrichtigung) to the user's mobile/desktop app.",
        },
        patch: {
          operationId: "markNotificationsRead",
          summary: "Mark one or all notifications as read.",
        },
      },
      "/api/v1/agent/audit": {
        get: {
          operationId: "listAuditEvents",
          summary:
            "Inspect security and mutation audit trail for both USER and HERMES_AGENT actions.",
        },
      },
    },
  };

  return NextResponse.json(spec, { status: 200 });
}
