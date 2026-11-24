import { BUSINESS } from "./config.js";

/** Pure brand helpers (no React) so they can be unit tested with plain node. */
export const DEFAULT_BRAND = {
  name: BUSINESS.name,
  shortName: BUSINESS.name,
  tagline: "Shop from local stores",
  description: "Shop electronics, textiles and home appliances from local shops, delivered to your door.",
  domain: BUSINESS.domain,
  colors: { primary: "", background: "#f6f4ef", themeColor: "#f6f4ef" },
  images: {},
  logoUrl: "",
  logoDarkUrl: "",
  hasIcon: false,
  version: "",
  contact: { phone: BUSINESS.phone, whatsapp: BUSINESS.whatsapp, email: BUSINESS.email, address: BUSINESS.address },
  social: {},
  business: { operator: BUSINESS.operator, jurisdiction: BUSINESS.jurisdiction, grievanceOfficer: BUSINESS.grievanceOfficer },
  policies: {
    acceptsChangeOfMind: BUSINESS.acceptsChangeOfMind, returnWindowHours: BUSINESS.returnWindowHours, refundDays: BUSINESS.refundDays,
    deliveryEstimate: BUSINESS.deliveryEstimate, complaintAckHours: BUSINESS.complaintAckHours, complaintResolveDays: BUSINESS.complaintResolveDays,
    lastUpdated: BUSINESS.lastUpdated,
  },
};

const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/** Fills any gap in what the server sent with the defaults, so a missing field never shows "undefined". */
export function mergeBrand(server) {
  const s = obj(server), d = DEFAULT_BRAND;
  const biz = obj(s.business);
  return {
    ...d, ...s,
    colors: { ...d.colors, ...obj(s.colors) },
    images: obj(s.images),
    contact: { ...d.contact, ...obj(s.contact) },
    social: obj(s.social),
    business: { ...d.business, ...biz, grievanceOfficer: { ...d.business.grievanceOfficer, ...obj(biz.grievanceOfficer) } },
    policies: { ...d.policies, ...obj(s.policies) },
  };
}

/** The flat shape the legal pages and order slip already use (the old config.js BUSINESS). GST comes from the admin settings. */
export function businessFrom(brand, meta = {}) {
  const b = brand, p = b.policies;
  return {
    name: b.name, operator: b.business.operator, address: b.contact.address, phone: b.contact.phone, whatsapp: b.contact.whatsapp,
    email: b.contact.email, domain: b.domain, grievanceOfficer: b.business.grievanceOfficer, jurisdiction: b.business.jurisdiction,
    gstRegistered: !!(meta.gstRegistered ?? BUSINESS.gstRegistered), gstin: meta.gstin || BUSINESS.gstin || "",
    acceptsChangeOfMind: p.acceptsChangeOfMind, returnWindowHours: p.returnWindowHours, refundDays: p.refundDays,
    deliveryEstimate: p.deliveryEstimate, complaintAckHours: p.complaintAckHours, complaintResolveDays: p.complaintResolveDays, lastUpdated: p.lastUpdated,
  };
}

