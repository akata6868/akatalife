import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { decryptSecret } from "@/lib/auth/crypto";
import { prisma } from "@/lib/db/prisma";
import {
  calculateMonthlyEquivalentCents,
  formatEurCents,
  sumCents,
} from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";
import {
  fetchHomeAssistantSensors,
  normalizeHomeAssistantBaseUrl,
} from "@/lib/home-assistant/client";

export interface ScoreFactor {
  id: string;
  type: "POSITIVE" | "NEGATIVE";
  category:
    | "PAYMENT_HISTORY"
    | "CASHFLOW_SAVINGS"
    | "CONTRACT_LOAD"
    | "ENERGY_SMART_HOME"
    | "WEALTH_OPTIMIZATION";
  title: string;
  description: string;
  impactPoints: number; // e.g. +30 or -20
  impactPercent: number; // e.g. +1.2 or -0.8
  metricBadge: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface ScoreRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  potentialScoreGainPoints: number;
  potentialScoreGainPercent: number;
  estimatedMonthlySavingsCents: number;
  estimatedMonthlySavingsFormattedDe: string;
  estimatedYearlySavingsFormattedDe: string;
  actionUrl: string;
  actionSteps: string[];
}

export async function GET(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const [
      allTransactions,
      activeContracts,
      invoices,
      reminders,
      adviceList,
      haConfig,
      haPlugin,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: actor.userId },
        orderBy: { transactionDate: "desc" },
        take: 300,
      }),
      prisma.contract.findMany({
        where: { userId: actor.userId, status: "ACTIVE", archivedAt: null },
        orderBy: { amountCents: "desc" },
      }),
      prisma.invoice.findMany({
        where: { userId: actor.userId },
        orderBy: { dueDate: "asc" },
      }),
      prisma.reminder.findMany({
        where: { userId: actor.userId, completedAt: null },
        orderBy: { dueAt: "asc" },
      }),
      prisma.agentAdvice.findMany({
        where: { userId: actor.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.homeAssistantConfig.findUnique({ where: { id: "singleton" } }),
      prisma.pluginIntegration.findFirst({ where: { slug: "home-assistant" } }),
    ]);

    // 1. Monthly Income & Expenses (use current month, or fallback to latest months average if current month is empty)
    const currentMonthTx = allTransactions.filter((t: any) => {
      const d = new Date(t.transactionDate);
      return d >= monthStart && d <= monthEnd;
    });

    const txPool = currentMonthTx.length > 0 ? currentMonthTx : allTransactions;
    const monthDivisor =
      currentMonthTx.length > 0
        ? 1
        : Math.max(
            1,
            new Set(
              allTransactions.map((t: any) => {
                const d = new Date(t.transactionDate);
                return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
              })
            ).size
          );

    const monthlyIncomeCents = Math.round(
      sumCents(
        txPool
          .filter((t: any) => t.type === "INCOME")
          .map((t: any) => Number(t.amountCents ?? 0))
      ) / monthDivisor
    );

    const monthlyTxExpenseCents = Math.round(
      sumCents(
        txPool
          .filter((t: any) => t.type === "EXPENSE")
          .map((t: any) => Number(t.amountCents ?? 0))
      ) / monthDivisor
    );

    // 2. Fixed Contracts Monthly Load
    const monthlyContractLoadCents = sumCents(
      activeContracts.map((c: any) =>
        calculateMonthlyEquivalentCents(
          Number(c.amountCents ?? 0),
          c.billingFrequency
        )
      )
    );

    // 3. Home Assistant Energy Metrics (optional live check with short timeout)
    let energyConnected = false;
    let monthlyHeatingAndWaterEur = 0;
    const haBaseUrl = normalizeHomeAssistantBaseUrl(
      haConfig?.baseUrl || haPlugin?.baseUrl || ""
    );
    let haToken = process.env.HOME_ASSISTANT_TOKEN || "";
    const ciphers = [
      haConfig?.tokenEncrypted,
      haPlugin?.apiKeyEncrypted,
    ].filter(Boolean) as string[];
    for (const c of ciphers) {
      try {
        const dec = decryptSecret(c);
        if (dec && dec.length >= 40) {
          haToken = dec;
          break;
        }
      } catch {}
    }

    if (haBaseUrl && haToken && (haConfig?.enabled || haPlugin?.enabled)) {
      try {
        const haRes = await fetchHomeAssistantSensors({
          baseUrl: haBaseUrl,
          token: haToken,
          entityIds: [
            "sensor.heizung_kosten_monat",
            "sensor.warmwasser_kosten_monat",
            "sensor.heizung_kosten_heute",
            "sensor.warmwasser_kosten_heute",
          ],
          timeoutMs: 3500,
        });
        if (haRes.ok) {
          energyConnected = true;
          for (const s of haRes.sensors) {
            if (
              s.isAvailable &&
              s.numericValue !== null &&
              s.entityId.includes("monat")
            ) {
              monthlyHeatingAndWaterEur += s.numericValue;
            }
          }
        }
      } catch {}
    }

    const monthlyEnergyCents = Math.round(monthlyHeatingAndWaterEur * 100);

    // Total monthly outflow (avoid double counting if expenses already include contracts, use max or combined smartly)
    const totalMonthlyOutflowCents =
      monthlyTxExpenseCents + monthlyContractLoadCents;
    const effectiveIncomeCents =
      monthlyIncomeCents > 0
        ? monthlyIncomeCents
        : Math.max(totalMonthlyOutflowCents, 0);

    const netMonthlyCashflowCents =
      monthlyIncomeCents - totalMonthlyOutflowCents;
    const savingsRatePercent =
      monthlyIncomeCents > 0
        ? Math.round((netMonthlyCashflowCents * 1000) / monthlyIncomeCents) / 10
        : 0;

    const fixedCostRatioPercent =
      monthlyIncomeCents > 0
        ? Math.round((monthlyContractLoadCents * 1000) / monthlyIncomeCents) /
          10
        : activeContracts.length > 0
          ? 45
          : 0;

    // 4. Invoices & Reminders Discipline
    const overdueInvoices = invoices.filter((inv: any) => {
      if (inv.status === "PAID") return false;
      if (inv.status === "OVERDUE") return true;
      return inv.dueDate && new Date(inv.dueDate) < now;
    });
    const unpaidInvoices = invoices.filter(
      (inv: any) => inv.status === "UNPAID" || inv.status === "PLANNED"
    );
    const paidInvoices = invoices.filter((inv: any) => inv.status === "PAID");

    const overdueReminders = reminders.filter(
      (r: any) => r.dueAt && new Date(r.dueAt) < now
    );

    // 5. Contracts nearing cancellation deadline or missing cancellation deadline
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringSoonContracts = activeContracts.filter((c: any) => {
      if (!c.cancellationDeadline) return false;
      const d = new Date(c.cancellationDeadline);
      return d >= now && d <= sixtyDaysFromNow;
    });
    const contractsWithoutDeadline = activeContracts.filter(
      (c: any) => !c.cancellationDeadline && c.autoRenew
    );

    // 6. Savings & Advice Metrics
    const openAdvice = adviceList.filter(
      (a: any) => a.status === "OPEN" || a.status === "IN_PROGRESS"
    );
    const appliedAdvice = adviceList.filter((a: any) => a.status === "APPLIED");
    const potentialMonthlySavingsCents = sumCents(
      openAdvice.map((a: any) => Number(a.monthlySavingsCents ?? 0))
    );
    const realizedMonthlySavingsCents = sumCents(
      appliedAdvice.map((a: any) => Number(a.monthlySavingsCents ?? 0))
    );

    // =========================================================================
    // SUB-SCORES CALCULATION (Each 0..100)
    // =========================================================================

    // A) Payment Discipline (Zahlungsverhalten - Weight 30%)
    let paymentScore = 98;
    if (overdueInvoices.length > 0) {
      paymentScore -= Math.min(60, overdueInvoices.length * 22);
    }
    if (overdueReminders.length > 0) {
      paymentScore -= Math.min(25, overdueReminders.length * 8);
    }
    if (paidInvoices.length >= 3 && overdueInvoices.length === 0) {
      paymentScore = Math.min(100, paymentScore + 2);
    }
    paymentScore = Math.max(15, Math.min(100, paymentScore));

    // B) Cashflow & Savings Rate (Sparquote & Liquidität - Weight 25%)
    let cashflowScore = 75;
    if (monthlyIncomeCents === 0 && totalMonthlyOutflowCents === 0) {
      cashflowScore = 70;
    } else if (monthlyIncomeCents === 0 && totalMonthlyOutflowCents > 0) {
      cashflowScore = 45;
    } else if (savingsRatePercent >= 25) {
      cashflowScore = 98;
    } else if (savingsRatePercent >= 15) {
      cashflowScore = 90;
    } else if (savingsRatePercent >= 5) {
      cashflowScore = 78;
    } else if (savingsRatePercent >= 0) {
      cashflowScore = 65;
    } else {
      cashflowScore = Math.max(20, Math.round(55 + savingsRatePercent * 0.8));
    }

    // C) Contract & Fixed Cost Load (Fixkosten & Verträge - Weight 20%)
    let contractScore = 88;
    if (fixedCostRatioPercent > 60) {
      contractScore -= 35;
    } else if (fixedCostRatioPercent > 45) {
      contractScore -= 18;
    } else if (fixedCostRatioPercent > 0 && fixedCostRatioPercent <= 30) {
      contractScore += 8;
    }
    if (expiringSoonContracts.length > 0) {
      contractScore -= Math.min(18, expiringSoonContracts.length * 6);
    }
    if (contractsWithoutDeadline.length > 2) {
      contractScore -= 8;
    }
    contractScore = Math.max(20, Math.min(100, contractScore));

    // D) Smart Home & Energy Efficiency (Energie & Haushalt - Weight 10%)
    let energyScore = energyConnected ? 92 : 72;
    if (energyConnected && monthlyHeatingAndWaterEur > 220) {
      energyScore = 68;
    } else if (energyConnected && monthlyHeatingAndWaterEur <= 120) {
      energyScore = 96;
    }

    // E) Wealth & Optimization Activity (Vermögensaufbau & Optimierung - Weight 15%)
    let optimizationScore = 76;
    if (appliedAdvice.length > 0) {
      optimizationScore += Math.min(20, appliedAdvice.length * 7);
    }
    if (openAdvice.length > 3 && appliedAdvice.length === 0) {
      optimizationScore -= 10;
    }
    optimizationScore = Math.max(30, Math.min(100, optimizationScore));

    // Weighted Composite Score (0..100)
    const composite100 =
      paymentScore * 0.3 +
      cashflowScore * 0.25 +
      contractScore * 0.2 +
      energyScore * 0.1 +
      optimizationScore * 0.15;

    // SCHUFA Basisscore style (e.g. 50.0% to 99.8%)
    const schufaPercent =
      Math.round(
        Math.max(50, Math.min(99.8, 55 + composite100 * 0.445)) * 100
      ) / 100;

    // New SCHUFA Points style (100 to 900 points)
    const schufaPoints = Math.round(
      Math.max(100, Math.min(900, 100 + composite100 * 8))
    );

    // Rating Class & Label
    let ratingClass = "A";
    let ratingLabelDe = "Hervorragende Bonität & Finanzgesundheit";
    let ratingLabelTr = "Mükemmel Finansal Sağlık (Çok Düşük Risk)";
    let riskLevel: "VERY_LOW" | "LOW" | "MODERATE" | "ELEVATED" | "HIGH" =
      "VERY_LOW";

    if (schufaPercent >= 96.5) {
      ratingClass = "A+";
      ratingLabelDe = "Hervorragend (Bestnote)";
      ratingLabelTr = "Mükemmel Finansal Sağlık (En Üst Seviye)";
      riskLevel = "VERY_LOW";
    } else if (schufaPercent >= 93.5) {
      ratingClass = "A";
      ratingLabelDe = "Sehr gut (Geringes Risiko)";
      ratingLabelTr = "Çok İyi Finansal Sağlık (Güvenli)";
      riskLevel = "LOW";
    } else if (schufaPercent >= 89.0) {
      ratingClass = "B";
      ratingLabelDe = "Gut bis zufriedenstellend";
      ratingLabelTr = "İyi / Dengeli Finansal Durum";
      riskLevel = "MODERATE";
    } else if (schufaPercent >= 82.0) {
      ratingClass = "C";
      ratingLabelDe = "Erhöhter Optimierungsbedarf";
      ratingLabelTr = "Dikkat Gerektiren Bütçe Yükü";
      riskLevel = "ELEVATED";
    } else {
      ratingClass = "D";
      ratingLabelDe = "Kritische Belastung";
      ratingLabelTr = "Yüksek Finansal Risk — Acil Önlem Önerilir";
      riskLevel = "HIGH";
    }

    // =========================================================================
    // POSITIVE & NEGATIVE FACTORS
    // =========================================================================
    const positiveFactors: ScoreFactor[] = [];
    const negativeFactors: ScoreFactor[] = [];

    // 1. Overdue Invoices check
    if (overdueInvoices.length === 0) {
      positiveFactors.push({
        id: "pos-no-overdue-invoices",
        type: "POSITIVE",
        category: "PAYMENT_HISTORY",
        title: "Sıfır Gecikmiş Fatura (Kusursuz Ödeme Sicili)",
        description:
          "Vadesi geçmiş hiçbir ödenmemiş faturanız bulunmuyor. SCHUFA tarzı skorlamada en yüksek ağırlığa (%30) sahip kriter tam puan alıyor.",
        impactPoints: 45,
        impactPercent: 1.8,
        metricBadge: `${paidInvoices.length} Ödenmiş / 0 Gecikmiş`,
        actionLabel: "Faturaları Gör",
        actionUrl: "/invoices",
      });
    } else {
      const overdueSumCents = sumCents(
        overdueInvoices.map((i: any) => Number(i.amountCents ?? 0))
      );
      negativeFactors.push({
        id: "neg-overdue-invoices",
        type: "NEGATIVE",
        category: "PAYMENT_HISTORY",
        title: `${overdueInvoices.length} Adet Gecikmiş Fatura Mevcut`,
        description: `Toplam ${formatEurCents(overdueSumCents, "de")} tutarında vadesi geçmiş fatura görünüyor. Gecikmiş ödemeler finansal sağlık skorunu en sert düşüren etkendir.`,
        impactPoints: -Math.min(60, overdueInvoices.length * 22),
        impactPercent: -2.4,
        metricBadge: formatEurCents(overdueSumCents, "de"),
        actionLabel: "Hemen Kapat",
        actionUrl: "/invoices",
      });
    }

    // 2. Cashflow & Income check
    if (monthlyIncomeCents > 0 && netMonthlyCashflowCents > 0) {
      positiveFactors.push({
        id: "pos-positive-cashflow",
        type: "POSITIVE",
        category: "CASHFLOW_SAVINGS",
        title: `Pozitif Aylık Nakit Akışı (+${formatEurCents(netMonthlyCashflowCents, "de")})`,
        description: `Aylık geliriniz (${formatEurCents(monthlyIncomeCents, "de")}), sabit sözleşme ve harcamalarınızı rahatlıkla karşılıyor. Tasarruf oranınız %${savingsRatePercent.toFixed(1)}.`,
        impactPoints: 35,
        impactPercent: 1.4,
        metricBadge: `%${savingsRatePercent.toFixed(1)} Tasarruf Oranı`,
        actionLabel: "Gelir & Gider Analizi",
        actionUrl: "/finances",
      });
    } else if (monthlyIncomeCents === 0) {
      negativeFactors.push({
        id: "neg-missing-income",
        type: "NEGATIVE",
        category: "CASHFLOW_SAVINGS",
        title: "Aylık Düzenli Gelir Kaydı Eksik",
        description:
          "Sistemde bu aya veya geçmişe ait düzenli gelir (Maaş, Kira Geliri vb.) kaydı bulunamadı veya 0 € görünüyor. Doğru karşılama oranı için gelirlerinizi ekleyin.",
        impactPoints: -25,
        impactPercent: -1.1,
        metricBadge: "Gelir: 0,00 €",
        actionLabel: "Gelir Ekle",
        actionUrl: "/income",
      });
    } else if (netMonthlyCashflowCents < 0) {
      negativeFactors.push({
        id: "neg-negative-cashflow",
        type: "NEGATIVE",
        category: "CASHFLOW_SAVINGS",
        title: `Aylık Bütçe Açığı (${formatEurCents(netMonthlyCashflowCents, "de")})`,
        description:
          "Aylık toplam gider ve sabit sözleşme yükünüz, kayıtlı aylık gelirinizin üzerinde görünüyor.",
        impactPoints: -35,
        impactPercent: -1.6,
        metricBadge: formatEurCents(netMonthlyCashflowCents, "de"),
        actionLabel: "Giderleri İncele",
        actionUrl: "/expenses",
      });
    }

    // 3. Contract Load check
    if (activeContracts.length > 0 && fixedCostRatioPercent <= 35 && monthlyIncomeCents > 0) {
      positiveFactors.push({
        id: "pos-healthy-contract-load",
        type: "POSITIVE",
        category: "CONTRACT_LOAD",
        title: `Dengeli Sabit Sözleşme Yükü (%${fixedCostRatioPercent.toFixed(1)})`,
        description: `${activeContracts.length} aktif sözleşmenizin aylık maliyeti (${formatEurCents(monthlyContractLoadCents, "de")}) gelirinizin %35'inin altında, yani güvenli bölgede.`,
        impactPoints: 24,
        impactPercent: 0.9,
        metricBadge: `${formatEurCents(monthlyContractLoadCents, "de")} / Ay`,
        actionLabel: "Sözleşmeler",
        actionUrl: "/contracts",
      });
    } else if (activeContracts.length > 0 && fixedCostRatioPercent > 40) {
      negativeFactors.push({
        id: "neg-high-contract-load",
        type: "NEGATIVE",
        category: "CONTRACT_LOAD",
        title: `Yüksek Sabit Sözleşme Yükü (${formatEurCents(monthlyContractLoadCents, "de")}/Ay)`,
        description: `${activeContracts.length} aktif sözleşmeniz aylık bütçenizin önemli bir kısmını bağlıyor. Gereksiz abonelikleri iptal ederek veya tarife değiştirerek skorunuzu yükseltebilirsiniz.`,
        impactPoints: -18,
        impactPercent: -0.8,
        metricBadge: `${activeContracts.length} Aktif Sözleşme`,
        actionLabel: "Sözleşmeleri Optimize Et",
        actionUrl: "/contracts",
      });
    }

    // 4. Expiring / Auto-renewing Contracts check
    if (expiringSoonContracts.length > 0) {
      negativeFactors.push({
        id: "neg-expiring-contracts",
        type: "NEGATIVE",
        category: "CONTRACT_LOAD",
        title: `${expiringSoonContracts.length} Sözleşmenin İptal Süresi (Kündigungsfrist) Yaklaşıyor`,
        description: `${expiringSoonContracts.map((c: any) => c.name || c.provider).join(", ")} için fesih tarihi 60 gün içinde doluyor. Otomatik uzamadan önce daha ucuz tarifeye geçiş fırsatı var.`,
        impactPoints: -12,
        impactPercent: -0.5,
        metricBadge: `${expiringSoonContracts.length} Yaklaşan Fesih`,
        actionLabel: "Sözleşmelere Git",
        actionUrl: "/contracts",
      });
    }

    // 5. Home Assistant Energy Integration check
    if (energyConnected) {
      positiveFactors.push({
        id: "pos-ha-energy-connected",
        type: "POSITIVE",
        category: "ENERGY_SMART_HOME",
        title: "Home Assistant Canlı Enerji & Isınma Takibi Aktif",
        description:
          monthlyHeatingAndWaterEur > 0
            ? `Viessmann Vitodens ve ev sensörleriniz canlı izleniyor. Bu ayki ısınma + sıcak su tüketiminiz: ${monthlyHeatingAndWaterEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €.`
            : "Akıllı ev sensörleriniz canlı olarak izleniyor ve sürpriz enerji faturalarına karşı erken uyarı sağlıyor.",
        impactPoints: 18,
        impactPercent: 0.7,
        metricBadge:
          monthlyHeatingAndWaterEur > 0
            ? `${monthlyHeatingAndWaterEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / Ay`
            : "Canlı Sensör Aktif",
        actionLabel: "Enerji Paneli",
        actionUrl: "/energy",
      });

      if (monthlyHeatingAndWaterEur > 180) {
        negativeFactors.push({
          id: "neg-high-heating-cost",
          type: "NEGATIVE",
          category: "ENERGY_SMART_HOME",
          title: `Yüksek Aylık Isınma & Sıcak Su Maliyeti (${monthlyHeatingAndWaterEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)`,
          description:
            "Home Assistant verilerine göre aylık doğalgaz/ısınma tüketiminiz ortalamanın üzerinde seyrediyor. Oda sıcaklığını 1 °C düşürmek yıllık %6 tasarruf sağlar.",
          impactPoints: -10,
          impactPercent: -0.4,
          metricBadge: `${monthlyHeatingAndWaterEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
          actionLabel: "Enerji Sensörleri",
          actionUrl: "/energy",
        });
      }
    } else {
      negativeFactors.push({
        id: "neg-ha-disconnected",
        type: "NEGATIVE",
        category: "ENERGY_SMART_HOME",
        title: "Canlı Enerji Verisi Henüz Hesaba Katılmadı",
        description:
          "Home Assistant enerji sensörleri bağlandığında elektrik ve doğalgaz tüketiminiz skorunuza pozitif şeffaflık puanı kazandırır.",
        impactPoints: -8,
        impactPercent: -0.3,
        metricBadge: "Sensör Bekleniyor",
        actionLabel: "Enerji Ayarları",
        actionUrl: "/energy",
      });
    }

    // 6. Applied vs Open Savings Advice
    if (appliedAdvice.length > 0) {
      positiveFactors.push({
        id: "pos-applied-savings",
        type: "POSITIVE",
        category: "WEALTH_OPTIMIZATION",
        title: `${appliedAdvice.length} Tasarruf Adımı Uygulandı (+${formatEurCents(realizedMonthlySavingsCents * 12, "de")}/Yıl)`,
        description:
          "Tasarruf danışmanındaki önerileri hayata geçirerek kalıcı bütçe iyileştirmesi sağladınız.",
        impactPoints: 22,
        impactPercent: 0.9,
        metricBadge: `+${formatEurCents(realizedMonthlySavingsCents, "de")} / Ay`,
        actionLabel: "Tasarruf Paneli",
        actionUrl: "/advisor",
      });
    }

    if (potentialMonthlySavingsCents > 0) {
      negativeFactors.push({
        id: "neg-unclaimed-savings",
        type: "NEGATIVE",
        category: "WEALTH_OPTIMIZATION",
        title: `Henüz Değerlendirilmemiş ${formatEurCents(potentialMonthlySavingsCents * 12, "de")}/Yıl Tasarruf Fırsatı`,
        description: `Tasarruf danışmanında açık bekleyen ${openAdvice.length} öneriyi uygulayarak aylık ${formatEurCents(potentialMonthlySavingsCents, "de")} ek nakit yaratabilirsiniz.`,
        impactPoints: -10,
        impactPercent: -0.4,
        metricBadge: `${formatEurCents(potentialMonthlySavingsCents, "de")} / Ay Potansiyel`,
        actionLabel: "Tavsiyeleri Uygula",
        actionUrl: "/advisor",
      });
    }

    // 7. Overdue Reminders check
    if (overdueReminders.length > 0) {
      negativeFactors.push({
        id: "neg-overdue-reminders",
        type: "NEGATIVE",
        category: "PAYMENT_HISTORY",
        title: `${overdueReminders.length} Adet Gecikmiş Hatırlatıcı / Görev`,
        description:
          "Takvimde süresi geçmiş tamamlanmamış hatırlatıcılar bulunuyor.",
        impactPoints: -Math.min(20, overdueReminders.length * 7),
        impactPercent: -0.5,
        metricBadge: `${overdueReminders.length} Gecikmiş Görev`,
        actionLabel: "Hatırlatıcılar",
        actionUrl: "/reminders",
      });
    }

    // =========================================================================
    // SMART ACTIONABLE RECOMMENDATIONS (Score Boosters)
    // =========================================================================
    const recommendations: ScoreRecommendation[] = [];

    if (overdueInvoices.length > 0) {
      const sumOverdue = sumCents(
        overdueInvoices.map((i: any) => Number(i.amountCents ?? 0))
      );
      recommendations.push({
        id: "rec-pay-overdue",
        title: `Gecikmiş ${overdueInvoices.length} Faturayı Kapatarak Skorunuzu Hızla Yükseltin`,
        description: `Toplam ${formatEurCents(sumOverdue, "de")} tutarındaki gecikmiş faturaları ödendi olarak işaretlediğinizde ödeme disiplini puanınız anında maksimum seviyeye çıkar.`,
        category: "DEBT_PAYOFF",
        priority: "CRITICAL",
        potentialScoreGainPoints: Math.min(60, overdueInvoices.length * 22),
        potentialScoreGainPercent: 2.1,
        estimatedMonthlySavingsCents: 1500,
        estimatedMonthlySavingsFormattedDe: "15,00 € (Gecikme Faizi Önleme)",
        estimatedYearlySavingsFormattedDe: "180,00 €",
        actionUrl: "/invoices",
        actionSteps: [
          "Faturalar (/invoices) sayfasına gidin.",
          "Vadesi geçmiş faturaların ödemesini tamamlayıp durumunu 'PAID' (Ödendi) yapın.",
          "Otomatik ödeme talimatı (SEPA-Lastschrift) tanımlayarak gecikmeleri sıfırlayın.",
        ],
      });
    }

    if (activeContracts.length > 0) {
      const topContract = activeContracts[0];
      const topMonthly = calculateMonthlyEquivalentCents(
        Number(topContract.amountCents ?? 0),
        topContract.billingFrequency
      );
      const estSave = Math.max(1200, Math.round(topMonthly * 0.18));
      recommendations.push({
        id: "rec-optimize-top-contract",
        title: `"${topContract.name}" (${topContract.provider}) Sözleşmesinde Tarife Karşılaştırması Yapın`,
        description: `En yüksek sabit giderlerinizden biri olan bu sözleşme aylık ${formatEurCents(topMonthly, "de")} tutarında. Yeni müşteri kampanyası veya alternatif sağlayıcı ile ortalama %15-%20 tasarruf sağlanabilir.`,
        category: "CONTRACT_OPTIMIZATION",
        priority: "HIGH",
        potentialScoreGainPoints: 18,
        potentialScoreGainPercent: 0.75,
        estimatedMonthlySavingsCents: estSave,
        estimatedMonthlySavingsFormattedDe: formatEurCents(estSave, "de"),
        estimatedYearlySavingsFormattedDe: formatEurCents(estSave * 12, "de"),
        actionUrl: "/contracts",
        actionSteps: [
          `${topContract.provider} mevcut tarifesini güncel piyasa fiyatlarıyla karşılaştırın.`,
          topContract.cancellationDeadline
            ? `Son iptal tarihi (${formatDateDe(topContract.cancellationDeadline)}) geçmeden sağlayıcıdan indirim talep edin.`
            : "Sözleşmeye son fesih tarihini (Kündigungsfrist) ekleyin.",
        ],
      });
    }

    if (energyConnected && monthlyHeatingAndWaterEur > 40) {
      const saveCents = Math.max(
        1800,
        Math.round(monthlyHeatingAndWaterEur * 100 * 0.12)
      );
      recommendations.push({
        id: "rec-heating-optimization",
        title: "Viessmann Vitodens Gece Düşürme & Sıcak Su Programı Optimizasyonu",
        description: `Home Assistant üzerinden ölçülen aylık ${monthlyHeatingAndWaterEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ısınma + sıcak su maliyetinizi, gece sıcaklığını 1,5 °C düşürerek ve sıcak su sirkülasyon saatlerini daraltarak %12 azaltabilirsiniz.`,
        category: "SAVINGS",
        priority: "MEDIUM",
        potentialScoreGainPoints: 14,
        potentialScoreGainPercent: 0.55,
        estimatedMonthlySavingsCents: saveCents,
        estimatedMonthlySavingsFormattedDe: formatEurCents(saveCents, "de"),
        estimatedYearlySavingsFormattedDe: formatEurCents(saveCents * 12, "de"),
        actionUrl: "/energy",
        actionSteps: [
          "Oturma odası (21.0 °C) ve çocuk odası (20.9 °C) sensörlerine göre gece 23:00–06:00 arası kombi hedefini 18.5 °C yapın.",
          "Sıcak su (Warmwasser) ısıtma saatlerini sadece sabah ve akşam kullanım saatleriyle sınırlandırın.",
        ],
      });
    }

    const suggestedReserveMonthlyCents =
      monthlyIncomeCents > 0
        ? Math.max(10000, Math.round(monthlyIncomeCents * 0.1))
        : 15000;
    recommendations.push({
      id: "rec-emergency-fund",
      title: "Otomatik Acil Durum & Birikim Fonu (Notgroschen — 3 Aylık Gider Hedefi)",
      description:
        "Finansal sağlık skorunu kalıcı olarak A+ seviyesinde tutmak için her ay maaş günü otomatik ayrılan bir acil durum fonu ve ETF/Tagesgeld birikim planı oluşturun.",
      category: "WEALTH",
      priority: "HIGH",
      potentialScoreGainPoints: 25,
      potentialScoreGainPercent: 0.95,
      estimatedMonthlySavingsCents: suggestedReserveMonthlyCents,
      estimatedMonthlySavingsFormattedDe: formatEurCents(
        suggestedReserveMonthlyCents,
        "de"
      ),
      estimatedYearlySavingsFormattedDe: formatEurCents(
        suggestedReserveMonthlyCents * 12,
        "de"
      ),
      actionUrl: "/advisor",
      actionSteps: [
        "Ay başında sabit giderler çıktıktan hemen sonra otomatik transfer (Dauerauftrag) tanımlayın.",
        "En az 3 aylık sabit gider tutarını yüksek faizli Tagesgeld hesabında tutun.",
      ],
    });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      generatedAtFormattedDe: formatDateDe(now),
      score: {
        schufaPercent,
        schufaPoints,
        maxPoints: 900,
        composite100: Math.round(composite100),
        ratingClass,
        ratingLabelDe,
        ratingLabelTr,
        riskLevel,
      },
      subScores: [
        {
          key: "PAYMENT_HISTORY",
          labelTr: "Ödeme Disiplini & Faturalar",
          labelDe: "Zahlungsverhalten",
          weightPercent: 30,
          score: paymentScore,
          status:
            paymentScore >= 90
              ? "EXCELLENT"
              : paymentScore >= 75
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "CASHFLOW_SAVINGS",
          labelTr: "Nakit Akışı & Tasarruf Oranı",
          labelDe: "Cashflow & Sparquote",
          weightPercent: 25,
          score: cashflowScore,
          status:
            cashflowScore >= 85
              ? "EXCELLENT"
              : cashflowScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "CONTRACT_LOAD",
          labelTr: "Sabit Sözleşme & Abonelik Yükü",
          labelDe: "Fixkosten & Verträge",
          weightPercent: 20,
          score: contractScore,
          status:
            contractScore >= 85
              ? "EXCELLENT"
              : contractScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "WEALTH_OPTIMIZATION",
          labelTr: "Birikim Hedefleri & Optimizasyon",
          labelDe: "Vermögensaufbau",
          weightPercent: 15,
          score: optimizationScore,
          status:
            optimizationScore >= 85
              ? "EXCELLENT"
              : optimizationScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "ENERGY_SMART_HOME",
          labelTr: "Ev Enerji & Isınma Verimliliği",
          labelDe: "Energieeffizienz (HA)",
          weightPercent: 10,
          score: energyScore,
          status:
            energyScore >= 85
              ? "EXCELLENT"
              : energyScore >= 70
                ? "GOOD"
                : "WARNING",
        },
      ],
      metrics: {
        monthlyIncomeCents,
        monthlyIncomeFormattedDe: formatEurCents(monthlyIncomeCents, "de"),
        monthlyTxExpenseCents,
        monthlyTxExpenseFormattedDe: formatEurCents(
          monthlyTxExpenseCents,
          "de"
        ),
        monthlyContractLoadCents,
        monthlyContractLoadFormattedDe: formatEurCents(
          monthlyContractLoadCents,
          "de"
        ),
        monthlyEnergyCents,
        monthlyEnergyFormattedDe: formatEurCents(monthlyEnergyCents, "de"),
        totalMonthlyOutflowCents,
        totalMonthlyOutflowFormattedDe: formatEurCents(
          totalMonthlyOutflowCents,
          "de"
        ),
        netMonthlyCashflowCents,
        netMonthlyCashflowFormattedDe: formatEurCents(
          netMonthlyCashflowCents,
          "de"
        ),
        savingsRatePercent,
        fixedCostRatioPercent,
        activeContractsCount: activeContracts.length,
        overdueInvoicesCount: overdueInvoices.length,
        unpaidInvoicesCount: unpaidInvoices.length,
        energyConnected,
      },
      positiveFactors,
      negativeFactors,
      recommendations,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Finansal sağlık skoru hesaplanırken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
