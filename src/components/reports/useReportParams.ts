import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { reportApi } from "@/api/report.api";
import { dayKey } from "@/utils/format";
import type { ReportPeriod } from "@/types/report.types";
import { isDayString, isReportPeriod, isSamePeriod } from "./reportPeriods";

/**
 * Report selection lives in the URL (`/reports?period=week&date=2026-11-25`) so a report can be
 * bookmarked or shared. Unknown or future values fall back to today's Day report.
 */
export function useReportParams() {
  const [params, setParams] = useSearchParams();
  const today = dayKey();
  const rawPeriod = params.get("period");
  const rawDate = params.get("date");
  const period: ReportPeriod = isReportPeriod(rawPeriod) ? rawPeriod : "day";
  const date = isDayString(rawDate) && rawDate <= today ? rawDate : today;

  const select = useCallback(
    (next: { period?: ReportPeriod; date?: string }) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          out.set("period", next.period ?? period);
          out.set("date", next.date ?? date);
          return out;
        },
        { replace: true }
      ),
    [setParams, period, date]
  );

  return { period, date, today, select, isCurrent: isSamePeriod(period, date, today) };
}

/** The summary for one period. Paging within a period keeps the old numbers on screen while loading. */
export function useReportSummary(period: ReportPeriod, date: string, { enabled = true, live = false } = {}) {
  const queryKey = useMemo(() => queryKeys.reports.summary(period, date), [period, date]);
  return useQuery({
    queryKey,
    queryFn: () => reportApi.getSummary(period, date),
    enabled,
    // Same period type → keep the previous report visible (with a progress bar) instead of skeletons
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === period ? keepPreviousData(previous) : undefined),
    // The running period keeps itself up to date while the page is open
    refetchInterval: live ? 60_000 : false,
  });
}
