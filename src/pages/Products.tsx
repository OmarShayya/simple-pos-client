import React, { useMemo, useState } from "react";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { AddRounded, DeleteOutlineRounded, EditOutlined, ImageOutlined } from "@mui/icons-material";
import { CodeText, DataTable, IconAction, MoneyText, PageHeader, SegmentedControl, SelectField, StatusChip } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import StockChip from "@/components/products/StockChip";
import { stockStatus } from "@/components/products/productFormat";
import { useAllProducts, useCategories, useProductMutations } from "@/components/products/productQueries";
import { useConfirm } from "@/hooks/useConfirm";
import { plural } from "@/utils/format";
import type { Product } from "@/types/product.types";

type StockFilter = "all" | "low" | "out";
type MenuFilter = "all" | "shown" | "hidden";

const Products: React.FC = () => {
  const confirm = useConfirm();
  const q = useAllProducts();
  const categoriesQ = useCategories(true);
  const { remove } = useProductMutations();

  const [category, setCategory] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [menu, setMenu] = useState<MenuFilter>("all");
  const [form, setForm] = useState<{ product: Product | null } | null>(null);

  const rows = useMemo(
    () =>
      (q.data ?? []).filter((p) => {
        if (category && p.category?.id !== category) return false;
        const s = stockStatus(p);
        if (stock === "low" && s !== "low" && s !== "out") return false;
        if (stock === "out" && s !== "out") return false;
        if (menu === "shown" && !p.displayOnMenu) return false;
        if (menu === "hidden" && p.displayOnMenu) return false;
        return true;
      }),
    [q.data, category, stock, menu]
  );
  const lowCount = (q.data ?? []).filter((p) => ["low", "out"].includes(stockStatus(p))).length;
  const activeFilters = (category ? 1 : 0) + (stock !== "all" ? 1 : 0) + (menu !== "all" ? 1 : 0);

  const askDelete = async (p: Product) => {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      message: "It disappears from the counter and the website menu. Past orders keep their lines.",
      confirmLabel: "Delete product",
      tone: "danger",
    });
    if (ok) remove.mutate(p);
  };

  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      {
        field: "name",
        header: "Product",
        flex: 1.6,
        minWidth: 220,
        mobile: "title",
        render: (p) => (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={p.image} variant="rounded" alt="" sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "action.hover", color: "text.secondary", display: { xs: "none", sm: "flex" } }}>
              <ImageOutlined fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
              <Typography component="div" sx={{ fontWeight: 500 }} noWrap>
                {p.name}
              </Typography>
              {p.sku && <CodeText>{p.sku}</CodeText>}
            </Box>
          </Stack>
        ),
        value: (p) => `${p.name} ${p.sku ?? ""}`,
        csv: (p) => (p.sku ? `${p.name} (${p.sku})` : p.name),
      },
      { field: "category", header: "Category", value: (p) => p.category?.name ?? "—", minWidth: 140, mobile: "subtitle" },
      {
        field: "price",
        header: "Price",
        type: "money",
        value: (p) => p.pricing.usd,
        render: (p) => (p.pricing.usd ? <MoneyText value={p.pricing.usd} lbp={p.pricing.lbp} lbpLayout="stacked" /> : <Box component="span" sx={{ color: "text.disabled" }}>—</Box>),
        width: 140,
        mobile: "end",
      },
      { field: "stock", header: "Stock", value: (p) => p.inventory?.quantity ?? -1, render: (p) => <StockChip product={p} />, width: 140, align: "left", csv: (p) => p.inventory?.quantity ?? "" },
      {
        field: "displayOnMenu",
        header: "Website menu",
        value: (p) => (p.displayOnMenu ? "Shown" : "Hidden"),
        render: (p) => <StatusChip status={p.displayOnMenu ? "yes" : "no"} kind="generic" label={p.displayOnMenu ? "Shown" : "Hidden"} />,
        width: 140,
        hideBelow: "lg",
      },
      {
        field: "actions",
        header: "Actions",
        type: "actions",
        width: 112,
        render: (p) => (
          <>
            <IconAction title="Edit product" label={`Edit ${p.name}`} icon={<EditOutlined />} onClick={() => setForm({ product: p })} />
            <IconAction title="Delete product" label={`Delete ${p.name}`} icon={<DeleteOutlineRounded />} onClick={() => askDelete(p)} tone="danger" />
          </>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle={
          q.data
            ? `${plural(q.data.length, "product")} · ${lowCount ? `${plural(lowCount, "item")} low on stock` : "stock is fine"}`
            : "Snacks, drinks and everything sold at the counter and on the website menu."
        }
        actions={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setForm({ product: null })}>
            Add product
          </Button>
        }
      />
      <DataTable<Product>
        label="Products"
        rows={rows}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => q.refetch()}
        search={{ placeholder: "Search name or SKU" }}
        filters={
          <>
            <SelectField<string>
              label="Category"
              size="small"
              fullWidth={false}
              minWidth={180}
              value={category}
              onChange={setCategory}
              emptyOption="All categories"
              options={(categoriesQ.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
            <SegmentedControl<StockFilter>
              aria-label="Stock"
              value={stock}
              onChange={setStock}
              options={[
                { value: "all", label: "All stock" },
                { value: "low", label: "Low", count: lowCount || undefined },
                { value: "out", label: "Out" },
              ]}
            />
            <SelectField<MenuFilter>
              label="Website menu"
              size="small"
              fullWidth={false}
              minWidth={170}
              value={menu}
              onChange={setMenu}
              options={[
                { value: "all", label: "Shown or hidden" },
                { value: "shown", label: "Shown on menu" },
                { value: "hidden", label: "Hidden from menu" },
              ]}
            />
          </>
        }
        activeFilterCount={activeFilters}
        onClearFilters={() => {
          setCategory("");
          setStock("all");
          setMenu("all");
        }}
        initialSort={{ field: "name", direction: "asc" }}
        exportCsv={{ filename: "products" }}
        onRowClick={(p) => setForm({ product: p })}
        empty={{ title: "No products yet", description: "Add the snacks and drinks you sell — they appear at the counter and on the website menu." }}
      />
      <ProductFormDialog open={Boolean(form)} product={form?.product} categories={categoriesQ.data ?? []} onClose={() => setForm(null)} />
    </Box>
  );
};

export default Products;
