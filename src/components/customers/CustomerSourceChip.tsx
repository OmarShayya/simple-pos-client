import React from "react";
import { StatusChip } from "@/components/ui";
import type { CustomerSource } from "@/types/customer.types";

/** Where a customer came from (Counter / Website / Booking). Legacy customers without a source are Counter. */
const CustomerSourceChip: React.FC<{ source?: CustomerSource | null; size?: "small" | "medium" }> = ({ source, size }) => (
  <StatusChip status={source ?? "pos"} kind="source" size={size} />
);

export default CustomerSourceChip;
