import React, { useState } from "react";
import { Box, Button, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";
import { DeleteOutlineRounded, EditOutlined, PhoneRounded, WhatsApp } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { DataTable, DetailDrawer, ErrorState, InfoList, KpiCard, MoneyText, SegmentedControl, SectionCard } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate, formatRelative, plural } from "@/utils/format";
import { formatPhone, phoneHref } from "@/utils/phone";
import type { Customer, CustomerOrderRow, CustomerReservationRow, CustomerSessionRow } from "@/types/customer.types";
import { useReservationSettings } from "@/components/reservations/reservationQueries";
import { reservationHref } from "@/components/reservations/reservationDates";
import { useCustomer, useCustomerActivity, useCustomerMutations } from "./customerQueries";
import CustomerSourceChip from "./CustomerSourceChip";
import { CUSTOMER_SOURCE, formatAddress, isPlaceholderName } from "./customerFormat";

export interface CustomerDrawerProps {
  /** Customer to show; null closes the drawer. */
  customerId: string | null;
  /** Row data to show instantly while the full record loads. */
  fallback?: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

type Tab = "orders" | "bookings" | "sessions";

const orderColumns: DataTableColumn<CustomerOrderRow>[] = [
  { field: "invoiceNumber", header: "Invoice", type: "code", width: 140, mobile: "title" },
  { field: "createdAt", header: "Date", type: "smartDateTime", mobile: "subtitle" },
  { field: "status", header: "Status", type: "status", statusKind: "order", width: 110 },
  { field: "total", header: "Total", type: "money", value: (o) => o.totals.usd, width: 100 },
];

const bookingColumns: DataTableColumn<CustomerReservationRow>[] = [
  { field: "startTime", header: "When", type: "datetime", mobile: "title" },
  { field: "stations", header: "Stations", value: (r) => r.stations.join(", "), mobile: "subtitle" },
  { field: "status", header: "Status", type: "status", statusKind: "reservation", width: 120 },
  { field: "code", header: "Code", type: "code", width: 96, mobile: "meta" },
];

const sessionColumns: DataTableColumn<CustomerSessionRow>[] = [
  { field: "station", header: "Station", value: (s) => s.station?.pcNumber ?? "—", width: 96, mobile: "title" },
  { field: "startTime", header: "Started", type: "smartDateTime", mobile: "subtitle" },
  { field: "durationMinutes", header: "Time", type: "duration", width: 84 },
  { field: "paymentStatus", header: "Payment", type: "status", statusKind: "payment", width: 104 },
  { field: "amount", header: "Amount", type: "money", value: (s) => s.amount?.usd, width: 96 },
];

/**
 * Everything about one customer: contact details, totals, and their recent orders, bookings
 * and gaming sessions (each row opens it on its own screen). Edit / remove from here.
 */
const CustomerDrawer: React.FC<CustomerDrawerProps> = ({ customerId, fallback, onClose, onEdit }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("orders");
  const detail = useCustomer(customerId);
  const activity = useCustomerActivity(customerId);
  const settings = useReservationSettings();
  const { deactivate } = useCustomerMutations();

  const customer = detail.data ?? (fallback && fallback.id === customerId ? fallback : null);
  const a = activity.data;
  const loadingTotals = activity.isLoading;

  const remove = async () => {
    if (!customer) return;
    const ok = await confirm({
      title: `Remove ${customer.name}?`,
      message: "They disappear from the customer list. Their orders and bookings are kept, and adding the same phone number again brings them back.",
      confirmLabel: "Remove customer",
      tone: "danger",
    });
    if (ok) deactivate.mutate(customer, { onSuccess: onClose });
  };

  const tel = customer ? phoneHref(customer.phone, customer.phoneCountry) : undefined;
  const waNumber = tel?.replace("tel:+", "");

  const table = (() => {
    const common = { loading: activity.isLoading, error: activity.error, onRetry: () => activity.refetch(), density: "compact" as const, pageSize: 10, pageSizeOptions: [10] };
    if (tab === "orders")
      return (
        <DataTable<CustomerOrderRow>
          label="Recent orders"
          rows={a?.orders}
          columns={orderColumns}
          onRowClick={(o) => navigate(`/orders?order=${o.id}`)}
          empty={{ title: "No orders yet", description: "Counter, gaming and website orders for this customer show up here." }}
          {...common}
        />
      );
    if (tab === "bookings")
      return (
        <DataTable<CustomerReservationRow>
          label="Bookings"
          rows={a?.reservations}
          columns={bookingColumns}
          onRowClick={(r) => navigate(reservationHref(r, settings.data?.schedule, settings.data?.timezone))}
          empty={{ title: "No bookings", description: "Station bookings from the website or the counter show up here." }}
          {...common}
        />
      );
    return (
      <DataTable<CustomerSessionRow>
        label="Gaming sessions"
        rows={a?.sessions}
        columns={sessionColumns}
        onRowClick={(s) => s.orderId && navigate(`/orders?order=${s.orderId}`)}
        empty={{ title: "No gaming sessions yet" }}
        {...common}
      />
    );
  })();

  return (
    <DetailDrawer
      open={Boolean(customerId)}
      onClose={onClose}
      title={customer?.name ?? "Customer"}
      subtitle={
        customer && (
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" component="span">
            <CustomerSourceChip source={customer.source} />
            <span>
              {CUSTOMER_SOURCE[customer.source ?? "pos"]?.long} · since {formatDate(customer.createdAt)}
            </span>
          </Stack>
        )
      }
      headerActions={
        customer && (
          <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => onEdit(customer)}>
            Edit
          </Button>
        )
      }
      footer={
        customer && (
          <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={remove} disabled={deactivate.isPending} sx={{ mr: "auto" }}>
            Remove customer
          </Button>
        )
      }
    >
      {detail.isError && !customer ? (
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      ) : (
        <Stack spacing={3}>
          {customer && isPlaceholderName(customer.name) && (
            <Typography variant="body2" color="text.secondary">
              Created automatically from a phone number. Tap <b>Edit</b> to add their real name.
            </Typography>
          )}

          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <KpiCard label="Spent" value={a?.totals.spentUsd} format="money" loading={loadingTotals} />
            <KpiCard label="Visits" value={a?.totals.visits} format="number" loading={loadingTotals} />
            <KpiCard label="Last visit" value={a ? (a.totals.lastVisit ? formatRelative(a.totals.lastVisit) : "Never") : null} loading={loadingTotals} />
            <KpiCard label="Bookings" value={a?.totals.reservations} format="number" loading={loadingTotals} />
          </Box>

          <SectionCard title="Contact" variant="plain" divider>
            <InfoList
              loading={!customer}
              items={[
                {
                  label: "Phone",
                  value: customer && (
                    <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                      <Link href={tel} underline="hover" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                        {formatPhone(customer.phone, customer.phoneCountry)}
                      </Link>
                      {tel && (
                        <Tooltip title="Call">
                          <IconButton size="small" component="a" href={tel} aria-label={`Call ${customer.name}`}>
                            <PhoneRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {waNumber && (
                        <Tooltip title="Message on WhatsApp">
                          <IconButton size="small" component="a" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${customer.name}`}>
                            <WhatsApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  ),
                },
                { label: "Email", value: customer?.email && <Link href={`mailto:${customer.email}`} underline="hover">{customer.email}</Link> },
                { label: "Address", value: formatAddress(customer?.address) },
                {
                  label: "Balance",
                  value: customer && (customer.balance.usd || customer.balance.lbp) ? <MoneyText value={customer.balance.usd} lbp={customer.balance.lbp || undefined} /> : null,
                  hideEmpty: true,
                },
                { label: "Notes", value: customer?.notes, hideEmpty: true },
              ]}
            />
          </SectionCard>

          <SectionCard title="History" variant="plain" divider>
            <Stack spacing={2}>
              <SegmentedControl<Tab>
                aria-label="Show"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "orders", label: "Orders", count: a?.orders.length },
                  { value: "bookings", label: "Bookings", count: a?.reservations.length },
                  { value: "sessions", label: "Sessions", count: a?.sessions.length },
                ]}
              />
              {table}
              {a && (
                <Typography variant="body2" color="text.secondary">
                  {plural(a.totals.orders, "paid order")} in total. The latest 20 of each are listed — tap a row to open it.
                </Typography>
              )}
            </Stack>
          </SectionCard>
        </Stack>
      )}
    </DetailDrawer>
  );
};

export default CustomerDrawer;
