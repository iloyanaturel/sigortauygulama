import { round2 } from "@/lib/money";
import type { CalcProfile, PremiumBreakdown, PremiumLine } from "@/lib/types";

export const RATES = {
  giderVergisi: 0.05,
  ghk: 0.02,
  thgf: 0.05,
  ysv: 0.1,
} as const;

export type PremiumInput = {
  profile: CalcProfile;
  netPremium: number;
  compulsoryNet?: number | null;
  firePremium?: number | null;
  ysvAmount?: number | null;
  giderVergisiAmount?: number | null;
  ghkAmount?: number | null;
  thgfAmount?: number | null;
  grossAmount?: number | null;
  rates?: Partial<typeof RATES>;
};

function optionalAmount(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : round2(value);
}

function line(
  code: PremiumLine["code"],
  label: string,
  amount: number,
  rate: number | null,
): PremiumLine {
  return { code, label, amount: round2(amount), rate };
}

export function calculatePremium(input: PremiumInput): PremiumBreakdown {
  const rates = { ...RATES, ...input.rates };
  const net = round2(Number(input.netPremium) || 0);
  const profile = input.profile;

  if (profile === "exempt") {
    return {
      netPremium: net,
      compulsoryNet: net,
      firePremium: 0,
      ghk: 0,
      thgf: 0,
      giderVergisi: 0,
      ysv: 0,
      grossPremium: net,
      profile,
      lines: [
        line("net", "Net prim", net, null),
        line("brut", "Brüt prim", net, null),
      ],
    };
  }

  if (profile === "kasko" || profile === "custom") {
    const giderVergisi = optionalAmount(input.giderVergisiAmount) ?? round2(net * rates.giderVergisi);
    const gross = optionalAmount(input.grossAmount) ?? round2(net + giderVergisi);
    return {
      netPremium: net,
      compulsoryNet: net,
      firePremium: 0,
      ghk: 0,
      thgf: 0,
      giderVergisi,
      ysv: 0,
      grossPremium: gross,
      profile,
      lines: [
        line("net", "Net prim", net, null),
        line("giderVergisi", "Gider vergisi", giderVergisi, rates.giderVergisi),
        line("brut", "Brüt prim", gross, null),
      ],
    };
  }

  if (profile === "konut") {
    const fire = round2(Number(input.firePremium) || 0);
    const giderVergisi = optionalAmount(input.giderVergisiAmount) ?? round2(net * rates.giderVergisi);
    const ysv =
      input.ysvAmount !== null && input.ysvAmount !== undefined
        ? round2(input.ysvAmount)
        : round2(fire * rates.ysv);
    const gross = optionalAmount(input.grossAmount) ?? round2(net + giderVergisi + ysv);
    const lines: PremiumLine[] = [
      line("net", "Net prim", net, null),
      line("giderVergisi", "Gider vergisi", giderVergisi, rates.giderVergisi),
      line("ysv", "Y.S.V.", ysv, fire ? rates.ysv : null),
      line("brut", "Toplam brüt prim", gross, null),
    ];
    return {
      netPremium: net,
      compulsoryNet: net,
      firePremium: fire,
      ghk: 0,
      thgf: 0,
      giderVergisi,
      ysv,
      grossPremium: gross,
      profile,
      lines,
    };
  }

  const compulsory =
    input.compulsoryNet !== null && input.compulsoryNet !== undefined
      ? round2(input.compulsoryNet)
      : net;
  const ghk = optionalAmount(input.ghkAmount) ?? round2(compulsory * rates.ghk);
  const thgf = optionalAmount(input.thgfAmount) ?? round2(compulsory * rates.thgf);
  const giderVergisi = optionalAmount(input.giderVergisiAmount) ?? round2(net * rates.giderVergisi);
  const gross = optionalAmount(input.grossAmount) ?? round2(net + ghk + thgf + giderVergisi);

  return {
    netPremium: net,
    compulsoryNet: compulsory,
    firePremium: 0,
    ghk,
    thgf,
    giderVergisi,
    ysv: 0,
    grossPremium: gross,
    profile,
    lines: [
      line("net", "Toplam net prim", net, null),
      line("ghk", "G.H.K. payı", ghk, rates.ghk),
      line("giderVergisi", "Gider vergisi", giderVergisi, rates.giderVergisi),
      line("thgf", "T.H.G. fonu", thgf, rates.thgf),
      line("brut", "Brüt prim", gross, null),
    ],
  };
}

export function netFromGross(profile: CalcProfile, gross: number, input?: Partial<PremiumInput>): number {
  const rates = { ...RATES, ...input?.rates };
  const g = round2(gross);
  if (profile === "exempt") return g;
  if (profile === "kasko" || profile === "custom") {
    return round2(g / (1 + rates.giderVergisi));
  }
  if (profile === "konut") {
    const fire = round2(Number(input?.firePremium) || 0);
    const ysv =
      input?.ysvAmount !== null && input?.ysvAmount !== undefined
        ? round2(input.ysvAmount)
        : round2(fire * rates.ysv);
    return round2((g - ysv) / (1 + rates.giderVergisi));
  }
  const compulsoryRatio =
    input?.compulsoryNet && input?.netPremium
      ? input.compulsoryNet / input.netPremium
      : 1;
  const multiplier = 1 + rates.giderVergisi + compulsoryRatio * (rates.ghk + rates.thgf);
  return round2(g / multiplier);
}

export function suggestedCommission(netPremium: number, rate: number): number {
  return round2(netPremium * rate);
}
