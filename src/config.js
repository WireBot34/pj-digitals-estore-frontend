/**
 * Business details used by the legal pages, the order slip and the footer.
 * Fill this in ONCE. Anything left empty is shown on the legal pages as a visible
 * amber "add this" marker, so a blank can never be published by accident.
 *
 * The policy numbers below are sensible starting defaults, not legal advice.
 * Change them to what you really do, and have the pages read once by someone who knows
 * your local rules before you rely on them.
 */
export const BUSINESS = {
  name: "NBYME",
  /** Registered or trading name of the person or firm that runs the store, e.g. "PJ Digitals (proprietor: Name)" */
  operator: "NBYME",
  address: "Muttom, Thodupuzha",
  phone: "+916282227134",
  whatsapp: "+916282227134",
  email: "support@nbyme.com",
  domain: "www.nbyme.com",

  /** Person who receives complaints (required for online marketplaces in India). */
  grievanceOfficer: { name: "staff", phone: "+916282227134", email: "support@nbyme.com", hours: "Mon to Sat, 10am to 6pm" },

  /** Court area for disputes, e.g. "Thodupuzha, Kerala" */
  jurisdiction: "Muttom, Kerala",

  /** Set to true only after you hold a GSTIN. While false, the site never says "tax invoice". */
  gstRegistered: false,
  gstin: "",

  // Policy defaults (edit to match what you actually do)
  acceptsChangeOfMind: false, // true = customers may return unused items just because they changed their mind
  returnWindowHours: 48, // report a damaged or wrong item within this time of delivery
  refundDays: 7, // refunds are processed within this many days of approval
  deliveryEstimate: "the same day or the next day", // shown on the shipping page
  complaintAckHours: 48, // acknowledge a complaint within this time
  complaintResolveDays: 30, // resolve within this many days

  lastUpdated: "21 November 2026",
};
