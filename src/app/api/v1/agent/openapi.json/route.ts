import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Akata Life — Hermes Agent Full Access API",
      version: "1.0.0",
      description:
        "Programmatic REST API granting Hermes Agent full read/write access to Contracts, Documents, Household Finances, Invoices, Reminders, and Home Inventory in Akata Life.",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Pass HERMES_AGENT_API_KEY in Authorization: Bearer <token>",
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
      "/api/v1/agent/documents": {
        get: {
          operationId: "listDocuments",
          summary: "Search and list private documents metadata.",
        },
        post: {
          operationId: "uploadDocument",
          summary: "Upload and link a PDF or image document securely.",
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
      "/api/v1/agent/invoices": {
        get: {
          operationId: "listInvoices",
          summary: "List planned, unpaid, paid, and overdue invoices.",
        },
        post: {
          operationId: "createInvoice",
          summary: "Create or update an invoice / recurring bill.",
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
    },
  };

  return NextResponse.json(spec, { status: 200 });
}
