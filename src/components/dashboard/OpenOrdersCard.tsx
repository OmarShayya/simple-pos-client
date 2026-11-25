import React from "react";
import { Button } from "@mui/material";
import { ReceiptLongOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { CodeText, EmptyState, MoneyText, SectionCard, StatusChip } from "@/components/ui";
import { formatRelative, plural } from "@/utils/format";
import type { OpenOrderRow } from "@/types/dashboard.types";
import { DashboardList, DashboardListRow, DashboardListSkeleton } from "./DashboardList";

/** Website orders first (someone is waiting for them), then the rest, newest first. */
const sortOrders = (rows: OpenOrderRow[]) => [...rows].sort((a, b) => Number(b.source === "website") - Number(a.source === "website"));

/** Unpaid orders (counter, gaming and website). Each row opens the order; "View all" opens the filtered list. */
const OpenOrdersCard: React.FC<{ rows: OpenOrderRow[] | undefined; total?: number; loading: boolean; now: Date }> = ({ rows, total, loading, now }) => {
  const list = sortOrders(rows ?? []);
  const website = list.filter((o) => o.source === "website").length;
  return (
    <SectionCard
      title={`Open orders${rows ? ` (${Math.max(total ?? 0, rows.length)})` : ""}`}
      subtitle={website ? `${plural(website, "website order")} waiting` : "Waiting for payment"}
      flush
      divider
      action={
        <Button component={RouterLink} to="/orders?status=pending" variant="text">
          View all
        </Button>
      }
    >
      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : list.length === 0 ? (
        <EmptyState compact icon={<ReceiptLongOutlined />} title="All paid" description="No orders are waiting for payment." />
      ) : (
        <DashboardList label="Open orders">
          {list.map((o) => (
            <DashboardListRow
              key={o.id}
              to={`/orders?order=${o.id}`}
              ariaLabel={`Open order ${o.invoiceNumber} for ${o.customerName || "walk-in"}`}
              title={o.customerName || "Walk-in"}
              subtitle={
                <>
                  <CodeText>{o.invoiceNumber}</CodeText>
                  <span>{formatRelative(o.createdAt, now)}</span>
                  {o.source === "website" && <StatusChip status="website" kind="source" />}
                  {o.hasActiveSessions ? <StatusChip status="active" kind="session" label="Playing" /> : o.hasGaming ? <StatusChip status="gaming" kind="generic" label="Gaming" tone="neutral" /> : null}
                </>
              }
              trailing={<MoneyText value={o.totals.usd} sx={{ fontWeight: 600 }} />}
            />
          ))}
          {(total ?? 0) > list.length && <DashboardListRow to="/orders?status=pending" title={`${plural((total ?? 0) - list.length, "more open order")}`} subtitle="See all unpaid orders" />}
        </DashboardList>
      )}
    </SectionCard>
  );
};

export default OpenOrdersCard;
