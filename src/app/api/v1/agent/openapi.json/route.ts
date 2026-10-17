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
          summary: "List and filter household contracts (Verträge).",
        },
        post: {
          operationId: "createContract",
          summary:
            "Create a new contract with automatic cancellation deadline and reminder calculation.",
        },
      },
      "/api/v1/agent/contracts/{id}": {
        get: {
          operationId: "getContractById",
          summary: "Get contract details with linked documents, invoices, and reminders.",
        },
        patch: {
          operationId: "updateContract",
          summary: "Update or archive a contract and recalculate deadlines.",
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
