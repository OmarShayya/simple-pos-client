import type { Product } from "@/types/product.types";

/** Stock state of a product: "12 in stock" / "Low · 3" / "Out of stock" / "No stock" (services). */
export const stockStatus = (p: Product): "service" | "out" | "low" | "in_stock" => {
  if ((p.productType ?? "physical") === "service" || !p.inventory) return "service";
  if (p.inventory.quantity <= 0) return "out";
  return p.inventory.isLowStock ? "low" : "in_stock";
};
