import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { PaymentsOutlined, PrintOutlined } from "@mui/icons-material";
import { DataTable, DateRangeField, IconAction, PageHeader, SegmentedControl, SelectField, StatusChip, type DataTableColumn } from "@/components/ui";
import { defaultDateRange, type DateRangeValue } from "@/utils/dateRanges";
import { formatPhone } from "@/utils/phone";
import { salesApi } from "@/api/sales.api";
import { SaleStatus, type OrderListFilters, type OrderRow } from "@/types/sale.types";
import OpenOrdersPanel from "@/components/orders/OpenOrdersPanel";
import OrderDrawer from "@/components/orders/OrderDrawer";
import PaymentDialog from "@/components/orders/PaymentDialog";
import ReceiptDialog from "@/components/orders/ReceiptDialog";
import { OrderKindLabel, RunningChip } from "@/components/orders/OrderBadges";
import { customerLabel, isOrderKind, kindFilter, ORDER_KIND_LABEL, orderKind, type OrderKind } from "@/components/orders/orderMeta";
import { useOrdersList } from "@/components/orders/useOrderData";

type StatusFilter = "all" | SaleStatus;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: SaleStatus.PENDING, label: "Unpaid" },
  { value: SaleStatus.PAID, label: "Paid" },
  { value: SaleStatus.CANCELLED, label: "Cancelled" },
];
const isStatus = (v: string | null): v is SaleStatus => v === "pending" || v === "paid" || v === "cancelled";

const KIND_OPTIONS = (Object.keys(ORDER_KIND_LABEL) as OrderKind[]).map((k) => ({ value: k, label: ORDER_KIND_LABEL[k] }));

/** The API pages at most 100 rows: export walks every page. */
const fetchAllOrders = async (filters: OrderListFilters) => {
  const rows: OrderRow[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await salesApi.list({ ...filters, page, limit: 100 });
    rows.push(...res.data);
    if (page >= (res.pagination?.totalPages ?? 1)) break;
  }
  return rows;
};

/**
 * ONE place for every order: counter sales, gaming sessions (with their drinks) and website
 * orders. "Open now" on top = everything still unpaid (any day); below, the full history with
 * filters. Row → detail drawer with Take payment / Add items / End session / Print / Cancel.
 */
