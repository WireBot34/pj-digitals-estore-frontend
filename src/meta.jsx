import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { rememberBrand } from "./brand";
import { configureErrorReporting } from "./errorReport";

// Used until /api/meta answers (and if it can't be reached).
export const DEFAULT_META = {
  categories: ["Mobile", "Tablet", "Laptop", "Accessories", "Electronics", "Textiles", "Home Appliances", "Other"],
  locations: ["Thodupuzha", "Muttom"],
  orderStatuses: ["placed", "processing", "shipping", "delivered", "cancelled"],
  orderStatusLabels: { placed: "Placed", processing: "Processing", shipping: "Dispatched", delivered: "Delivered", cancelled: "Cancelled" },
  cashOnDelivery: true,
  onlinePayments: true,
  gstRegistered: false,
  cancelReasons: {
    customer: [["changed_mind", "I changed my mind"], ["ordered_by_mistake", "Ordered by mistake"], ["found_cheaper", "Found a better price"], ["wrong_address", "Wrong address or phone"], ["too_slow", "Taking too long"], ["other", "Other"]].map(([value, label]) => ({ value, label })),
    shop: [["out_of_stock", "Item is out of stock"], ["price_error", "Price or listing was wrong"], ["cannot_deliver", "Can't deliver to that address"], ["customer_unreachable", "Couldn't reach the customer"], ["shop_closed", "Shop is closed"], ["other", "Other"]].map(([value, label]) => ({ value, label })),
  },
};

const MetaContext = createContext(DEFAULT_META);

/** Loads the shared enums (categories, statuses, locations...) from the backend. */
export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(DEFAULT_META);
  useEffect(() => {
    const load = () => api("/api/meta").then((r) => r.data && (rememberBrand(r.data.brand), configureErrorReporting(r.data.monitoring?.dsn), setMeta({ ...DEFAULT_META, ...r.data, loaded: true }))).catch(() => {});
    load();
    window.addEventListener("meta:reload", load); // the admin changed categories or settings
    return () => window.removeEventListener("meta:reload", load);
  }, []);
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
/** Readable cancellation reason for an order ("" when none was given). */
export const cancelLabel = (meta, o) => {
  const list = meta.cancelReasons?.[o?.cancelledBy === "shop" ? "shop" : "customer"] || [];
  return list.find((r) => r.value === o?.cancelReason)?.label || "";
};
export const statusLabel = (meta, status) => meta.orderStatusLabels?.[status] || status;
