import React from "react";
import { Box, Button, Grid, Stack } from "@mui/material";
import { EventBusyOutlined } from "@mui/icons-material";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui";
import { dayKey, formatNumber, formatUsd, plural } from "@/utils/format";
import type { ReportPeriod, ReportSummary } from "@/types/report.types";
import ReportKpis from "./ReportKpis";
import RevenueChart from "./RevenueChart";
import StatList, { type StatItem } from "./StatList";
import PaymentsCard from "./PaymentsCard";
import CategoriesCard from "./CategoriesCard";
import TopProductsTable from "./TopProductsTable";
import CashiersTable from "./CashiersTable";
import StationsSection from "./StationsSection";
import BusiestHoursStrip from "./BusiestHoursStrip";
import TimelineTable from "./TimelineTable";
import { PERIODS, bucketStarted, periodLabel, type ReportSectionId } from "./reportPeriods";
import { isEmptyReport, reportHighlights } from "./reportInsights";

export interface ReportViewProps {
  period: ReportPeriod;
  date: string;
  today: string;
  data: ReportSummary | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** "vs last week so far" */
  previousLabel: string;
  onSelect: (next: { period?: ReportPeriod; date?: string }) => void;
}

const money = (v: number) => formatUsd(v);
const count = (v: number) => formatNumber(v);

const moreNumbers = (data: ReportSummary | undefined): StatItem[] => {
  const k = data?.kpis;
  return [
    { label: "Gaming revenue", value: k?.gamingRevenue.value, previous: k?.gamingRevenue.previous, format: money },
    { label: "Product revenue", value: k?.productRevenue.value, previous: k?.productRevenue.previous, format: money, note: "Drinks, snacks and food" },
    { label: "Sessions started", value: k?.sessions.value, previous: k?.sessions.previous, format: count },
    { label: "Discounts given", value: k?.discounts.value, previous: k?.discounts.previous, format: money, goodDirection: "down" },
    { label: "New customers", value: k?.newCustomers.value, previous: k?.newCustomers.previous, format: count },
    { label: "Website orders", value: k?.websiteOrders.value, previous: k?.websiteOrders.previous, format: count, note: "Placed from the online menu" },
    { label: "Bookings", value: k?.reservations.value, previous: k?.reservations.previous, format: count },
    {
      label: "No-shows",
      value: k?.noShows.value,
      previous: k?.noShows.previous,
      format: count,
      goodDirection: "down",
      note: k && k.reservations.value ? `of ${plural(k.reservations.value, "booking")}` : undefined,
    },
  ];
};

/**
 * One layout for every period: KPIs → main chart with "more numbers" beside it → the sections the
 * period lists in `PERIODS[period].layout` (two per row on wide screens). Day / Week / Month / Year
 * differ only by that config, never by copied markup.
 */
const ReportView: React.FC<ReportViewProps> = ({ period, date, today, data, loading, error, onRetry, previousLabel, onSelect }) => {
  const config = PERIODS[period];

  if (error && !data) {
    return (
      <SectionCard>
        <ErrorState title="Couldn't load this report" error={error} onRetry={onRetry} />
      </SectionCard>
    );
  }

  const empty = data && !loading && isEmptyReport(data);
  const k = data?.kpis;
  // Tables list only buckets that have started (no rows of zeros for the rest of the week)
  const startedBuckets = data?.series.filter((p) => bucketStarted(period, p, dayKey(data.range.start), today));

  const sections: Record<ReportSectionId, React.ReactNode> = {
    timeline: <TimelineTable period={period} rows={startedBuckets} loading={loading} />,
    busiestHours: <BusiestHoursStrip rows={data?.busiestHours} loading={loading} />,
    payments: <PaymentsCard rows={data?.byPaymentMethod} loading={loading} />,
    categories: <CategoriesCard rows={data?.byCategory} loading={loading} />,
    topProducts: <TopProductsTable rows={data?.topProducts} productRevenue={k?.productRevenue.value ?? 0} loading={loading} />,
    cashiers: <CashiersTable rows={data?.cashiers} loading={loading} />,
    stations: <StationsSection data={data} loading={loading} />,
  };

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <ReportKpis data={data} trend={startedBuckets?.map((p) => p.revenue)} loading={loading} previousLabel={previousLabel} />

      {empty ? (
        <SectionCard>
          <EmptyState
            icon={<EventBusyOutlined />}
            title={`No sales ${period === "day" ? "on" : "in"} ${periodLabel(period, date)}`}
            description="Nothing was paid and no station was used in this period. The lounge may have been closed, or this is before the POS was in use."
            action={
              date !== today && (
                <Button variant="outlined" onClick={() => onSelect({ date: today })}>
                  Go to {config.currentLabel.toLowerCase()}
                </Button>
              )
            }
          />
        </SectionCard>
      ) : (
        <>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <RevenueChart
                period={period}
                data={data}
                loading={loading}
                error={error}
                onRetry={onRetry}
                highlights={data ? reportHighlights(data, today) : undefined}
                onDrill={onSelect}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="More numbers" subtitle={previousLabel.replace(/^vs/, "Change vs")}>
                <StatList items={moreNumbers(data)} previousLabel={previousLabel} loading={loading} />
              </SectionCard>
            </Grid>
          </Grid>

          {config.layout.map((row) => (
            <Grid container spacing={{ xs: 2, md: 3 }} key={row.join("-")} sx={{ breakInside: "avoid" }}>
              {row.map((id) => (
                <Grid key={id} size={{ xs: 12, lg: 12 / row.length }}>
                  <Box sx={{ height: "100%" }}>{sections[id]}</Box>
                </Grid>
              ))}
            </Grid>
          ))}
        </>
      )}
    </Stack>
  );
};

export default ReportView;
