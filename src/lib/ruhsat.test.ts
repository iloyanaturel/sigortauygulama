import { describe, expect, it } from "vitest";
import { isRuhsatDocument, parseRuhsatFromText } from "@/lib/ruhsat";
import { parseDocumentFromText } from "@/lib/document-parse";
import { plateKey } from "@/lib/text";
import { matchCustomer } from "@/lib/customers";
import { splitCommission } from "@/lib/commission";
import type { Customer } from "@/lib/types";

const RUHSAT = `
T.C.
TESCİL BELGESİ
PLAKA: 34 ABC 123
Adı Soyadı: AHMET YILMAZ
T.C. Kimlik No: 12345678901
Adres: Rami Mah. İstanbul
Belge Seri No: AB123456
Şasi No: VF1ABCDEF12345678
Motor No: K4M123456
Tescil Tarihi: 12/03/2024
`;

describe("ruhsat", () => {
  it("ruhsat belgesini poliçe sanmaz", () => {
    expect(isRuhsatDocument(RUHSAT)).toBe(true);
    expect(isRuhsatDocument("KARAYOLLARI MOTORLU ARAÇLAR ZORUNLU MALİ SORUMLULUK (TRAFİK) SİGORTA POLİÇESİ PLAKA NO 034 FAD585")).toBe(false);
  });

  it("sahip, plaka ve TCKN okur", () => {
    const parsed = parseRuhsatFromText(RUHSAT);
    expect(parsed.documentKind).toBe("ruhsat");
    expect(parsed.customerName).toMatch(/Ahmet Yılmaz/i);
    expect(parsed.nationalId).toBe("12345678901");
    expect(plateKey(parsed.plate)).toBe("34ABC123");
    expect(parsed.documentSerial).toMatch(/AB123456/);
  });

  it("genel ayrıştırıcı ruhsatı seçer", () => {
    expect(parseDocumentFromText(RUHSAT).documentKind).toBe("ruhsat");
  });
});

describe("müşteri eşleştirme", () => {
  it("TCKN veya plaka ile mevcut müşteriyi bulur", () => {
    const customers: Customer[] = [
      {
        id: "c1",
        createdAt: "",
        updatedAt: "",
        name: "Ahmet Yılmaz",
        nationalId: "12345678901",
        phone: "",
        birthDate: "",
        address: "",
        plates: ["34 ABC 123"],
        documentSerial: "",
        notes: "",
      },
    ];
    expect(matchCustomer(customers, { nationalId: "12345678901" })?.id).toBe("c1");
    expect(matchCustomer(customers, { plate: "034 ABC 123" })?.id).toBe("c1");
  });
});

describe("kişi bazlı tali hakediş", () => {
  it("üretici kaydındaki oranı kullanır", () => {
    const split = splitCommission(100, "TAMER DİNÇ", { taliShareRate: 0.5, taliProducerNames: ["TAMER DİNÇ"], agencyName: "x", agencyProducerNames: [] }, [
      { id: "1", name: "TAMER DİNÇ", usageCount: 0, active: true, role: "tali", taliShareRate: 0.3 },
    ]);
    expect(split.producerCommission).toBe(30);
    expect(split.agencyCommission).toBe(70);
  });
});
