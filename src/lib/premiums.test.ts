import { describe, expect, it } from "vitest";
import { calculatePremium, netFromGross, suggestedCommission } from "@/lib/premiums";
import { round2 } from "@/lib/money";

describe("prim hesaplama", () => {
  it("kasko poliçesinde gider vergisi %5 ve brüt = net + vergi", () => {
    const result = calculatePremium({ profile: "kasko", netPremium: 15340.66 });
    expect(result.giderVergisi).toBe(767.03);
    expect(result.grossPremium).toBe(16107.69);
    expect(result.ghk).toBe(0);
    expect(result.thgf).toBe(0);
    expect(result.ysv).toBe(0);
  });

  it("trafik poliçesinde GHK %2, THGF %5, gider vergisi %5 uygular", () => {
    const result = calculatePremium({ profile: "trafik", netPremium: 8555.72 });
    expect(result.ghk).toBe(171.11);
    expect(result.thgf).toBe(427.79);
    expect(result.giderVergisi).toBe(427.79);
    expect(result.grossPremium).toBe(9582.41);
  });

  it("trafikte ek teminat varsa GHK ve THGF yalnızca ZMSS neti üzerinden hesaplanır", () => {
    const result = calculatePremium({
      profile: "trafik",
      netPremium: 5804.81,
      compulsoryNet: 5199,
    });
    expect(result.ghk).toBe(103.98);
    expect(result.thgf).toBe(259.95);
    expect(result.giderVergisi).toBe(290.24);
    expect(result.grossPremium).toBe(6458.98);
  });

  it("konut poliçesinde gider vergisi %5 ve YSV yangın priminin %10'u", () => {
    const result = calculatePremium({
      profile: "konut",
      netPremium: 6445.2,
      firePremium: 48.3,
    });
    expect(result.giderVergisi).toBe(322.26);
    expect(result.ysv).toBe(4.83);
    expect(result.grossPremium).toBe(6772.29);
  });

  it("DASK ve TSS gibi muaf branşlarda net = brüt", () => {
    const result = calculatePremium({ profile: "exempt", netPremium: 1862.66 });
    expect(result.grossPremium).toBe(1862.66);
    expect(result.giderVergisi).toBe(0);
  });

  it("brütten neti geri hesaplar", () => {
    expect(netFromGross("kasko", 16107.69)).toBe(15340.66);
    expect(netFromGross("trafik", 9582.41)).toBe(8555.72);
  });

  it("komisyon oranını net prim üzerinden önerir", () => {
    expect(suggestedCommission(8555.72, 0.1)).toBe(855.57);
    expect(round2(2002.43 / 8009.73)).toBe(0.25);
  });
});
