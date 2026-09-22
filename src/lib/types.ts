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

export type Customer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  nationalId: string;
  phone: string;
  birthDate: string;
  address: string;
  plates: string[];
  documentSerial: string;
  notes: string;
  source?: string;
};

export type Policy = {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId?: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  customerName: string;
  nationalId: string;
  phone: string;
  birthDate: string;
  address?: string;
  partaj: string;
  branch: string;
  policyNo: string;
  plate: string;
  documentSerial: string;
  chassisNo?: string;
  motorNo?: string;
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
  producerCommission: number;
  agencyCommission: number;
  producer: string;
  notes: string;
  status: PolicyStatus;
  cancelDate: string;
  cancelReason: string;
  sourceSheet?: string;
  sourceFile?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  usageCount: number;
  active: boolean;
  role?: "tali" | "agency" | "other";
  taliShareRate?: number;
};

export type BranchItem = CatalogItem & {
  profile: CalcProfile;
  defaultCommissionRate: number;
};

export type AppSettings = {
  pinHash?: string;
  agencyName: string;
  taliShareRate: number;
  taliProducerNames: string[];
  agencyProducerNames: string[];
};

export type ReportFilters = {
  from: string;
  to: string;
  partaj: string;
  branch: string;
  producer: string;
  status: "all" | PolicyStatus;
};
