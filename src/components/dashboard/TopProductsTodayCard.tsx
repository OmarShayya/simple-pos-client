import React from "react";
import { Box, Typography } from "@mui/material";
import { EmojiEventsOutlined } from "@mui/icons-material";
import { EmptyState, MoneyText, SectionCard } from "@/components/ui";
import { plural } from "@/utils/format";
import type { TopProductTodayRow } from "@/types/dashboard.types";
import { DashboardList, DashboardListRow, DashboardListSkeleton } from "./DashboardList";

/** Today's five best sellers (revenue only for managers). */
const TopProductsTodayCard: React.FC<{ rows: TopProductTodayRow[] | undefined; loading: boolean }> = ({ rows, loading }) => (
  <SectionCard title="Top products today" subtitle="Paid orders" flush divider>
    {loading ? (
      <DashboardListSkeleton rows={3} />
    ) : !rows || rows.length === 0 ? (
      <EmptyState compact icon={<EmojiEventsOutlined />} title="Nothing sold yet today" />
    ) : (
      <DashboardList label="Top products today">
        {rows.map((p, i) => (
          <DashboardListRow
            key={p.name}
            leading={
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "action.hover", display: "grid", placeItems: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {i + 1}
                </Typography>
              </Box>
            }
            title={p.name}
            subtitle={`${plural(p.quantity, "sold", "sold")}`}
            trailing={p.revenue !== null ? <MoneyText value={p.revenue} sx={{ fontWeight: 600 }} /> : undefined}
          />
        ))}
      </DashboardList>
    )}
  </SectionCard>
);

export default TopProductsTodayCard;
