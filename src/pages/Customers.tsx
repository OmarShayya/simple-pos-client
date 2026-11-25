import React, { useMemo, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { EditOutlined, PersonAddAlt1Outlined } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { DataTable, PageHeader, SegmentedControl, SelectField } from "@/components/ui";
import type { DataTableColumn, DataTableSort } from "@/components/ui";
import CustomerSourceChip from "@/components/customers/CustomerSourceChip";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerDrawer from "@/components/customers/CustomerDrawer";
import LastVisitFilter from "@/components/customers/LastVisitFilter";
import { useCustomerList } from "@/components/customers/customerQueries";
import { CUSTOMER_SOURCE_OPTIONS, formatPlace, lastVisitRange, type LastVisitValue } from "@/components/customers/customerFormat";
import { customersApi } from "@/api/customers.api";
import { formatPhone } from "@/utils/phone";
import type { Customer, CustomerFilters, CustomerSortField, CustomerSource } from "@/types/customer.types";

type SourceFilter = "all" | CustomerSource;
type BalanceFilter = "any" | "owes";

const SORTABLE: Record<string, CustomerSortField> = { name: "name", totalPurchases: "totalPurchases", lastPurchaseDate: "lastPurchaseDate", createdAt: "createdAt" };

const Customers: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const openId = params.get("customer");

  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [balance, setBalance] = useState<BalanceFilter>("any");
  const [lastVisit, setLastVisit] = useState<LastVisitValue>({ preset: "any" });
  const [sort, setSort] = useState<DataTableSort | null>({ field: "name", direction: "asc" });
  const [page, setPage] = useState({ page: 0, pageSize: 25 });
  const [form, setForm] = useState<{ customer: Customer | null } | null>(null);
  const [rowCache, setRowCache] = useState<Customer | null>(null);

  const filters: CustomerFilters = {
    search: search || undefined,
    source: source === "all" ? undefined : [source],
    hasBalance: balance === "owes" || undefined,
    ...lastVisitRange(lastVisit),
    sort: sort ? SORTABLE[sort.field] : undefined,
    order: sort?.direction,
    page: page.page + 1,
    limit: page.pageSize,
  };
  const q = useCustomerList(filters);

  const resetPage = () => setPage((p) => ({ ...p, page: 0 }));
  const activeFilters = (source !== "all" ? 1 : 0) + (balance !== "any" ? 1 : 0) + (lastVisit.preset !== "any" ? 1 : 0);

  const openCustomer = (c: Customer | null) => {
    setRowCache(c);
    setParams(
      (p) => {
        if (c) p.set("customer", c.id);
        else p.delete("customer");
        return p;
      },
      { replace: true }
    );
  };

  const columns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      { field: "name", header: "Name", minWidth: 180, flex: 1.3, mobile: "title" },
      {
        field: "phone",
        header: "Phone",
        value: (c) => formatPhone(c.phone, c.phoneCountry),
        render: (c) => <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatPhone(c.phone, c.phoneCountry)}</Box>,
        sortable: false,
        minWidth: 160,
        mobile: "subtitle",
      },
      { field: "source", header: "Came from", sortable: false, width: 130, render: (c) => <CustomerSourceChip source={c.source} />, value: (c) => c.source ?? "pos", mobile: "end" },
      { field: "place", header: "Area", value: (c) => formatPlace(c.address), sortable: false, hideBelow: "lg", minWidth: 140 },
      { field: "totalPurchases", header: "Spent", type: "money", width: 110 },
      { field: "lastPurchaseDate", header: "Last visit", type: "relative", width: 130 },
      { field: "createdAt", header: "Added", type: "date", width: 120, hideBelow: "lg", mobile: "hidden" },
      {
        field: "actions",
        header: "Actions",
        type: "actions",
        width: 72,
        render: (c) => (
          <Tooltip title="Edit customer">
            <IconButton aria-label={`Edit ${c.name}`} onClick={() => setForm({ customer: c })}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const total = q.data?.pagination.total;

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle={
          <>
            Website orders and station bookings add customers automatically by phone number.
            {typeof total === "number" && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontVariantNumeric: "tabular-nums" }}>
                {total === 1 ? "1 customer" : `${total.toLocaleString("en-US")} customers`}
                {activeFilters || search ? " match" : ""}.
              </Typography>
            )}
          </>
        }
      />

      <DataTable<Customer>
        label="Customers"
        rows={q.data?.data}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => q.refetch()}
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            resetPage();
          },
          placeholder: "Name, phone or email",
        }}
        filters={
          <>
            <SegmentedControl<SourceFilter>
              aria-label="Came from"
              value={source}
              onChange={(v) => {
                setSource(v);
                resetPage();
              }}
              options={[{ value: "all", label: "All" }, ...CUSTOMER_SOURCE_OPTIONS]}
            />
            <SelectField<BalanceFilter>
              label="Balance"
              size="small"
              fullWidth={false}
              minWidth={160}
              value={balance}
              onChange={(v) => {
                setBalance(v);
                resetPage();
              }}
              options={[
                { value: "any", label: "Any balance" },
                { value: "owes", label: "Owes money" },
              ]}
            />
            <LastVisitFilter
              value={lastVisit}
              onChange={(v) => {
                setLastVisit(v);
                resetPage();
              }}
            />
          </>
        }
        activeFilterCount={activeFilters}
        onClearFilters={() => {
          setSource("all");
          setBalance("any");
          setLastVisit({ preset: "any" });
          resetPage();
        }}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          resetPage();
        }}
        pagination={{ ...page, rowCount: total ?? 0, onChange: (p, size) => setPage({ page: p, pageSize: size }) }}
        primaryAction={{ label: "Add customer", icon: <PersonAddAlt1Outlined />, onClick: () => setForm({ customer: null }) }}
        exportCsv={{ filename: "customers", fetchAll: () => customersApi.getAll({ ...filters, page: 1, limit: 100 }).then((r) => r.data) }}
        onRowClick={openCustomer}
        empty={{
          title: "No customers yet",
          description: "Add one here, or they appear automatically when someone orders on the website or books a station.",
        }}
      />

      <CustomerDrawer
        customerId={openId}
        fallback={rowCache}
        onClose={() => openCustomer(null)}
        onEdit={(c) => setForm({ customer: c })}
      />

      <CustomerFormDialog
        open={Boolean(form)}
        customer={form?.customer}
        onClose={() => setForm(null)}
        onSaved={(c) => {
          if (!form?.customer) openCustomer(c);
        }}
        onOpenExisting={openCustomer}
      />
    </Box>
  );
};

export default Customers;
