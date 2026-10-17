import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import {
  formatEurCents,
  calculateMonthlyEquivalentCents,
  parseEurToCents,
} from "@/lib/finance/money";

function buildMarkLvPythonPlugin(baseUrl: string): string {
  return `"""
Akata Life (${baseUrl}) Official Plugin for FatihMakes/Mark-LV (J.A.R.V.I.S.)
==============================================================================
Kurulum (Installation):
1. Bu dosyayı 'Mark-LV/plugins/akata_life.py' olarak kaydedin.
2. Mark-LV (JARVIS) başladığında otomatik olarak 'akata_life' aracını tanır.
3. Mark-LV Ayarlar (⚙ -> PLUGINS -> Akata Life) kısmından veya config/api_keys.json
   içinden HERMES_AGENT_API_KEY anahtarınızı girin.
"""

import json
import os
import urllib.request
import urllib.error

PLUGIN = {
    "name": "akata_life",
    "description": (
        "Connects JARVIS (Mark-LV) to Akata Life (${baseUrl}) household, "
        "contracts (Vertraege), income/expenses (Gelir/Gider), savings advisor (/advisor), "
        "financial reports (/reports), and real-time push notifications. "
        "Use this tool whenever the user asks about their household finances, monthly expenses, "
        "income, contracts, remaining installments, savings advice, reports, or wants to record "
        "a new income/expense or send a notification to Akata Life."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "action": {
                "type": "STRING",
                "description": (
                    "Action to perform on Akata Life: "
                    "'summary' (full household/finance/contract overview), "
                    "'contracts' (list active & cancelled contracts and remaining payments), "
                    "'advisor' (read Hermes savings & investment recommendations), "
                    "'reports' (read latest financial & contract reports), "
                    "'add_expense' (record a new expense in EUR), "
                    "'add_income' (record a new income in EUR), "
                    "'notify' (send a real-time push notification to Akata Life app)."
                ),
            },
            "title": {
                "type": "STRING",
                "description": "Description or title (for add_expense, add_income, or notify)",
            },
            "amount_eur": {
                "type": "STRING",
                "description": "Amount in EUR when adding income or expense, e.g. '49,90' or '120.50'",
            },
            "message": {
                "type": "STRING",
                "description": "Notification message body when action is 'notify'",
            },
        },
        "required": ["action"],
    },
}

PLUGIN_SETTINGS = {
    "namespace": "akata_life",
    "title": "Akata Life (${baseUrl})",
    "fields": [
        {
            "key": "api_url",
            "label": "Akata Life Sunucu URL",
            "default": "${baseUrl}",
        },
        {
            "key": "api_key",
            "label": "Hermes / Jarvis API Key (X-Hermes-Api-Key)",
            "secret": True,
            "default": "",
        },
    ],
}


def _load_plugin_creds() -> tuple[str, str]:
    api_url = os.environ.get("AKATA_LIFE_URL", "${baseUrl}")
    api_key = os.environ.get("AKATA_LIFE_API_KEY", "")
    try:
        from memory.config_manager import get_plugin_config
        cfg = get_plugin_config("akata_life") or {}
        if cfg.get("api_url"):
            api_url = str(cfg["api_url"]).strip()
        if cfg.get("api_key"):
            api_key = str(cfg["api_key"]).strip()
    except Exception:
        pass
    return api_url.rstrip("/"), api_key


def run(parameters: dict, player=None, session_memory=None) -> str:
    api_url, api_key = _load_plugin_creds()
    action = str(parameters.get("action", "summary")).strip().lower()

    payload = {
        "action": action,
        "title": parameters.get("title", ""),
        "amountEur": parameters.get("amount_eur", ""),
        "message": parameters.get("message", ""),
    }

    endpoint = f"{api_url}/api/v1/agent/plugins/mark-lv"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mark-LV-Jarvis/1.0",
    }
    if api_key:
        headers["X-Hermes-Api-Key"] = api_key
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("speechText") or json.dumps(data, ensure_ascii=False)
    except urllib.error.HTTPError as e:
        return f"Sir, Akata Life returned HTTP {e.code}. Please check the API key in plugin settings."
    except Exception as e:
        return f"Sir, I could not reach Akata Life at {api_url}: {e}"
`;
}

