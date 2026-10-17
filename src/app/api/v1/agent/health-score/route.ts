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
    | "INCOME_EXPENSE_BALANCE"
    | "SAVINGS_RATE"
    | "FIXED_COSTS"
    | "VARIABLE_SPENDING"
    | "ENERGY_OPTIMIZATION";
  title: string;
  description: string;
  impactPoints: number;
  impactPercent: number;
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
      adviceList,
      haConfig,
      haPlugin,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: actor.userId },
        include: { category: true },
        orderBy: { transactionDate: "desc" },
        take: 300,
      }),
      prisma.contract.findMany({
        where: { userId: actor.userId, status: "ACTIVE", archivedAt: null },
        orderBy: { amountCents: "desc" },
      }),
      prisma.agentAdvice.findMany({
        where: { userId: actor.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.homeAssistantConfig.findUnique({ where: { id: "singleton" } }),
      prisma.pluginIntegration.findFirst({ where: { slug: "home-assistant" } }),
    ]);

    // 1. Monthly Income & Expenses (use current month, or average of recorded months if current month has no entries yet)
    const currentMonthTx = allTransactions.filter((t: any) => {
      const d = new Date(t.transactionDate);
      return d >= monthStart && d <= monthEnd;
    });

    const incomePool =
      currentMonthTx.some((t: any) => t.type === "INCOME")
        ? currentMonthTx.filter((t: any) => t.type === "INCOME")
        : allTransactions.filter((t: any) => t.type === "INCOME");

    const incomeMonthsCount = Math.max(
      1,
      new Set(
        incomePool.map((t: any) => {
          const d = new Date(t.transactionDate);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        })
      ).size
    );

    const expensePool =
      currentMonthTx.some((t: any) => t.type === "EXPENSE")
        ? currentMonthTx.filter((t: any) => t.type === "EXPENSE")
        : allTransactions.filter((t: any) => t.type === "EXPENSE");

    const expenseMonthsCount = Math.max(
      1,
      new Set(
        expensePool.map((t: any) => {
          const d = new Date(t.transactionDate);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        })
      ).size
    );

    const monthlyIncomeCents = Math.round(
      sumCents(incomePool.map((t: any) => Number(t.amountCents ?? 0))) /
        incomeMonthsCount
    );

    const monthlyVariableExpenseCents = Math.round(
      sumCents(expensePool.map((t: any) => Number(t.amountCents ?? 0))) /
        expenseMonthsCount
    );

    // Group variable expenses by category to find top spending category
    const categoryTotals = new Map<string, number>();
    for (const tx of expensePool) {
      const cat =
        (typeof tx.category === "object" && tx.category !== null
          ? tx.category.nameTr || tx.category.nameDe
          : typeof tx.category === "string"
          ? tx.category
          : null) || "Genel Harcama";
      const monthlyShare = Math.round(
        Number(tx.amountCents ?? 0) / expenseMonthsCount
      );
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + monthlyShare);
    }
    const sortedExpenseCategories = Array.from(categoryTotals.entries())
      .map(([category, amountCents]) => ({
        category,
        amountCents,
        amountFormattedDe: formatEurCents(amountCents, "de"),
      }))
      .sort((a, b) => b.amountCents - a.amountCents);

    const topExpenseCategory = sortedExpenseCategories[0] ?? null;

    // 2. Fixed Contracts Monthly Load
    const monthlyContractLoadCents = sumCents(
      activeContracts.map((c: any) =>
        calculateMonthlyEquivalentCents(
          Number(c.amountCents ?? 0),
          c.billingFrequency
        )
      )
    );

    // 3. Home Assistant Energy Metrics (live monthly heating + hot water cost)
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
          ],
          timeoutMs: 3500,
        });
        if (haRes.ok) {
          energyConnected = true;
          for (const s of haRes.sensors) {
            if (s.isAvailable && s.numericValue !== null) {
              monthlyHeatingAndWaterEur += s.numericValue;
            }
          }
        }
      } catch {}
    }

    const monthlyEnergyCents = Math.round(monthlyHeatingAndWaterEur * 100);

    // 4. Total Monthly Outflow (no double-counting)
    // Bank transactions already include rent, utilities, subscriptions, and daily expenses.
    // Adding monthlyContractLoadCents on top would count fixed commitments twice.
    // Real monthly outflow is the actual transaction expenses (or the known contract obligations if higher).
    const totalMonthlyExpenseCents =
      monthlyVariableExpenseCents > 0
        ? Math.max(monthlyVariableExpenseCents, monthlyContractLoadCents)
        : monthlyContractLoadCents;

    // Discretionary variable spending (expenses beyond fixed contractual obligations)
    const discretionaryExpenseCents = Math.max(
      0,
      totalMonthlyExpenseCents - monthlyContractLoadCents
    );

    const netMonthlyCashflowCents =
      monthlyIncomeCents - totalMonthlyExpenseCents;

    // Ratios (% of monthly income)
    const savingsRatePercent =
      monthlyIncomeCents > 0
        ? Math.round((netMonthlyCashflowCents * 1000) / monthlyIncomeCents) / 10
        : 0;

    const fixedCostRatioPercent =
      monthlyIncomeCents > 0
        ? Math.round((monthlyContractLoadCents * 1000) / monthlyIncomeCents) /
          10
        : totalMonthlyExpenseCents > 0
          ? Math.round(
              (monthlyContractLoadCents * 1000) / totalMonthlyExpenseCents
            ) / 10
          : 0;

    const variableCostRatioPercent =
      monthlyIncomeCents > 0
        ? Math.round(
            (discretionaryExpenseCents * 1000) / monthlyIncomeCents
          ) / 10
        : totalMonthlyExpenseCents > 0
          ? Math.round(
              (discretionaryExpenseCents * 1000) / totalMonthlyExpenseCents
            ) / 10
          : 0;

    const totalExpenseToIncomePercent =
      monthlyIncomeCents > 0
        ? Math.round((totalMonthlyExpenseCents * 1000) / monthlyIncomeCents) /
          10
        : totalMonthlyExpenseCents > 0
          ? 100
          : 0;

    // 5. Expiring contracts & Savings Advice
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringSoonContracts = activeContracts.filter((c: any) => {
      if (!c.cancellationDeadline) return false;
      const d = new Date(c.cancellationDeadline);
      return d >= now && d <= sixtyDaysFromNow;
    });

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
    // 5 MONTHLY FINANCIAL HEALTH SUB-SCORES (0..100, 100% Income/Expense Driven)
    // =========================================================================

    // 1. Gelir / Gider Dengesi & Net Nakit Akışı (Weight: 35%)
    let balanceScore = 75;
    if (monthlyIncomeCents === 0 && totalMonthlyExpenseCents === 0) {
      balanceScore = 70;
    } else if (monthlyIncomeCents === 0 && totalMonthlyExpenseCents > 0) {
      balanceScore = 42;
    } else if (totalExpenseToIncomePercent <= 65) {
      balanceScore = 98;
    } else if (totalExpenseToIncomePercent <= 80) {
      balanceScore = 90;
    } else if (totalExpenseToIncomePercent <= 92) {
      balanceScore = 78;
    } else if (totalExpenseToIncomePercent <= 100) {
      balanceScore = 64;
    } else {
      // Expenses exceed income
      balanceScore = Math.max(
        20,
        Math.round(60 - (totalExpenseToIncomePercent - 100) * 0.9)
      );
    }

    // 2. Aylık Tasarruf & Birikim Oranı - 50/30/20 Kuralı (Weight: 25%)
    let savingsScore = 72;
    if (monthlyIncomeCents > 0) {
      if (savingsRatePercent >= 25) savingsScore = 98;
      else if (savingsRatePercent >= 20) savingsScore = 93;
      else if (savingsRatePercent >= 12) savingsScore = 84;
      else if (savingsRatePercent >= 5) savingsScore = 72;
      else if (savingsRatePercent >= 0) savingsScore = 58;
      else savingsScore = 35;
    } else {
      savingsScore = 50;
    }

    // 3. Sabit Gider & Sözleşme Yükü Oranı (Weight: 20%)
    let fixedCostScore = 88;
    if (monthlyIncomeCents > 0) {
      if (fixedCostRatioPercent <= 30) fixedCostScore = 96;
      else if (fixedCostRatioPercent <= 45) fixedCostScore = 88;
      else if (fixedCostRatioPercent <= 55) fixedCostScore = 74;
      else fixedCostScore = 52;
    } else if (monthlyContractLoadCents > 80000) {
      fixedCostScore = 65;
    } else {
      fixedCostScore = 82;
    }

    // 4. Değişken Harcama & Tüketim Dengesi (Weight: 10%)
    let variableSpendingScore = 86;
    if (monthlyIncomeCents > 0) {
      if (variableCostRatioPercent <= 25) variableSpendingScore = 95;
      else if (variableCostRatioPercent <= 35) variableSpendingScore = 85;
      else if (variableCostRatioPercent <= 50) variableSpendingScore = 70;
      else variableSpendingScore = 50;
    }

    // 5. Enerji Verimliliği & Tasarruf Optimizasyonu (Weight: 10%)
    let optimizationScore = 80;
    if (energyConnected) optimizationScore += 8;
    if (appliedAdvice.length > 0) {
      optimizationScore += Math.min(12, appliedAdvice.length * 5);
    }
    if (monthlyHeatingAndWaterEur > 180) {
      optimizationScore -= 12;
    }
    optimizationScore = Math.max(40, Math.min(100, optimizationScore));

    // Weighted Composite Score (0..100)
    const composite100 =
      balanceScore * 0.35 +
      savingsScore * 0.25 +
      fixedCostScore * 0.2 +
      variableSpendingScore * 0.1 +
      optimizationScore * 0.1;

    // SCHUFA Basisscore style (50.0% to 99.8%)
    const schufaPercent =
      Math.round(
        Math.max(50, Math.min(99.8, 55 + composite100 * 0.445)) * 100
      ) / 100;

    // New SCHUFA Points style (100 to 900 points)
    const schufaPoints = Math.round(
      Math.max(100, Math.min(900, 100 + composite100 * 8))
    );

    let ratingClass = "A";
    let ratingLabelDe = "Sehr gute monatliche Finanzgesundheit";
    let ratingLabelTr = "Çok İyi Aylık Gelir-Gider Dengesi";
    let riskLevel: "VERY_LOW" | "LOW" | "MODERATE" | "ELEVATED" | "HIGH" =
      "LOW";

    if (schufaPercent >= 96.0) {
      ratingClass = "A+";
      ratingLabelDe = "Hervorragende Einnahmen-Ausgaben-Struktur";
      ratingLabelTr = "Mükemmel Aylık Finansal Sağlık (Yüksek Tasarruf Gücü)";
      riskLevel = "VERY_LOW";
    } else if (schufaPercent >= 92.5) {
      ratingClass = "A";
      ratingLabelDe = "Sehr gute monatliche Finanzgesundheit";
      ratingLabelTr = "Çok İyi Aylık Gelir-Gider Dengesi";
      riskLevel = "LOW";
    } else if (schufaPercent >= 87.5) {
      ratingClass = "B";
      ratingLabelDe = "Solide Haushaltsbilanz mit Sparpotenzial";
      ratingLabelTr = "Dengeli Aylık Bütçe (İyileştirme Fırsatları Mevcut)";
      riskLevel = "MODERATE";
    } else if (schufaPercent >= 80.0) {
      ratingClass = "C";
      ratingLabelDe = "Hohe Ausgabenquote — Optimierung empfohlen";
      ratingLabelTr = "Yüksek Gider Yükü — Harcama Optimizasyonu Önerilir";
      riskLevel = "ELEVATED";
    } else {
      ratingClass = "D";
      ratingLabelDe = "Monatliches Haushaltsdefizit";
      ratingLabelTr = "Aylık Gelir-Gider Açığı — Bütçe Dengelenmeli";
      riskLevel = "HIGH";
    }

    // =========================================================================
    // POSITIVE & NEGATIVE FACTORS (100% Monthly Income, Expense & Savings Focused)
    // =========================================================================
    const positiveFactors: ScoreFactor[] = [];
    const negativeFactors: ScoreFactor[] = [];

    // 1. Income vs Expense Cashflow Factor
    if (monthlyIncomeCents > 0 && netMonthlyCashflowCents > 0) {
      positiveFactors.push({
        id: "pos-monthly-surplus",
        type: "POSITIVE",
        category: "INCOME_EXPENSE_BALANCE",
        title: `Aylık Net Bütçe Fazlası (+${formatEurCents(netMonthlyCashflowCents, "de")}/Ay)`,
        description: `Aylık geliriniz (${formatEurCents(monthlyIncomeCents, "de")}), tüm sabit sözleşme ve değişken giderlerinizin (${formatEurCents(totalMonthlyExpenseCents, "de")}) üzerinde. Her ay net artı değer üretiyorsunuz.`,
        impactPoints: 45,
        impactPercent: 1.8,
        metricBadge: `Gelir: ${formatEurCents(monthlyIncomeCents, "de")} vs Gider: ${formatEurCents(totalMonthlyExpenseCents, "de")}`,
        actionLabel: "Gelir & Gider Özeti",
        actionUrl: "/finances",
      });
    } else if (monthlyIncomeCents === 0) {
      negativeFactors.push({
        id: "neg-no-income-recorded",
        type: "NEGATIVE",
        category: "INCOME_EXPENSE_BALANCE",
        title: "Aylık Gelir Kaydı Girilmemiş (Gelir/Gider Oranı Hesaplanamıyor)",
        description:
          "Giderleriniz ve sözleşmeleriniz kayıtlı ancak aylık düzenli geliriniz (Maaş, Ek Gelir vb.) girilmediği için aylık karşılama oranı düşük görünüyor. Gelirinizi eklediğinizde skorunuz anında yükselecektir.",
        impactPoints: -35,
        impactPercent: -1.5,
        metricBadge: "Aylık Gelir: 0,00 €",
        actionLabel: "Gelir Ekle",
        actionUrl: "/income",
      });
    } else if (netMonthlyCashflowCents < 0) {
      negativeFactors.push({
        id: "neg-monthly-deficit",
        type: "NEGATIVE",
        category: "INCOME_EXPENSE_BALANCE",
        title: `Aylık Bütçe Açığı (${formatEurCents(netMonthlyCashflowCents, "de")}/Ay)`,
        description: `Aylık toplam giderleriniz (${formatEurCents(totalMonthlyExpenseCents, "de")}), aylık gelirinizi (${formatEurCents(monthlyIncomeCents, "de")}) aşıyor. Değişken giderleri veya sabit sözleşmeleri azaltmak skorunuzu hızla toparlar.`,
        impactPoints: -40,
        impactPercent: -1.7,
        metricBadge: `Gider Oranı: %${totalExpenseToIncomePercent.toFixed(1)}`,
        actionLabel: "Giderleri İncele",
        actionUrl: "/expenses",
      });
    }

    // 2. Savings Rate Factor (50/30/20 Rule)
    if (monthlyIncomeCents > 0 && savingsRatePercent >= 20) {
      positiveFactors.push({
        id: "pos-strong-savings-rate",
        type: "POSITIVE",
        category: "SAVINGS_RATE",
        title: `Güçlü Aylık Tasarruf Oranı (%${savingsRatePercent.toFixed(1)})`,
        description:
          "50/30/20 finansal sağlık kuralındaki %20 ideal tasarruf hedefini yakaladınız veya aştınız. Bu oran uzun vadeli servet birikimi için en güçlü göstergedir.",
        impactPoints: 30,
        impactPercent: 1.2,
        metricBadge: `Hedef: >=%20 • Siz: %${savingsRatePercent.toFixed(1)}`,
        actionLabel: "Birikim Hedefleri",
        actionUrl: "/advisor",
      });
    } else if (monthlyIncomeCents > 0 && savingsRatePercent >= 0 && savingsRatePercent < 15) {
      negativeFactors.push({
        id: "neg-low-savings-rate",
        type: "NEGATIVE",
        category: "SAVINGS_RATE",
        title: `Düşük Aylık Tasarruf Marjı (%${savingsRatePercent.toFixed(1)})`,
        description: `Gelirinizin sadece %${savingsRatePercent.toFixed(1)}'i ay sonunda elinizde kalıyor. İdeal finansal sağlık için bu oranı en az %20 seviyesine çıkarmak önerilir.`,
        impactPoints: -18,
        impactPercent: -0.7,
        metricBadge: `Mevcut: %${savingsRatePercent.toFixed(1)} (Hedef: %20)`,
        actionLabel: "Tasarruf Planı",
        actionUrl: "/advisor",
      });
    }

    // 3. Fixed Cost / Contract Ratio Factor
    if (monthlyIncomeCents > 0 && fixedCostRatioPercent <= 40) {
      positiveFactors.push({
        id: "pos-healthy-fixed-costs",
        type: "POSITIVE",
        category: "FIXED_COSTS",
        title: `Sağlıklı Sabit Sözleşme Yükü (%${fixedCostRatioPercent.toFixed(1)})`,
        description: `${activeContracts.length} aktif sözleşmenizin aylık toplamı (${formatEurCents(monthlyContractLoadCents, "de")}) gelirinizin %40'ının altında. Bütçe esnekliğiniz oldukça yüksek.`,
        impactPoints: 25,
        impactPercent: 1.0,
        metricBadge: `${formatEurCents(monthlyContractLoadCents, "de")} / Ay Sabit Yük`,
        actionLabel: "Sözleşmeler",
        actionUrl: "/contracts",
      });
    } else if (monthlyContractLoadCents > 0 && (fixedCostRatioPercent > 45 || monthlyIncomeCents === 0)) {
      negativeFactors.push({
        id: "neg-high-fixed-costs",
        type: "NEGATIVE",
        category: "FIXED_COSTS",
        title: `Yüksek Aylık Sabit Sözleşme Gideri (${formatEurCents(monthlyContractLoadCents, "de")}/Ay)`,
        description: `${activeContracts.length} adet aktif sözleşme her ay otomatik olarak ${formatEurCents(monthlyContractLoadCents, "de")} sabit gider oluşturuyor. Tarifeleri yenileyerek bu sabit yükü düşürebilirsiniz.`,
        impactPoints: -16,
        impactPercent: -0.6,
        metricBadge: `${activeContracts.length} Sözleşme • ${formatEurCents(monthlyContractLoadCents * 12, "de")}/Yıl`,
        actionLabel: "Sözleşmeleri Optimize Et",
        actionUrl: "/contracts",
      });
    }

    // 4. Top Variable Expense Category Factor
    if (topExpenseCategory && topExpenseCategory.amountCents > 0) {
      if (monthlyIncomeCents > 0 && variableCostRatioPercent <= 30) {
        positiveFactors.push({
          id: "pos-controlled-variable-spending",
          type: "POSITIVE",
          category: "VARIABLE_SPENDING",
          title: `Kontrollü Değişken Harcamalar (%${variableCostRatioPercent.toFixed(1)})`,
          description: `Aylık değişken giderleriniz (${formatEurCents(monthlyVariableExpenseCents, "de")}) 50/30/20 kuralındaki %30 sınırının içinde kalıyor.`,
          impactPoints: 18,
          impactPercent: 0.7,
          metricBadge: `${formatEurCents(monthlyVariableExpenseCents, "de")} / Ay`,
          actionLabel: "Gider Analizi",
          actionUrl: "/expenses",
        });
      } else {
        negativeFactors.push({
          id: "neg-top-expense-category",
          type: "NEGATIVE",
          category: "VARIABLE_SPENDING",
          title: `En Yüksek Harcama Kalemi: "${topExpenseCategory.category}" (${topExpenseCategory.amountFormattedDe}/Ay)`,
          description: `Aylık değişken giderleriniz içinde en büyük payı "${topExpenseCategory.category}" alıyor. Bu kategoride %15 bütçe limiti belirlemek aylık nakit akışınızı rahatlatır.`,
          impactPoints: -12,
          impactPercent: -0.5,
          metricBadge: `${topExpenseCategory.amountFormattedDe} / Ay`,
          actionLabel: "Gider Detayları",
          actionUrl: "/expenses",
        });
      }
    }

    // 5. Home Assistant Live Energy Cost Factor
    if (energyConnected) {
      positiveFactors.push({
        id: "pos-ha-live-monitoring",
        type: "POSITIVE",
        category: "ENERGY_OPTIMIZATION",
        title: `Canlı Ev Enerji & Isınma Maliyeti Takibi (${formatEurCents(monthlyEnergyCents, "de")}/Ay)`,
        description:
          "Home Assistant üzerinden Viessmann ısınma ve sıcak su tüketiminiz anlık Euro bazında takip ediliyor; yıl sonu yüksek fatura sürprizi önleniyor.",
        impactPoints: 16,
        impactPercent: 0.6,
        metricBadge: `Bu Ay: ${formatEurCents(monthlyEnergyCents, "de")}`,
        actionLabel: "Enerji Paneli",
        actionUrl: "/energy",
      });

      if (monthlyHeatingAndWaterEur > 150) {
        negativeFactors.push({
          id: "neg-high-energy-cost",
          type: "NEGATIVE",
          category: "ENERGY_OPTIMIZATION",
          title: `Yüksek Aylık Isınma & Sıcak Su Gideri (${formatEurCents(monthlyEnergyCents, "de")}/Ay)`,
          description:
            "Bu ayki kalorifer ve sıcak su doğalgaz maliyetiniz aylık giderlerinizi yukarı çekiyor. Gece sıcaklık düşürme programı ile %12-%15 tasarruf mümkündür.",
          impactPoints: -10,
          impactPercent: -0.4,
          metricBadge: `${formatEurCents(monthlyEnergyCents, "de")} / Ay`,
          actionLabel: "Enerji Paneli",
          actionUrl: "/energy",
        });
      }
    }

    // 6. Applied & Open Savings Potential
    if (appliedAdvice.length > 0) {
      positiveFactors.push({
        id: "pos-realized-savings",
        type: "POSITIVE",
        category: "SAVINGS_RATE",
        title: `Uygulanan Tasarruf Adımlarıyla Aylık +${formatEurCents(realizedMonthlySavingsCents, "de")} Kazanç`,
        description: `${appliedAdvice.length} adet tasarruf önerisini hayata geçirerek yıllık ${formatEurCents(realizedMonthlySavingsCents * 12, "de")} kalıcı bütçe iyileştirmesi sağladınız.`,
        impactPoints: 20,
        impactPercent: 0.8,
        metricBadge: `+${formatEurCents(realizedMonthlySavingsCents * 12, "de")} / Yıl`,
        actionLabel: "Tasarruf Paneli",
        actionUrl: "/advisor",
      });
    }

    if (potentialMonthlySavingsCents > 0) {
      negativeFactors.push({
        id: "neg-untapped-savings",
        type: "NEGATIVE",
        category: "SAVINGS_RATE",
        title: `Her Ay Masada Kalan ${formatEurCents(potentialMonthlySavingsCents, "de")} Tasarruf Potansiyeli`,
        description: `Henüz uygulanmamış ${openAdvice.length} adet tasarruf önerisi nedeniyle yılda ${formatEurCents(potentialMonthlySavingsCents * 12, "de")} fazladan gider oluşuyor.`,
        impactPoints: -12,
        impactPercent: -0.5,
        metricBadge: `${formatEurCents(potentialMonthlySavingsCents * 12, "de")} / Yıl Fırsat`,
        actionLabel: "Tavsiyeleri Uygula",
        actionUrl: "/advisor",
      });
    }

    if (expiringSoonContracts.length > 0) {
      negativeFactors.push({
        id: "neg-expiring-contracts",
        type: "NEGATIVE",
        category: "FIXED_COSTS",
        title: `${expiringSoonContracts.length} Sözleşmenin Fesih Süresi Yaklaşıyor`,
        description: `${expiringSoonContracts.map((c: any) => c.title || c.provider || "Sözleşme").join(", ")} sözleşmelerinde daha uygun tarifeye geçerek aylık sabit giderinizi düşürebilirsiniz.`,
        impactPoints: -10,
        impactPercent: -0.4,
        metricBadge: `${expiringSoonContracts.length} Sözleşme`,
        actionLabel: "Sözleşmeleri Gör",
        actionUrl: "/contracts",
      });
    }

    // =========================================================================
    // ACTIONABLE MONTHLY INCOME/EXPENSE IMPROVEMENT RECOMMENDATIONS
    // =========================================================================
    const recommendations: ScoreRecommendation[] = [];

    if (monthlyIncomeCents === 0) {
      recommendations.push({
        id: "rec-add-monthly-income",
        title: "Aylık Düzenli Gelirlerinizi (Maaş / Kira / Ek Gelir) Sisteme Girin",
        description:
          "Gelir-gider dengenizin, tasarruf oranınızın ve 50/30/20 bütçe kuralının tam doğrulukla hesaplanması için aylık gelir kalemlerinizi ekleyin.",
        category: "BUDGET",
        priority: "CRITICAL",
        potentialScoreGainPoints: 35,
        potentialScoreGainPercent: 1.5,
        estimatedMonthlySavingsCents: 25000,
        estimatedMonthlySavingsFormattedDe: "Tam Bütçe Görünürlüğü",
        estimatedYearlySavingsFormattedDe: "A+ Skor Seviyesi",
        actionUrl: "/income",
        actionSteps: [
          "Gelirler (/income) sayfasına gidin.",
          "Aylık net maaş ve varsa diğer düzenli gelirlerinizi kaydedin.",
          "Gelir eklendiği anda aylık tasarruf oranınız ve skorunuz otomatik güncellenir.",
        ],
      });
    }

    if (activeContracts.length > 0) {
      const topContract = activeContracts[0];
      const topMonthly = calculateMonthlyEquivalentCents(
        Number(topContract.amountCents ?? 0),
        topContract.billingFrequency
      );
      const estSave = Math.max(1500, Math.round(topMonthly * 0.18));
      const contractLabel =
        topContract.title || topContract.provider || "En Yüksek Sabit Sözleşme";
      const providerLabel =
        topContract.provider && topContract.title ? ` (${topContract.provider})` : "";
      recommendations.push({
        id: "rec-optimize-contracts",
        title: `Sabit Sözleşme Yükünü Azaltın: "${contractLabel}"${providerLabel}`,
        description: `Aylık ${formatEurCents(topMonthly, "de")} olan en büyük sabit sözleşme giderinizi alternatif tarife veya sadakat indirimiyle %18 düşürerek aylık sabit gider oranınızı iyileştirin.`,
        category: "CONTRACT_OPTIMIZATION",
        priority: "HIGH",
        potentialScoreGainPoints: 20,
        potentialScoreGainPercent: 0.85,
        estimatedMonthlySavingsCents: estSave,
        estimatedMonthlySavingsFormattedDe: formatEurCents(estSave, "de"),
        estimatedYearlySavingsFormattedDe: formatEurCents(estSave * 12, "de"),
        actionUrl: "/contracts",
        actionSteps: [
          `${topContract.provider || topContract.title || "Mevcut"} sözleşmesini güncel kampanyalarla karşılaştırın.`,
          "Kullanılmayan ek paket veya abonelikleri iptal ederek aylık sabit gideri düşürün.",
        ],
      });
    }

    if (monthlyVariableExpenseCents > 0) {
      const targetCutCents = Math.max(
        3000,
        Math.round(monthlyVariableExpenseCents * 0.15)
      );
      recommendations.push({
        id: "rec-reduce-variable-expenses",
        title: topExpenseCategory
          ? `"${topExpenseCategory.category}" ve Değişken Giderlerde %15 Bütçe Tavanı Uygulayın`
          : "Aylık Değişken Harcamalarda %15 Tasarruf Kuralı Uygulayın",
        description: `Aylık ${formatEurCents(monthlyVariableExpenseCents, "de")} olan değişken harcamalarınızı %15 kısarak her ay doğrudan ${formatEurCents(targetCutCents, "de")} ek net birikim yaratabilirsiniz.`,
        category: "BUDGET",
        priority: "HIGH",
        potentialScoreGainPoints: 18,
        potentialScoreGainPercent: 0.75,
        estimatedMonthlySavingsCents: targetCutCents,
        estimatedMonthlySavingsFormattedDe: formatEurCents(targetCutCents, "de"),
        estimatedYearlySavingsFormattedDe: formatEurCents(
          targetCutCents * 12,
          "de"
        ),
        actionUrl: "/expenses",
        actionSteps: [
          "Giderler (/expenses) sayfasından en yüksek 3 harcama kalemini inceleyin.",
          "Dürtüsel alışveriş ve dışarıda yeme giderleri için haftalık limit belirleyin.",
        ],
      });
    }

    if (energyConnected && monthlyHeatingAndWaterEur > 30) {
      const saveCents = Math.max(
        1800,
        Math.round(monthlyHeatingAndWaterEur * 100 * 0.14)
      );
      recommendations.push({
        id: "rec-heating-optimization",
        title: "Isınma & Sıcak Su Giderini Optimize Edin (Viessmann Vitodens)",
        description: `Bu ay ${formatEurCents(monthlyEnergyCents, "de")} olan ısınma + sıcak su maliyetinizi gece modunu 18.5 °C'ye çekerek ve sıcak su saatlerini optimize ederek %14 düşürün.`,
        category: "SAVINGS",
        priority: "MEDIUM",
        potentialScoreGainPoints: 14,
        potentialScoreGainPercent: 0.55,
        estimatedMonthlySavingsCents: saveCents,
        estimatedMonthlySavingsFormattedDe: formatEurCents(saveCents, "de"),
        estimatedYearlySavingsFormattedDe: formatEurCents(saveCents * 12, "de"),
        actionUrl: "/energy",
        actionSteps: [
          "Gece 23:00–06:00 arası hedef oda sıcaklığını 1–1,5 °C düşürün.",
          "Oda nem oranını %50–%60 aralığında tutarak ısı kaybını azaltın.",
        ],
      });
    }

    const suggestedReserveMonthlyCents =
      monthlyIncomeCents > 0
        ? Math.max(15000, Math.round(monthlyIncomeCents * 0.2))
        : 20000;
    recommendations.push({
      id: "rec-50-30-20-rule",
      title: "50 / 30 / 20 Altın Bütçe Kuralı ile Otomatik %20 Birikim Ayırın",
      description:
        "Gelirinizin %50'sini sabit giderlere, %30'unu yaşam/değişken giderlere, %20'sini ise maaş yatar yatmaz otomatik birikim/yatırım hesabına yönlendirin.",
      category: "WEALTH",
      priority: "HIGH",
      potentialScoreGainPoints: 25,
      potentialScoreGainPercent: 1.0,
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
        "Maaş günü gelirinizin %20'sini ayrı bir birikim (Tagesgeld / ETF) hesabına aktarın.",
        "Sabit sözleşme giderlerinizi toplam gelirin %40'ının altında tutun.",
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
          key: "INCOME_EXPENSE_BALANCE",
          labelTr: "Gelir / Gider Dengesi & Net Nakit Akışı",
          labelDe: "Einnahmen-Ausgaben-Bilanz",
          weightPercent: 35,
          score: balanceScore,
          status:
            balanceScore >= 85
              ? "EXCELLENT"
              : balanceScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "SAVINGS_RATE",
          labelTr: "Aylık Tasarruf & Birikim Oranı (Hedef %20)",
          labelDe: "Monatliche Sparquote",
          weightPercent: 25,
          score: savingsScore,
          status:
            savingsScore >= 85
              ? "EXCELLENT"
              : savingsScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "FIXED_COSTS",
          labelTr: "Sabit Gider & Sözleşme Yükü (Hedef <%40)",
          labelDe: "Fixkostenquote",
          weightPercent: 20,
          score: fixedCostScore,
          status:
            fixedCostScore >= 85
              ? "EXCELLENT"
              : fixedCostScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "VARIABLE_SPENDING",
          labelTr: "Değişken Harcama & Tüketim Kontrolü",
          labelDe: "Variable Ausgaben",
          weightPercent: 10,
          score: variableSpendingScore,
          status:
            variableSpendingScore >= 85
              ? "EXCELLENT"
              : variableSpendingScore >= 70
                ? "GOOD"
                : "WARNING",
        },
        {
          key: "ENERGY_OPTIMIZATION",
          labelTr: "Ev Enerji Maliyeti & Tasarruf Optimizasyonu",
          labelDe: "Energie & Optimierung",
          weightPercent: 10,
          score: optimizationScore,
          status:
            optimizationScore >= 85
              ? "EXCELLENT"
              : optimizationScore >= 70
                ? "GOOD"
                : "WARNING",
        },
      ],
      metrics: {
        monthlyIncomeCents,
        monthlyIncomeFormattedDe: formatEurCents(monthlyIncomeCents, "de"),
        monthlyTxExpenseCents: monthlyVariableExpenseCents,
        monthlyTxExpenseFormattedDe: formatEurCents(
          monthlyVariableExpenseCents,
          "de"
        ),
        monthlyContractLoadCents,
        monthlyContractLoadFormattedDe: formatEurCents(
          monthlyContractLoadCents,
          "de"
        ),
        discretionaryExpenseCents,
        discretionaryExpenseFormattedDe: formatEurCents(
          discretionaryExpenseCents,
          "de"
        ),
        monthlyEnergyCents,
        monthlyEnergyFormattedDe: formatEurCents(monthlyEnergyCents, "de"),
        totalMonthlyOutflowCents: totalMonthlyExpenseCents,
        totalMonthlyOutflowFormattedDe: formatEurCents(
          totalMonthlyExpenseCents,
          "de"
        ),
        netMonthlyCashflowCents,
        netMonthlyCashflowFormattedDe: formatEurCents(
          netMonthlyCashflowCents,
          "de"
        ),
        savingsRatePercent,
        fixedCostRatioPercent,
        variableCostRatioPercent,
        totalExpenseToIncomePercent,
        activeContractsCount: activeContracts.length,
        energyConnected,
        topExpenseCategories: sortedExpenseCategories.slice(0, 5),
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
