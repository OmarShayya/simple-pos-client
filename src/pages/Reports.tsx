import React from "react";
import { Box, Button, LinearProgress } from "@mui/material";
import { FileDownloadOutlined, LockOutlined, PrintOutlined } from "@mui/icons-material";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth.types";
import PeriodNavigator from "@/components/reports/PeriodNavigator";
import ReportView from "@/components/reports/ReportView";
import ReportPrintView from "@/components/reports/ReportPrint";
import { useReportParams, useReportSummary } from "@/components/reports/useReportParams";
import { PERIODS, comparisonLabel } from "@/components/reports/reportPeriods";
import { downloadReportCsv } from "@/components/reports/reportCsv";

/**
 * Reports: one page, four period views (Day / Week / Month / Year) built from the same layout.
 * The selection is in the URL so a report can be bookmarked or sent to someone.
 */
const Reports: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const { period, date, today, select, isCurrent } = useReportParams();
  const query = useReportSummary(period, date, { enabled: canView, live: isCurrent });
  const config = PERIODS[period];

  // The API says whether the comparison is cut to the same point ("to-date"); before it answers, infer it
  const data = query.data;
  const comparison = data?.comparison ?? (isCurrent ? "to-date" : "full");
  const previousLabel = comparisonLabel(period, comparison, data?.previous.label);
  const note = data
    ? comparison === "to-date"
      ? `This ${config.noun} isn't over yet, so changes are compared with the same point of ${data.previous.label}.`
      : `Changes are compared with ${data.previous.label}.`
    : undefined;
  const stale = query.isPlaceholderData || (query.isFetching && !query.isLoading);
  // Paper shows the report that's on screen, never the previous period's placeholder
  const printable = data && !query.isPlaceholderData ? data : undefined;

  if (!canView) {
    return (
      <Box>
        <PageHeader title="Reports" />
        <SectionCard>
          <EmptyState icon={<LockOutlined />} title="Reports are for managers" description="Ask a manager or the owner if you need sales numbers. Today's activity is on the Dashboard." />
        </SectionCard>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Sales, gaming and stations for any day, week, month or year"
        actions={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", width: { xs: "100%", sm: "auto" }, "& > .MuiButton-root": { flex: { xs: 1, sm: "0 0 auto" } } }}>
            <Button variant="outlined" startIcon={<PrintOutlined />} onClick={() => window.print()} disabled={!printable}>
              Print
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => printable && downloadReportCsv(printable, date)} disabled={!printable}>
              Download CSV
            </Button>
          </Box>
        }
      />

      <PeriodNavigator period={period} date={date} today={today} onChange={select} note={note} />

      <Box sx={{ position: "relative" }}>
        {stale && <LinearProgress aria-label="Loading report" sx={{ position: "absolute", top: -12, left: 0, right: 0, height: 2, borderRadius: 0 }} />}
        <ReportView
          period={period}
          date={date}
          today={today}
          data={data}
          loading={query.isLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          previousLabel={previousLabel}
          onSelect={select}
        />
      </Box>

      {printable && note && <ReportPrintView data={printable} period={period} today={today} previousLabel={previousLabel} comparisonNote={note} />}
    </Box>
  );
};

export default Reports;