export async function GET(req: NextRequest) {
  const baseUrl = (
    process.env.APP_BASE_URL ||
    req.nextUrl.origin ||
    "https://life.akata.nl"
  ).replace(/\/+$/, "");

  const script = buildMarkLvPythonPlugin(baseUrl);
  const format = req.nextUrl.searchParams.get("format");

  if (format === "json") {
    return NextResponse.json({
      filename: "akata_life.py",
      targetPath: "Mark-LV/plugins/akata_life.py",
      repoUrl: "https://github.com/FatihMakes/Mark-LV",
      endpointUrl: `${baseUrl}/api/v1/agent/plugins/mark-lv`,
      script,
    });
  }

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="akata_life.py"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json(
        {
          ok: false,
          speechText:
            "Yetkisiz erişim. Lütfen Mark-LV eklenti ayarlarında HERMES_AGENT_API_KEY anahtarınızı kontrol edin.",
        },
        { status: 401 }
      );
    }

    const owner = actor.userId
      ? { id: actor.userId }
      : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

    if (!owner) {
      return NextResponse.json(
        { ok: false, speechText: "Kullanıcı bulunamadı." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "summary")
      .trim()
      .toLowerCase();

    if (action === "contracts") {
      const contracts = await prisma.contract.findMany({
        where: { userId: owner.id },
        orderBy: { cancellationDeadline: "asc" },
      });
      const active = contracts.filter((c: any) => c.status === "ACTIVE");
      const totalMonthly = active.reduce(
        (acc: number, c: any) =>
          acc +
          calculateMonthlyEquivalentCents(c.amountCents, c.billingFrequency),
        0
      );
      const topList = active
        .slice(0, 5)
        .map(
          (c: any) =>
            `${c.provider} (${c.title}): ${formatEurCents(c.amountCents)}`
        )
        .join(", ");

      return NextResponse.json({
        ok: true,
        action: "contracts",
        speechText: `Efendim, sistemde toplam ${contracts.length} sözleşmeniz var, bunların ${active.length} tanesi aktif. Aylık toplam sabit sözleşme gideriniz ${formatEurCents(totalMonthly)}. Başlıca aktif sözleşmeleriniz: ${topList || "Henüz aktif sözleşme yok"}.`,
      });
    }

    if (action === "advisor") {
      const items = await prisma.agentAdvice.findMany({
        where: { userId: owner.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      if (items.length === 0) {
        return NextResponse.json({
          ok: true,
          action: "advisor",
          speechText:
            "Efendim, şu anda aktif bir tasarruf veya birikim tavsiyesi bulunmuyor.",
        });
      }
      const totalSavings = items.reduce(
        (s: number, i: any) => s + Number(i.potentialSavingsCents || 0),
        0
      );
      const summaryText = items
        .map(
          (i: any) =>
            `${i.title} (${formatEurCents(Number(i.potentialSavingsCents || 0))} tasarruf)`
        )
        .join("; ");
      return NextResponse.json({
        ok: true,
        action: "advisor",
        speechText: `Efendim, toplam ${formatEurCents(totalSavings)} potansiyel tasarruf sağlayan ${items.length} öneri mevcut: ${summaryText}.`,
      });
    }

    if (action === "reports") {
      const reports = await prisma.agentReport.findMany({
        where: { userId: owner.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      if (reports.length === 0) {
        return NextResponse.json({
          ok: true,
          action: "reports",
          speechText: "Efendim, sistemde henüz kayıtlı bir analiz raporu bulunmuyor.",
        });
      }
      const r = reports[0];
      return NextResponse.json({
        ok: true,
        action: "reports",
        speechText: `Efendim, en güncel raporunuz: ${r.title}. Özeti: ${r.summary}`,
      });
    }

    if (action === "add_expense" || action === "add_income") {
      const isIncome = action === "add_income";
      let amountCents = 0;
      try {
        amountCents = parseEurToCents(body.amountEur || body.amount_eur || "0");
      } catch {
        amountCents = 0;
      }
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : isIncome
            ? "Jarvis Gelir Kaydı"
            : "Jarvis Gider Kaydı";

      if (!amountCents || amountCents <= 0) {
        return NextResponse.json({
          ok: false,
          speechText:
            "Efendim, geçerli bir Euro tutarı belirtmediniz. Örneğin 45,90 şeklinde söyleyebilirsiniz.",
        });
      }

      const slug = isIncome ? "other-income" : "other-expenses";
      const category = await prisma.category.upsert({
        where: { userId_slug: { userId: owner.id, slug } },
        update: {},
        create: {
          slug,
          nameDe: isIncome ? "Sonstige Einnahmen" : "Sonstige Ausgaben",
          nameTr: isIncome ? "Diğer Gelirler" : "Diğer Giderler",
          type: isIncome ? "INCOME" : "EXPENSE",
          userId: owner.id,
        },
      });

      await prisma.transaction.create({
        data: {
          description: title,
          amountCents,
          currency: "EUR",
          transactionDate: new Date(),
          type: isIncome ? "INCOME" : "EXPENSE",
          status: "RECORDED",
          categoryId: category.id,
          userId: owner.id,
        },
      });

      await prisma.notification.create({
        data: {
          title: `JARVIS (Mark-LV): ${isIncome ? "Gelir" : "Gider"} Eklendi`,
          message: `${title} — ${formatEurCents(amountCents)}`,
          type: "FINANCE",
          priority: "NORMAL",
          actionUrl: isIncome ? "/income" : "/expenses",
          createdBy: "MARK_LV_JARVIS",
          userId: owner.id,
        },
      });

      return NextResponse.json({
        ok: true,
        action,
        speechText: `Efendim, ${title} için ${formatEurCents(amountCents)} tutarında ${isIncome ? "gelir" : "gider"} kaydı Akata Life sistemine başarıyla eklendi.`,
      });
    }

    if (action === "notify") {
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : "J.A.R.V.I.S. (Mark-LV) Bildirimi";
      const message =
        typeof body.message === "string" && body.message.trim()
          ? body.message.trim()
          : "Mark-LV asistanınızdan canlı bildirim gönderildi.";

      await prisma.notification.create({
        data: {
          title,
          message,
          type: "SYSTEM",
          priority: "HIGH",
          actionUrl: "/plugins",
          createdBy: "MARK_LV_JARVIS",
          userId: owner.id,
        },
      });

      return NextResponse.json({
        ok: true,
        action: "notify",
        speechText: `Efendim, "${title}" başlıklı canlı bildirim Akata Life uygulamanıza gönderildi.`,
      });
    }

    // Default: "summary"
    const [contracts, transactions, advice] = await Promise.all([
      prisma.contract.findMany({ where: { userId: owner.id, status: "ACTIVE" } }),
      prisma.transaction.findMany({ where: { userId: owner.id } }),
      prisma.agentAdvice.findMany({ where: { userId: owner.id, status: "ACTIVE" } }),
    ]);

    const incomeCents = transactions
      .filter((t: any) => t.type === "INCOME")
      .reduce((acc: number, t: any) => acc + Number(t.amountCents || 0), 0);
    const expenseCents = transactions
      .filter((t: any) => t.type === "EXPENSE")
      .reduce((acc: number, t: any) => acc + Number(t.amountCents || 0), 0);
    const balanceCents = incomeCents - expenseCents;
    const monthlyContractsCents = contracts.reduce(
      (acc: number, c: any) =>
        acc +
        calculateMonthlyEquivalentCents(c.amountCents, c.billingFrequency),
      0
    );

    await recordAuditEvent({
      actor,
      action: "MARK_LV_JARVIS_QUERY",
      entityType: "PluginIntegration",
      entityId: "mark-lv-jarvis",
      metadata: { requestedAction: action },
    });

    return NextResponse.json({
      ok: true,
      action: "summary",
      speechText: `Efendim, Akata Life genel durumunuz şöyle: Toplam geliriniz ${formatEurCents(incomeCents)}, toplam gideriniz ${formatEurCents(expenseCents)}, net bakiyeniz ${formatEurCents(balanceCents)}. Sistemde ${contracts.length} aktif sözleşmeniz bulunuyor ve aylık sabit sözleşme yükünüz ${formatEurCents(monthlyContractsCents)}. Ayrıca ${advice.length} adet aktif tasarruf öneriniz mevcut.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        speechText:
          err instanceof Error
            ? `Sistem hatası: ${err.message}`
            : "Mark-LV köprüsünde beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
