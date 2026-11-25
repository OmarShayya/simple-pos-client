import React, { useMemo, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { DeleteOutlineRounded, EditOutlined } from "@mui/icons-material";
import { DataTable, PageHeader, SegmentedControl, SelectField } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import DiscountFormDialog from "@/components/discounts/DiscountFormDialog";
import { TARGET_LABEL, TARGET_OPTIONS, appliesTo, discountState, validityText } from "@/components/discounts/discountFormat";
import { useAllDiscounts, useDiscountMutations } from "@/components/discounts/discountQueries";
import { useConfirm } from "@/hooks/useConfirm";
import { formatPercent } from "@/utils/format";
import type { Discount, DiscountTarget } from "@/types/discount.types";

type StateFilter = "all" | "on" | "notOn";

/** Percentage discounts staff can apply at the counter (orders, gaming time, a product or a category). */
const Discounts: React.FC = () => {
  const confirm = useConfirm();
  const q = useAllDiscounts();
  const { remove } = useDiscountMutations();
  const [target, setTarget] = useState<DiscountTarget | "">("");
  const [state, setState] = useState<StateFilter>("all");
  const [form, setForm] = useState<{ discount: Discount | null } | null>(null);

  const rows = useMemo(
    () =>
      (q.data ?? []).filter((d) => {
        if (target && d.target !== target) return false;
        const s = discountState(d);
        if (state === "on" && s !== "on") return false;
        if (state === "notOn" && s === "on") return false;
        return true;
      }),
    [q.data, target, state]
  );
  const onCount = (q.data ?? []).filter((d) => discountState(d) === "on").length;

  const askDelete = async (d: Discount) => {
    const ok = await confirm({
      title: `Delete ${d.name}?`,
      message: "Staff can no longer pick it. Orders that already used it keep their discount. To pause it instead, edit it and turn it off.",
      confirmLabel: "Delete discount",
      tone: "danger",
    });
    if (ok) remove.mutate(d);
  };

  const columns: DataTableColumn<Discount>[] = [
    {
      field: "name",
      header: "Name",
      flex: 1.3,
      minWidth: 200,
      mobile: "title",
      render: (d) => (
        <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
          <Typography component="div" sx={{ fontWeight: 500 }} noWrap>
            {d.name}
          </Typography>
          {d.description && (
            <Typography component="div" variant="body2" color="text.secondary" noWrap>
              {d.description}
            </Typography>
          )}
        </Box>
      ),
      value: (d) => `${d.name} ${d.description ?? ""}`,
      csv: (d) => d.name,
    },
    { field: "value", header: "Discount", type: "number", value: (d) => d.value, render: (d) => <b>{formatPercent(d.value)} off</b>, width: 120, csv: (d) => d.value, mobile: "end" },
    { field: "appliesTo", header: "Applies to", value: (d) => appliesTo(d), render: (d) => (
        <span>
          {appliesTo(d)}
          {(d.target === "product" || d.target === "category") && (
            <Box component="span" sx={{ color: "text.secondary" }}>
              {" "}
              · {d.target === "product" ? "product" : "category"}
            </Box>
          )}
        </span>
      ), minWidth: 170, mobile: "subtitle" },
    { field: "validity", header: "When", value: (d) => validityText(d), sortable: false, minWidth: 150, hideBelow: "md" },
    {
      field: "state",
      header: "Status",
      type: "status",
      statusKind: "discount",
      value: (d) => discountState(d),
      width: 130,
      mobile: "end",
    },
    {
      field: "actions",
      header: "Actions",
      type: "actions",
      width: 112,
      render: (d) => (
        <>
          <Tooltip title="Edit discount">
            <IconButton aria-label={`Edit ${d.name}`} onClick={() => setForm({ discount: d })}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete discount">
            <IconButton aria-label={`Delete ${d.name}`} onClick={() => askDelete(d)} sx={{ color: "error.main" }}>
              <DeleteOutlineRounded />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Discounts" subtitle="Percentage discounts staff can pick for a whole order, gaming time, one product or one category." />
      <DataTable<Discount>
        label="Discounts"
        rows={rows}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => q.refetch()}
        search={{ placeholder: "Search discounts" }}
        filters={
          <>
            <SegmentedControl<StateFilter>
              aria-label="Status"
              value={state}
              onChange={setState}
              options={[
                { value: "all", label: "All" },
                { value: "on", label: "Active", count: onCount },
                { value: "notOn", label: "Not active" },
              ]}
            />
            <SelectField<DiscountTarget | "">
              label="Applies to"
              size="small"
              fullWidth={false}
              minWidth={180}
              value={target}
              onChange={setTarget}
              emptyOption="Anything"
              options={TARGET_OPTIONS}
            />
          </>
        }
        activeFilterCount={(target ? 1 : 0) + (state !== "all" ? 1 : 0)}
        onClearFilters={() => {
          setTarget("");
          setState("all");
        }}
        initialSort={{ field: "name", direction: "asc" }}
        primaryAction={{ label: "New discount", onClick: () => setForm({ discount: null }) }}
        onRowClick={(d) => setForm({ discount: d })}
        exportCsv={{ filename: "discounts" }}
        empty={{ title: "No discounts yet", description: `Create one for a ${TARGET_LABEL.sale.toLowerCase()}, gaming time, a product or a category.` }}
      />
      <DiscountFormDialog open={Boolean(form)} discount={form?.discount} onClose={() => setForm(null)} />
    </Box>
  );
};

export default Discounts;
