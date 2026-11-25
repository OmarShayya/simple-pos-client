import React from "react";
import { StatusChip } from "@/components/ui";
import type { CustomerSource } from "@/types/customer.types";
import { CUSTOMER_SOURCE } from "./customerFormat";

/** Where a customer came from (Counter / Website / Booking). Legacy customers without a source are Counter. */
const CustomerSourceChip: React.FC<{ source?: CustomerSource | null; size?: "small" | "medium" }> = ({ source, size }) => {
  const info = CUSTOMER_SOURCE[source ?? "pos"] ?? CUSTOMER_SOURCE.pos;
  return <StatusChip status={source ?? "pos"} kind="source" label={info.label} tone={info.tone} size={size} />;
};

export default CustomerSourceChip;
