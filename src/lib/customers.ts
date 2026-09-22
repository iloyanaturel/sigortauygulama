import { uid } from "@/lib/id";
import { foldTurkish, formatPlate, plateKey, titleName } from "@/lib/text";
import type { Customer, Policy } from "@/lib/types";

export function matchCustomer(
  customers: Customer[],
  draft: {
    nationalId?: string;
    customerName?: string;
    plate?: string;
    phone?: string;
  },
): Customer | undefined {
  const tc = (draft.nationalId ?? "").replace(/\D/g, "");
  if (tc.length === 11) {
    const byTc = customers.find((item) => item.nationalId.replace(/\D/g, "") === tc);
    if (byTc) return byTc;
  }
  const plate = plateKey(draft.plate);
  if (plate) {
    const byPlate = customers.find((item) => item.plates.some((value) => plateKey(value) === plate));
    if (byPlate) return byPlate;
  }
  const name = foldTurkish(draft.customerName);
  if (name.length >= 5) {
    const byName = customers.find((item) => foldTurkish(item.name) === name);
    if (byName) return byName;
  }
  return undefined;
}

export function customerFromPolicy(policy: Pick<Policy, "customerName" | "nationalId" | "phone" | "birthDate" | "plate" | "documentSerial" | "notes"> & { address?: string }): Omit<Customer, "id" | "createdAt" | "updatedAt"> {
  return {
    name: titleName(policy.customerName.trim()),
    nationalId: policy.nationalId.replace(/\D/g, "").slice(0, 11),
    phone: policy.phone.trim(),
    birthDate: policy.birthDate,
    address: policy.address?.trim() ?? "",
    plates: policy.plate ? [formatPlate(policy.plate)] : [],
    documentSerial: policy.documentSerial.trim(),
    notes: "",
    source: "policy",
  };
}

export function mergeCustomerRecord(existing: Customer, incoming: Partial<Customer> & { plate?: string }): Customer {
  const plates = [...existing.plates];
  const extraPlate = incoming.plate || (incoming.plates?.[0] ?? "");
  if (extraPlate && !plates.some((item) => plateKey(item) === plateKey(extraPlate))) {
    plates.push(formatPlate(extraPlate));
  }
  if (incoming.plates) {
    for (const plate of incoming.plates) {
      if (plate && !plates.some((item) => plateKey(item) === plateKey(plate))) {
        plates.push(formatPlate(plate));
      }
    }
  }
  return {
    ...existing,
    name: incoming.name?.trim() || existing.name,
    nationalId: incoming.nationalId?.replace(/\D/g, "").slice(0, 11) || existing.nationalId,
    phone: incoming.phone?.trim() || existing.phone,
    birthDate: incoming.birthDate || existing.birthDate,
    address: incoming.address?.trim() || existing.address,
    plates,
    documentSerial: incoming.documentSerial?.trim() || existing.documentSerial,
    notes: [existing.notes, incoming.notes].filter(Boolean).join(" · "),
    updatedAt: new Date().toISOString(),
  };
}

export function newCustomerId() {
  return uid();
}
