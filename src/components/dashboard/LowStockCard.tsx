import React from "react";
import { Button } from "@mui/material";
import { Inventory2Outlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState, SectionCard, StatusChip } from "@/components/ui";
import type { LowStockRow } from "@/types/dashboard.types";
import { DashboardList, DashboardListRow, DashboardListSkeleton } from "./DashboardList";

const MAX_ROWS = 6;
/** Products with the "Low stock" filter on. */
const LOW_STOCK_HREF = "/products?stock=low";

/** Products at or under their reorder level, lowest first. */
const LowStockCard: React.FC<{ rows: LowStockRow[] | undefined; loading: boolean; canManage: boolean }> = ({ rows, loading, canManage }) => (
  <SectionCard
    title={`Low stock${rows?.length ? ` (${rows.length})` : ""}`}
    subtitle="Reorder soon"
    flush
    divider
    action={
      canManage && (
        <Button component={RouterLink} to={LOW_STOCK_HREF} variant="text">
          Products
        </Button>
      )
    }
  >
    {loading ? (
      <DashboardListSkeleton rows={3} />
    ) : !rows || rows.length === 0 ? (
      <EmptyState compact icon={<Inventory2Outlined />} title="Stock looks good" />
    ) : (
      <DashboardList label="Low stock">
        {rows.slice(0, MAX_ROWS).map((p) => (
          <DashboardListRow
            key={p.id}
            to={canManage ? LOW_STOCK_HREF : undefined}
            title={p.name}
            subtitle={`Reorder at ${p.threshold}`}
            trailing={p.stock <= 0 ? <StatusChip status="out" kind="stock" /> : <StatusChip status="low" kind="stock" label={`${p.stock} left`} />}
          />
        ))}
        {rows.length > MAX_ROWS && <DashboardListRow to={canManage ? LOW_STOCK_HREF : undefined} title={`${rows.length - MAX_ROWS} more products low`} />}
      </DashboardList>
    )}
  </SectionCard>
);

export default LowStockCard;