const Orders: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const status: StatusFilter = isStatus(params.get("status")) ? (params.get("status") as SaleStatus) : "all";
  const kindParam = params.get("type");
  const kind: OrderKind | "all" = isOrderKind(kindParam) ? kindParam : "all";
  const openId = params.get("order");

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("today"));
  const [page, setPage] = useState({ page: 0, pageSize: 25 });
  const [payFor, setPayFor] = useState<string | null>(null);
  const [printFor, setPrintFor] = useState<string | null>(null);

  /** Change URL-backed state (filters, open order) without adding history entries for filters. */
  const setParam = (patch: Record<string, string | null>, push = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: !push });
  };
  const resetPage = () => setPage((p) => ({ ...p, page: 0 }));

  // Deep link: /orders?order=<id>&pay=1 opens the payment dialog once
  useEffect(() => {
    if (params.get("pay") && openId) {
      setPayFor(openId);
      setParam({ pay: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const filters: OrderListFilters = useMemo(
    () => ({
      ...kindFilter(kind),
      status: status === "all" ? undefined : status,
      search: search || undefined,
      from: range.from,
      to: range.to,
      page: page.page + 1,
      limit: page.pageSize,
    }),
    [kind, status, search, range.from, range.to, page.page, page.pageSize]
  );
  const list = useOrdersList(filters);

  const columns = useMemo<DataTableColumn<OrderRow>[]>(
    () => [
      { field: "createdAt", header: "Time", type: "smartDateTime", width: 150, sortable: false, mobile: "subtitle" },
      { field: "invoiceNumber", header: "Order", type: "code", width: 140, sortable: false, mobile: "subtitle" },
      {
        field: "customer",
        header: "Customer",
        value: customerLabel,
        sortable: false,
        minWidth: 150,
        mobile: "title",
        render: (o) => (
          <Box sx={{ lineHeight: 1.25, minWidth: 0 }}>
            <Typography component="div" noWrap sx={{ fontWeight: 500 }}>
              {customerLabel(o)}
            </Typography>
            {o.customer?.phone && (
              <Typography component="div" variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {formatPhone(o.customer.phone)}
              </Typography>
            )}
          </Box>
        ),
        csv: (o) => customerLabel(o),
      },
      { field: "kind", header: "Type", value: (o) => ORDER_KIND_LABEL[orderKind(o)], render: (o) => <OrderKindLabel kind={orderKind(o)} />, width: 115, sortable: false },
      {
        field: "cashier",
        header: "Taken by",
        value: (o) => o.cashier?.name ?? (o.source === "website" ? "Website" : ""),
        sortable: false,
        minWidth: 110,
        hideBelow: "lg",
        mobile: "hidden",
      },
      {
        field: "status",
        header: "Status",
        type: "status",
        statusKind: "order",
        // "Unpaid" + "Running" side by side
        width: 192,
        sortable: false,
        mobile: "end",
        render: (o) => (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <StatusChip status={o.status} kind="order" />
            {o.hasActiveSessions && <RunningChip />}
          </Stack>
        ),
      },
      { field: "total", header: "Total", type: "money", value: (o) => o.totals.usd, width: 100, sortable: false, mobile: "end" },
      {
        field: "actions",
        header: "Actions",
        type: "actions",
        width: 64,
        render: (o) =>
          o.status === SaleStatus.PENDING ? (
            <IconAction title="Take payment" label={`Take payment for ${o.invoiceNumber}`} icon={<PaymentsOutlined />} onClick={() => setPayFor(o.id)} />
          ) : o.status === SaleStatus.PAID ? (
            <IconAction title="Print receipt" label={`Print receipt ${o.invoiceNumber}`} icon={<PrintOutlined />} onClick={() => setPrintFor(o.id)} />
          ) : null,
      },
    ],
    []
  );

  const activeFilters = (status !== "all" ? 1 : 0) + (kind !== "all" ? 1 : 0) + (range.preset !== "today" ? 1 : 0);

  return (
    <Box>
      <PageHeader
        title="Orders"
        subtitle="Counter sales, gaming sessions and website orders — all in one place."
      />

      <Stack spacing={{ xs: 3, md: 4 }}>
        <OpenOrdersPanel onOpen={(id) => setParam({ order: id }, true)} onTakePayment={setPayFor} />

        <Box component="section" aria-labelledby="orders-history-title">
          <Typography id="orders-history-title" variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
            All orders
          </Typography>
          <Box sx={{ mb: 2 }}>
            <DateRangeField
              value={range}
              onChange={(r) => {
                setRange(r);
                resetPage();
              }}
            />
          </Box>
          <DataTable<OrderRow>
            label="Orders"
            rows={list.data?.data}
            columns={columns}
            loading={list.isLoading}
            refreshing={list.isFetching && !list.isLoading}
            error={list.error}
            onRetry={() => list.refetch()}
            onRefresh={() => list.refetch()}
            search={{
              value: search,
              onChange: (v) => {
                setSearch(v);
                resetPage();
              },
              placeholder: "Order number, name or phone",
            }}
            filters={
              <>
                <SegmentedControl<StatusFilter>
                  aria-label="Payment status"
                  sx={{ width: { xs: "100%", sm: "auto" }, "& .MuiToggleButton-root": { flex: { xs: "1 1 auto", sm: "0 0 auto" }, px: { xs: 1, sm: 1.75 } } }}
                  value={status}
                  onChange={(v) => {
                    setParam({ status: v });
                    resetPage();
                  }}
                  options={STATUS_OPTIONS}
                />
                <SelectField<OrderKind>
                  label="Type"
                  size="small"
                  fullWidth={false}
                  minWidth={150}
                  value={kind === "all" ? "" : kind}
                  emptyOption="All types"
                  onChange={(v) => {
                    setParam({ type: v || null });
                    resetPage();
                  }}
                  options={KIND_OPTIONS}
                />
              </>
            }
            activeFilterCount={activeFilters}
            onClearFilters={() => {
              setParam({ status: null, type: null });
              setRange(defaultDateRange("today"));
              resetPage();
            }}
            pagination={{ ...page, rowCount: list.data?.pagination.total ?? 0, onChange: (p, s) => setPage({ page: p, pageSize: s }) }}
            exportCsv={{ filename: `orders-${range.from}_${range.to}`, fetchAll: () => fetchAllOrders(filters) }}
            onRowClick={(o) => setParam({ order: o.id }, true)}
            empty={{
              title: "No orders in this period",
              description: "Counter sales, gaming sessions and website orders all show up here.",
            }}
          />
        </Box>
      </Stack>

      <OrderDrawer
        orderId={openId}
        onClose={() => setParam({ order: null })}
        onTakePayment={setPayFor}
        onPrint={setPrintFor}
      />
      <PaymentDialog orderId={payFor} open={Boolean(payFor)} onClose={() => setPayFor(null)} />
      <ReceiptDialog orderId={printFor} open={Boolean(printFor)} onClose={() => setPrintFor(null)} />
    </Box>
  );
};

export default Orders;
