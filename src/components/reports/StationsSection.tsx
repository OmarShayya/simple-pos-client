import React, { useMemo } from "react";
import { Grid } from "@mui/material";
import { ComputerOutlined, SportsEsportsOutlined } from "@mui/icons-material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartCard, DataTable, KpiCard, SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatNumber, formatUsd } from "@/utils/format";
import type { ReportSummary, StationRow } from "@/types/report.types";
import type { StationType } from "@/types/reservation.types";
import { stationColumns } from "./reportColumns";
import { SECTION_COPY } from "./reportPeriods";
import { averageBusy, busyScaleMax, stationTypeSummary, stationsSubtitle } from "./reportInsights";

export interface StationsSectionProps {
  data: ReportSummary | undefined;
  loading: boolean;
}

/**
 * PCs vs PS5 rooms side by side, then how busy each station was (share of opening hours in use)
 * and the full table. Helps decide pricing, maintenance and whether to add stations.
 */
const StationsSection: React.FC<StationsSectionProps> = ({ data, loading }) => {
  const chart = useChartDefaults();
  const rows = useMemo(() => data?.stations ?? [], [data]);
  const split = data?.byStationType;
  const typeColor = (t: StationType) => (t === "playstation" ? chart.colors.playstation : chart.colors.pc);
  const axisMax = busyScaleMax(rows) * 100;

  const tile = (type: StationType) => {
    const totals = split?.[type];
    const busy = averageBusy(rows, type);
    return (
      <KpiCard
        label={type === "pc" ? "PCs" : "PS5 rooms"}
        icon={type === "pc" ? <ComputerOutlined /> : <SportsEsportsOutlined />}
        value={totals?.revenue}
        format="money"
        loading={loading}
        hint={totals && stationTypeSummary(totals, busy)}
      />
    );
  };

  return (
    <SectionCard variant="plain" title={SECTION_COPY.stations.title} subtitle={stationsSubtitle(data?.openHours ?? 0)}>
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        <Grid size={{ xs: 12, sm: 6 }}>{tile("pc")}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{tile("playstation")}</Grid>
        <Grid size={12}>
          <ChartCard
            title="How busy each station was"
            legend={[
              { label: "PC", color: chart.colors.pc },
              { label: "PS5 room", color: chart.colors.playstation },
            ]}
            height={Math.max(160, rows.length * 28 + 56)}
            loading={loading}
            empty={!loading && rows.length === 0}
            emptyTitle="No stations yet"
          >
            <BarChart
              {...chart.bar}
              layout="horizontal"
              height={Math.max(160, rows.length * 28 + 56)}
              margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
              grid={{ vertical: true }}
              yAxis={[
                {
                  scaleType: "band",
                  data: rows.map((r) => r.pcNumber),
                  width: 64,
                  categoryGapRatio: 0.35,
                  colorMap: { type: "ordinal", values: rows.map((r) => r.pcNumber), colors: rows.map((r) => typeColor(r.type)) },
                  valueFormatter: (v: string, ctx) => {
                    const r = rows.find((x) => x.pcNumber === v);
                    return ctx.location === "tooltip" && r ? `${r.pcNumber} · ${r.name} — ${formatNumber(r.hours, 1)} h, ${formatUsd(r.revenue)}` : v;
                  },
                },
              ]}
              xAxis={[{ min: 0, max: axisMax, tickNumber: 5, valueFormatter: (v: number) => `${v}%`, label: "Busy (% of opening hours)", height: 48 }]}
              series={[
                {
                  id: "busy",
                  label: "Busy",
                  data: rows.map((r) => (r.utilization === null ? 0 : Math.round(r.utilization * 1000) / 10)),
                  valueFormatter: (v) => (v == null ? "—" : `${formatNumber(v, 1)}%`),
                },
              ]}
              sx={{ ...chart.bar.sx, "& .MuiChartsAxis-label": { fontSize: "0.8125rem", fill: chart.colors.text } }}
            />
          </ChartCard>
        </Grid>
        <Grid size={12}>
          <DataTable<StationRow>
            label="Stations"
            rows={data?.stations}
            columns={stationColumns}
            loading={loading}
            density="compact"
            phoneLayout="table"
            pageSize={50}
            pageSizeOptions={[50]}
            initialSort={{ field: "revenue", direction: "desc" }}
            empty={{ title: "No stations yet" }}
          />
        </Grid>
      </Grid>
    </SectionCard>
  );
};

export default StationsSection;
