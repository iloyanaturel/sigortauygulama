import { describe, expect, it } from "vitest";
import { normalizeBranch, normalizePartaj, normalizeProducer, profileForBranch } from "@/lib/catalog";
import { parseTRNumber } from "@/lib/money";
import { parseWorkbook } from "@/lib/excel";
import * as XLSX from "xlsx";

describe("katalog normalizasyonu", () => {
  it("partaj şirket adlarını birleştirir", () => {
    expect(normalizePartaj("quıck")).toBe("QUICK");
    expect(normalizePartaj("HEPIYI SIGORTA A.S.")).toBe("HEPİYİ");
    expect(normalizePartaj("UNICO - OVİ")).toBe("UNICO-OVİ");
    expect(normalizePartaj("MAPHRE-OVİ")).toBe("MAPFRE-OVİ");
    expect(normalizePartaj("09.07.2027")).toBeNull();
    expect(normalizePartaj("23507.31")).toBeNull();
  });

  it("branş adlarını seçilebilir katalog adlarına çevirir", () => {
    expect(normalizeBranch("TRAFIK")).toBe("Trafik");
    expect(normalizeBranch("trafik")).toBe("Trafik");
    expect(normalizeBranch("GENİŞLETİLMİŞ KASKO")).toBe("Genişletilmiş Kasko");
    expect(normalizeBranch("DASK D.20")).toBe("DASK");
    expect(normalizeBranch("34956.92")).toBeNull();
    expect(profileForBranch("Trafik")).toBe("trafik");
    expect(profileForBranch("Konut")).toBe("konut");
    expect(profileForBranch("DASK")).toBe("exempt");
  });

  it("tali kişileri sadeleştirir", () => {
    expect(normalizeProducer("nurdan")).toBe("NURDAN");
    expect(normalizeProducer("ŞENOL YILDIRIM")).toBe("ŞENEL YILDIRIM");
    expect(normalizeProducer("TAMER")).toBe("TAMER DİNÇ");
  });
});

describe("excel içe aktarma", () => {
  it("standart aylık sayfayı poliçe kayıtlarına çevirir", () => {
    const aoa = [
      ["TARİH", "MÜŞTERİ ADI", "PARTAJ", "POLİÇE NO", "BRANŞ ADI", "PLAKA", "TC", "BELGE SERİ NO", "NET PRİM", "BRÜT PRİM", "KOMİSYON", "TALİ BİLGİLERİ"],
      [new Date(2026, 6, 7), "Hüseyin Sorkun", "SOMPO", "311000604989135", "TRAFİK", "34 HVA 23", "12345678901", "AB123", 8555.72, 9582.41, 855, "NURDAN"],
      [new Date(2026, 6, 4), "Veston Beyaz", "SOMPO", "333000029444914", "KASKO", "34 YYT 58", "", "", 15340.66, 16107.69, 2301, "NURDAN"],
      ["toplam", "", 100, "", "", "", "", "", 1, 1, 1, ""],
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "TEMMUZ 2026");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
    const parsed = parseWorkbook(buf);
    expect(parsed.policies).toHaveLength(2);
    expect(parsed.policies[0].policy.branch).toBe("Trafik");
    expect(parsed.policies[0].policy.partaj).toBe("SOMPO");
    expect(parsed.policies[0].policy.ghk).toBe(171.11);
    expect(parsed.policies[1].policy.branch).toBe("Kasko");
    expect(parsed.policies[1].policy.giderVergisi).toBe(767.03);
  });
});

describe("sayı ayrıştırma", () => {
  it("Türkçe ve Excel sayı formatlarını okur", () => {
    expect(parseTRNumber("15.340,66 TL")).toBe(15340.66);
    expect(parseTRNumber("8.526,03")).toBe(8526.03);
    expect(parseTRNumber(8555.72)).toBe(8555.72);
  });
});
