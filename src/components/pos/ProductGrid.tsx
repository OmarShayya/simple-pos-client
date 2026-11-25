import React, { useMemo, useState } from "react";
import { Box, ButtonBase, Skeleton, Typography, alpha, useTheme } from "@mui/material";
import { Inventory2Outlined } from "@mui/icons-material";
import { EmptyState, ErrorState, MoneyText, SearchField, SegmentedControl, StatusChip } from "@/components/ui";
import type { Product } from "@/types/product.types";
import { stockOf } from "./usePosCart";

export interface ProductGridProps {
  products: Product[] | undefined;
  loading: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** productId → quantity already in the cart. */
  inCart: Record<string, number>;
  onAdd: (product: Product) => void;
}

const canSell = (p: Product, inCart = 0) => {
  const stock = stockOf(p);
  return stock === null || stock - inCart > 0;
};

const ProductTile: React.FC<{ product: Product; qty: number; onAdd: () => void }> = ({ product, qty, onAdd }) => {
  const theme = useTheme();
  const stock = stockOf(product);
  const available = canSell(product, qty);
  const out = stock !== null && stock <= 0;
  const low = !out && stock !== null && Boolean(product.inventory?.isLowStock);
  return (
    <ButtonBase
      onClick={onAdd}
      disabled={!available}
      aria-label={`Add ${product.name}${qty ? ` (${qty} in cart)` : ""}`}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        gap: 0.25,
        p: 1.5,
        minHeight: 112,
        borderRadius: "12px",
        border: 1,
        borderColor: qty ? "primary.main" : "divider",
        bgcolor: qty ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06) : "background.paper",
        opacity: available ? 1 : 0.5,
        transition: "border-color .15s, background-color .15s, transform .08s",
        "&:hover": { borderColor: "primary.main" },
        "&:active": { transform: "scale(0.98)" },
        "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      {qty > 0 && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            minWidth: 26,
            height: 26,
            px: 0.75,
            borderRadius: "13px",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontWeight: 700,
            fontSize: "0.875rem",
            display: "grid",
            placeItems: "center",
          }}
        >
          {qty}
        </Box>
      )}
      <Typography
        sx={{ fontWeight: 600, lineHeight: 1.3, pr: qty ? 4 : 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {product.category?.name}
      </Typography>
      <Box sx={{ mt: "auto", pt: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <MoneyText value={product.pricing.usd} sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }} />
          <MoneyText value={product.pricing.lbp} currency="LBP" tone="muted" variant="body2" sx={{ display: "block" }} />
        </Box>
        {out ? (
          <StatusChip status="out" kind="stock" label="Out" />
        ) : low ? (
          <StatusChip status="low" kind="stock" label={`${stock} left`} />
        ) : null}
      </Box>
    </ButtonBase>
  );
};

/**
 * Product picker for the counter: search (Enter adds the first match — works with a barcode
 * scanner too), category filter, big tiles showing price in USD + LBP, stock and cart quantity.
 */
const ProductGrid: React.FC<ProductGridProps> = ({ products, loading, error, onRetry, inCart, onAdd }) => {
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    (products ?? []).forEach((p) => p.category?.id && map.set(p.category.id, p.category.name));
    return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const match = (q: string) => {
    const term = q.trim().toLowerCase();
    return (products ?? [])
      .filter((p) => (term ? true : category === "all" || p.category?.id === category))
      .filter((p) => !term || p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase() === term)
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  const visible = match(search);

  // Enter = add the first product that can still be sold, then clear the box for the next one
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const typed = (e.target as HTMLInputElement).value ?? "";
    if (!typed.trim()) return;
    const first = match(typed).find((p) => canSell(p, inCart[p.id]));
    if (first) {
      onAdd(first);
      setSearch("");
      setSearchKey((k) => k + 1);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <Box onKeyDown={onKeyDown}>
        <SearchField
          key={searchKey}
          value={search}
          onChange={setSearch}
          delay={80}
          size="medium"
          placeholder="Search products — press Enter to add"
          aria-label="Search products"
          autoFocus={typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches}
        />
      </Box>
      {categories.length > 1 && (
        <SegmentedControl
          aria-label="Category"
          value={search ? "all" : category}
          onChange={(v) => {
            setCategory(v);
            if (search) {
              setSearch("");
              setSearchKey((k) => k + 1);
            }
          }}
          options={[{ value: "all", label: "All" }, ...categories]}
        />
      )}
      {error && !products?.length ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <Box sx={GRID} aria-busy>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={112} sx={{ borderRadius: "12px" }} />
          ))}
        </Box>
      ) : visible.length === 0 ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px" }}>
          <EmptyState
            compact
            icon={<Inventory2Outlined />}
            title={search ? "No product matches" : "No products here"}
            description={search ? `Nothing found for “${search}”.` : "This category has no products yet."}
          />
        </Box>
      ) : (
        <Box sx={GRID}>
          {visible.map((p) => (
            <ProductTile key={p.id} product={p} qty={inCart[p.id] ?? 0} onAdd={() => onAdd(p)} />
          ))}
        </Box>
      )}
    </Box>
  );
};

const GRID = {
  display: "grid",
  gap: { xs: 1, sm: 1.25 },
  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(156px, 1fr))" },
} as const;

export default ProductGrid;
