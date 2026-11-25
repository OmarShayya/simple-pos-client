import React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { ChevronLeftRounded, ChevronRightRounded, TodayOutlined } from "@mui/icons-material";
import { DateField, SegmentedControl } from "@/components/ui";
import type { ReportPeriod } from "@/types/report.types";
import { PERIODS, REPORT_PERIODS, isSamePeriod, periodLabel, shiftPeriodStart, stepDate } from "./reportPeriods";

export interface PeriodNavigatorProps {
  period: ReportPeriod;
  date: string;
  today: string;
  onChange: (next: { period?: ReportPeriod; date?: string }) => void;
  /** Shown under the period name ("Still running — compared with the same point last week"). */
  note?: React.ReactNode;
}

/**
 * The report's "where am I": a big Day / Week / Month / Year switch, then
 * "‹ 24–30 Nov 2026 ›" with a jump back to the current period and a calendar to pick any date.
 */
const PeriodNavigator: React.FC<PeriodNavigatorProps> = ({ period, date, today, onChange, note }) => {
  const config = PERIODS[period];
  const isCurrent = isSamePeriod(period, date, today);
  const canGoNext = shiftPeriodStart(period, date, 1) <= today;
  const prevText = `Previous ${config.noun}`;
  const nextText = `Next ${config.noun}`;

  return (
    <Stack spacing={2} sx={{ mb: { xs: 2, md: 3 } }} data-print-hide-controls>
      <SegmentedControl
        aria-label="Report period"
        size="large"
        value={period}
        onChange={(p) => onChange({ period: p })}
        options={REPORT_PERIODS.map((p) => ({ value: p, label: PERIODS[p].label }))}
        sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, "& .MuiToggleButton-root": { flex: { xs: 1, sm: "0 0 auto" }, minWidth: { sm: 104 } } }}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: { xs: "1 1 100%", md: "0 1 auto" } }}>
          <Tooltip title={prevText}>
            <IconButton aria-label={prevText} onClick={() => onChange({ date: stepDate(period, date, -1, today) })} sx={{ border: 1, borderColor: (t) => t.tokens.borderStrong }}>
              <ChevronLeftRounded />
            </IconButton>
          </Tooltip>
          <Typography
            component="h3"
            aria-live="polite"
            sx={{ flex: { xs: 1, md: "0 0 auto" }, minWidth: { md: 220 }, textAlign: "center", fontSize: { xs: "1.125rem", sm: "1.25rem" }, fontWeight: 600, px: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {periodLabel(period, date)}
          </Typography>
          <Tooltip title={canGoNext ? nextText : `This is the latest ${config.noun}`}>
            <span>
              <IconButton aria-label={nextText} disabled={!canGoNext} onClick={() => onChange({ date: stepDate(period, date, 1, today) })} sx={{ border: 1, borderColor: (t) => t.tokens.borderStrong }}>
                <ChevronRightRounded />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Wraps on narrow phones: the date picker needs ~240px to show "15 Oct 2026" */}
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}>
          <Button variant="outlined" startIcon={<TodayOutlined />} disabled={isCurrent} onClick={() => onChange({ date: today })} sx={{ flex: { xs: "1 1 auto", sm: "0 0 auto" }, minHeight: 48 }}>
            {config.currentLabel}
          </Button>
          <Box sx={{ flex: { xs: "1 1 240px", sm: "0 0 240px" }, minWidth: 240 }}>
            <DateField label="Pick a date" value={date} maxDate={today} clearable={false} onChange={(d) => d && onChange({ date: d })} />
          </Box>
        </Box>
      </Box>

      {note && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
          {note}
        </Typography>
      )}
    </Stack>
  );
};

export default PeriodNavigator;
