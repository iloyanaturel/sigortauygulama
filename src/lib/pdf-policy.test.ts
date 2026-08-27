import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePolicyFromText } from "@/lib/pdf-policy";
import { splitCommission } from "@/lib/commission";
import { filterPolicies } from "@/lib/reports";
import { defaultCommissionForBranch } from "@/lib/catalog";
import { calculatePremium, suggestedCommission } from "@/lib/premiums";
import { round2 } from "@/lib/money";
import type { Policy } from "@/lib/types";

function sample(name: string): string {
  return readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");
}

describe("PDF poliçe okuma", () => {
  it("kasko poliçesinden müşteri, prim ve plakayı okur", () => {
    const parsed = parsePolicyFromText(sample("erdog_an_buyukzara_kasko_1cc9.txt"));
    expect(parsed.branch).toBe("Genişletilmiş Kasko");
    expect(parsed.partaj).toBe("QUICK");
    expect(parsed.customerName).toMatch(/Erdoğan/i);
    expect(parsed.policyNo).toBe("100000623811902");
    expect(parsed.plate.replace(/\s/g, "")).toBe("034GLS739");
    expect(parsed.netPremium).toBe(26782.18);
    expect(parsed.giderVergisi).toBe(1339.11);
    expect(parsed.grossPremium).toBe(28121.29);
    expect(parsed.issueDate).toBe("2026-08-24");
    expect(parsed.startDate).toBe("2026-08-24");
    expect(parsed.endDate).toBe("2027-08-24");
  });

  it("trafik poliçesinden GHK, THGF ve brüt primi okur", () => {
    const parsed = parsePolicyFromText(sample("SI_NEM_YAS_C_IN_TRAFIK_0926.txt"));
    expect(parsed.branch).toBe("Trafik");
    expect(parsed.partaj).toBe("QUICK");
    expect(parsed.customerName).toMatch(/Sinem/i);
    expect(parsed.policyNo).toBe("100000625299307");
    expect(parsed.plate.replace(/\s/g, "")).toBe("034FAD585");
    expect(parsed.netPremium).toBe(5804.81);
    expect(parsed.ghk).toBe(103.98);
    expect(parsed.giderVergisi).toBe(290.24);
    expect(parsed.thgf).toBe(259.96);
    expect(parsed.grossPremium).toBe(6458.99);
    expect(parsed.startDate).toBe("2026-09-06");
    expect(parsed.endDate).toBe("2027-09-06");
  });

  it("konut poliçesinde yazdırılan GV ve YSV tutarlarını korur", () => {
    const parsed = parsePolicyFromText(sample("SEHNAZ_CETINKAYA_KONUT_a09c.txt"));
    expect(parsed.branch).toBe("Konut");
    expect(parsed.partaj).toBe("SOMPO");
    expect(parsed.customerName).toMatch(/Şehnaz/i);
    expect(parsed.policyNo).toBe("110000006008964");
    expect(parsed.addressCode).toBe("2899347856");
    expect(parsed.netPremium).toBe(6445.2);
    expect(parsed.giderVergisi).toBe(321.36);
    expect(parsed.ysv).toBe(4.83);
    expect(parsed.grossPremium).toBe(6771.39);
    expect(parsed.startDate).toBe("2026-08-24");
    expect(parsed.endDate).toBe("2027-08-24");
  });

  it("DASK poliçesinde net = brüt primdir", () => {
    const parsed = parsePolicyFromText(sample("HACER_TANRITANIR_DASK_96f3.txt"));
    expect(parsed.branch).toBe("DASK");
    expect(parsed.partaj).toBe("SOMPO");
    expect(parsed.customerName).toMatch(/Hacer/i);
    expect(parsed.daskNo).toBe("89998195");
    expect(parsed.policyNo).toBe("117000004927788");
    expect(parsed.addressCode).toBe("5053165717");
    expect(parsed.netPremium).toBe(2081.16);
    expect(parsed.grossPremium).toBe(2081.16);
    expect(parsed.startDate).toBe("2026-08-25");
    expect(parsed.endDate).toBe("2027-08-25");
  });

  it("TSS poliçesinde net = brüt ve komisyon oranı %20'dir", () => {
    const parsed = parsePolicyFromText(sample("nurdan_bolaman_tss_5592.txt"));
    expect(parsed.branch).toBe("TSS");
    expect(parsed.partaj).toBe("SOMPO");
    expect(parsed.customerName).toMatch(/Nurdan/i);
    expect(parsed.policyNo).toBe("804000044266982");
    expect(parsed.netPremium).toBe(74218.87);
    expect(parsed.grossPremium).toBe(74218.87);
    expect(parsed.startDate).toBe("2026-08-17");
    expect(parsed.endDate).toBe("2027-08-17");
    expect(defaultCommissionForBranch("TSS")).toBe(0.2);
    expect(suggestedCommission(74218.87, 0.2)).toBe(14843.77);
  });
});

describe("tali komisyon paylaşımı", () => {
  it("taliye toplam komisyonun %50'sini verir", () => {
    const total = suggestedCommission(26782.18, 0.15);
    const tamer = splitCommission(total, "TAMER DİNÇ");
    expect(tamer.tali).toBe(true);
    expect(tamer.producerCommission + tamer.agencyCommission).toBe(total);
    expect(tamer.producerCommission).toBe(round2(total * 0.5));
    const agency = splitCommission(total, "NURDAN");
    expect(agency.tali).toBe(false);
    expect(agency.producerCommission).toBe(0);
    expect(agency.agencyCommission).toBe(total);
  });
});

describe("rapor filtreleri", () => {
  const policies = [
    { producer: "TAMER DİNÇ", branch: "Trafik", partaj: "QUICK", status: "aktif", issueDate: "2026-08-24" },
    { producer: "ŞENEL YILDIRIM", branch: "Kasko", partaj: "SOMPO", status: "aktif", issueDate: "2026-07-01" },
    { producer: "TAMER DİNÇ", branch: "DASK", partaj: "SOMPO", status: "iptal", issueDate: "2026-08-25" },
  ] as Policy[];

  it("talileri bağımsız süzebilir", () => {
    const onlyTamer = filterPolicies(policies, { producer: "TAMER DİNÇ", status: "all" });
    expect(onlyTamer).toHaveLength(2);
    const tamerActive = filterPolicies(policies, { producer: "TAMER DİNÇ", status: "aktif" });
    expect(tamerActive).toHaveLength(1);
    const sompoKasko = filterPolicies(policies, { partaj: "SOMPO", branch: "Kasko", status: "aktif" });
    expect(sompoKasko).toHaveLength(1);
  });
});

describe("yazdırılan prim satırları", () => {
  it("konut PDF'indeki gider vergisini hesap yerine basılı tutardan alır", () => {
    const result = calculatePremium({
      profile: "konut",
      netPremium: 6445.2,
      ysvAmount: 4.83,
      giderVergisiAmount: 321.36,
      grossAmount: 6771.39,
    });
    expect(result.giderVergisi).toBe(321.36);
    expect(result.ysv).toBe(4.83);
    expect(result.grossPremium).toBe(6771.39);
  });
});
