import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

// Used until /api/meta answers (and if it can't be reached).
export const DEFAULT_META = {
  categories: ["Mobile", "Tablet", "Laptop", "Accessories", "Electronics", "Textiles", "Home Appliances", "Other"],
  locations: ["Thodupuzha", "Muttom"],
  orderStatuses: ["placed", "processing", "shipping", "delivered", "cancelled"],
  orderStatusLabels: { placed: "Placed", processing: "Processing", shipping: "Dispatched", delivered: "Delivered", cancelled: "Cancelled" },
  cashOnDelivery: true,
  onlinePayments: true,
};

const MetaContext = createContext(DEFAULT_META);

/** Loads the shared enums (categories, statuses, locations...) from the backend. */
export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(DEFAULT_META);
  useEffect(() => {
    api("/api/meta").then((r) => r.data && setMeta({ ...DEFAULT_META, ...r.data })).catch(() => {});
  }, []);
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
export const statusLabel = (meta, status) => meta.orderStatusLabels?.[status] || status;
