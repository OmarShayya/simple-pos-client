import React from "react";
import { StatusChip } from "@/components/ui";
import { formatNumber } from "@/utils/format";
import type { Product } from "@/types/product.types";
import { stockStatus } from "./productFormat";

const StockChip: React.FC<{ product: Product }> = ({ product }) => {
  const status = stockStatus(product);
  if (status === "service") return <StatusChip status="service" label="No stock" tone="neutral" dot={false} />;
  const qty = formatNumber(product.inventory!.quantity);
  return <StatusChip status={status} kind="stock" label={status === "out" ? "Out of stock" : status === "low" ? `Low · ${qty}` : `${qty} in stock`} />;
};

export default StockChip;
