export type CalcProfile = "trafik" | "kasko" | "konut" | "exempt" | "custom";

export type PolicyStatus = "aktif" | "iptal" | "zeyl";

export type PremiumLine = {
  code: "net" | "ghk" | "thgf" | "giderVergisi" | "ysv" | "brut";
  label: string;
  amount: number;
  rate: number | null;
};

export type PremiumBreakdown = {
  netPremium: number;
  compulsoryNet: number;
  firePremium: number;
  ghk: number;
  thgf: number;
  giderVergisi: number;
  ysv: number;
  grossPremium: number;
  lines: PremiumLine[];
  profile: CalcProfile;
};

export type Policy = {
  id: string;
  createdAt: string;
  updatedAt: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  customerName: string;
  nationalId: string;
  phone: string;
  birthDate: string;
  partaj: string;
  branch: string;
  policyNo: string;
  plate: string;
  documentSerial: string;
  addressCode: string;
  daskNo: string;
  netPremium: number;
  compulsoryNet: number | null;
  firePremium: number | null;
  ghk: number;
  thgf: number;
  giderVergisi: number;
  ysv: number;
  grossPremium: number;
  commission: number;
  commissionRate: number;
  producer: string;
  notes: string;
  status: PolicyStatus;
  sourceSheet?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  usageCount: number;
  active: boolean;
};

export type BranchItem = CatalogItem & {
  profile: CalcProfile;
  defaultCommissionRate: number;
};

export type AppSettings = {
  pinHash?: string;
  agencyName: string;
};
