import { describe, expect, it } from "vitest";
import { isNotarySaleDocument, notaryPartyForMode, parseNotarySaleFromText } from "@/lib/notary-sale";
import { parseDocumentFromText } from "@/lib/document-parse";
import { extractTurkishPlate, plateKey } from "@/lib/text";

const NOTARY = `
T.C.
EYÜPSULTAN 3. NOTERLİĞİ
MOTORLU ARAÇ SATIŞ SÖZLEŞMESİ
Yevmiye No: 18452
Tarih: 27/08/2026

SATICI
Adı Soyadı: AHMET YILMAZ
T.C. Kimlik No: 12345678901
Adres: Rami Mah. İstanbul
Telefon: 5321112233

ALICI
Adı Soyadı: MEHMET DEMİR
T.C. Kimlik No: 10987654321
Adres: Beykoz İstanbul

ARAÇ BİLGİLERİ
Plaka: 34 ABC 123
Marka: RENAULT
Tipi: MEGANE
Model: 2020
Motor No: K4M123456
Şasi No: VF1ABCDEF12345678
Satış Bedeli: 450.000,00 TL
`;

describe("noter satış sözleşmesi", () => {
  it("belge türünü tanır", () => {
    expect(isNotarySaleDocument(NOTARY)).toBe(true);
    expect(isNotarySaleDocument("GENİŞLETİLMİŞ KASKO POLİÇESİ")).toBe(false);
  });

  it("satıcı, alıcı, plaka ve tarihi okur", () => {
    const parsed = parseNotarySaleFromText(NOTARY);
    expect(parsed.documentKind).toBe("notary-sale");
    expect(parsed.sellerName).toMatch(/Ahmet Yılmaz/i);
    expect(parsed.buyerName).toMatch(/Mehmet Demir/i);
    expect(parsed.customerName).toMatch(/Mehmet Demir/i);
    expect(plateKey(parsed.plate)).toBe("34ABC123");
    expect(parsed.issueDate).toBe("2026-08-27");
    expect(parsed.nationalId).toBe("10987654321");
    expect(parsed.notes).toMatch(/Noter satış/i);
  });

  it("OCR benzeri bitişik plakayı çözer", () => {
    expect(extractTurkishPlate("PLAKA 34ABC123 TESLIM")).toBe("34 ABC 123");
    expect(plateKey("034 ABC 123")).toBe("34ABC123");
  });

  it("genel belge ayrıştırıcı noter metnini poliçe sanmaz", () => {
    const parsed = parseDocumentFromText(NOTARY);
    expect(parsed.documentKind).toBe("notary-sale");
    expect(parsed.branch).toBe("Trafik");
  });

  it("iptalde satıcıyı, yeni poliçede alıcıyı seçer", () => {
    const parsed = parseNotarySaleFromText(NOTARY);
    expect(parsed.sellerNationalId).toBe("12345678901");
    expect(parsed.buyerNationalId).toBe("10987654321");
    expect(notaryPartyForMode(parsed, "cancel")).toEqual({
      name: "Ahmet Yılmaz",
      nationalId: "12345678901",
    });
    expect(notaryPartyForMode(parsed, "new")).toEqual({
      name: "Mehmet Demir",
      nationalId: "10987654321",
    });
  });

  it("JPEG OCR gibi ASCII ve boşluklu TCKN metnini okur", () => {
    const ascii = `
T.C.
EYUPSULTAN 3. NOTERLIGI
MOTORLU ARAC SATIS SOZLESMESI
Yevmiye No: 18452
Tarih: 27/08/2026

SATICI
Adi Soyadi: AHMET YILMAZ
T.C. Kimlik No: 12345 678901

ALICI
Adi Soyadi: MEHMET DEMIR
T.C. Kimlik No: 10987654321

ARAC BILGILERI
Plaka: 34 ABC 123
Sasi No: VF1ABCDEF12345678
Satis Bedeli: 450.000,00 TL
`;
    expect(isNotarySaleDocument(ascii)).toBe(true);
    const parsed = parseNotarySaleFromText(ascii);
    expect(parsed.sellerName).toMatch(/Ahmet Yılmaz/i);
    expect(parsed.buyerName).toMatch(/Mehmet Dem[iı]r/i);
    expect(parsed.sellerNationalId).toBe("12345678901");
    expect(plateKey(parsed.plate)).toBe("34ABC123");
    expect(parsed.issueDate).toBe("2026-08-27");
  });
});
