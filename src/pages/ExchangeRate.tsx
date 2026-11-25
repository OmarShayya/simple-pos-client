import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { EditOutlined, SwapHorizRounded } from "@mui/icons-material";
import { DataTable, DateField, FormDialog, KpiCard, MoneyField, PageHeader, SectionCard, SegmentedControl, StatusChip } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { useCurrentRate, useRateHistory, useUpdateRate } from "@/components/exchange/exchangeQueries";
import { useAuthStore } from "@/store/authStore";
import { dayKey, formatDate, formatLbp, formatNumber, formatPercent, formatUsd, percentChange } from "@/utils/format";
import { todayKey } from "@/utils/dateRanges";
import type { ExchangeRateRecord } from "@/types/exchangeRate.types";

type Direction = "usd" | "lbp";

const UpdateRateDialog: React.FC<{ open: boolean; current?: number; onClose: () => void }> = ({ open, current, onClose }) => {
  const [rate, setRate] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useUpdateRate();

  useEffect(() => {
    if (!open) return;
    setRate(current ?? null);
    setNotes("");
    setTouched(false);
  }, [open, current]);

  const change = rate && current ? percentChange(rate, current) : null;
  const invalid = !rate || rate < 1000;
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Update the exchange rate"
      subtitle="Applies right away to new prices, orders and LBP payments. Past orders keep their rate."
      onSubmit={() => {
        setTouched(true);
        if (!invalid) save.mutate({ rate: rate!, notes: notes.trim() || undefined }, { onSuccess: onClose });
      }}
      submitLabel="Update rate"
      loading={save.isPending}
      maxWidth="xs"
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <MoneyField
          label="LBP for 1 USD"
          currency="LBP"
          value={rate}
          onChange={setRate}
          required
          autoFocus
          error={touched && invalid}
          helperText={touched && invalid ? "Enter the rate in LBP, e.g. 89,500" : current ? `Now: ${formatLbp(current)}` : undefined}
        />
        {change !== null && Math.abs(change) >= 0.01 && (
          <Alert severity={Math.abs(change) >= 20 ? "warning" : "info"}>
            {formatLbp(current)} → <b>{formatLbp(rate)}</b> ({formatPercent(change, 1, true)})
            {Math.abs(change) >= 20 && ". That's a big change — please check the number."}
          </Alert>
        )}
        <TextField label="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Market rate this morning" slotProps={{ htmlInput: { maxLength: 200 } }} />
      </Stack>
    </FormDialog>
  );
};

/** The USD → LBP rate: current value, a quick converter and the history of changes. */
const ExchangeRate: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "manager";
  const current = useCurrentRate();
  const history = useRateHistory(canEdit);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("usd");
  const [amount, setAmount] = useState<number | null>(10);
  const [since, setSince] = useState<string | null>(null);

  const rate = current.data?.rate;
  const latest = history.data?.[0];
  const rows = useMemo(() => (history.data ?? []).filter((r) => !since || dayKey(r.createdAt) >= since), [history.data, since]);
  const result = rate && amount !== null ? (direction === "usd" ? formatLbp(amount * rate) : formatUsd(amount / rate)) : "—";

  const columns: DataTableColumn<ExchangeRateRecord>[] = [
    { field: "createdAt", header: "Changed", type: "datetime", width: 210, mobile: "title" },
    { field: "rate", header: "Rate", type: "number", value: (r) => r.rate, render: (r) => <b>{formatLbp(r.rate)}</b>, width: 150, mobile: "end" },
    {
      field: "change",
      header: "Change",
      value: (r) => (r.previousRate ? percentChange(r.rate, r.previousRate) : null),
      render: (r) => {
        const c = r.previousRate ? percentChange(r.rate, r.previousRate) : null;
        if (c === null || Math.abs(c) < 0.005) return <Box component="span" sx={{ color: "text.secondary" }}>No change</Box>;
        return <StatusChip status="change" label={`${formatPercent(c, 2, true)} (was ${formatNumber(r.previousRate)})`} tone={c > 0 ? "warning" : "info"} dot={false} />;
      },
      csv: (r) => (r.previousRate ? percentChange(r.rate, r.previousRate)?.toFixed(2) ?? "" : ""),
      sortable: false,
      minWidth: 200,
    },
    { field: "updatedBy", header: "By", value: (r) => r.updatedBy?.name, width: 160, mobile: "subtitle" },
    { field: "notes", header: "Note", flex: 1, minWidth: 160, hideBelow: "md" },
  ];

  return (
    <Box>
      <PageHeader
        title="Exchange rate"
        subtitle="The dollar rate used for LBP prices and LBP payments."
        actions={
          canEdit && (
            <Button variant="contained" startIcon={<EditOutlined />} onClick={() => setOpen(true)} disabled={!rate}>
              Update rate
            </Button>
          )
        }
      />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 2fr)" }, mb: 3 }}>
        <KpiCard
          label="1 USD ="
          value={rate ? formatLbp(rate) : null}
          loading={current.isLoading}
          hint={latest ? `Set ${formatDate(latest.createdAt)}${latest.updatedBy?.name ? ` by ${latest.updatedBy.name}` : ""}` : undefined}
        />
        <SectionCard title="Quick converter">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <SegmentedControl<Direction>
              aria-label="Convert from"
              value={direction}
              onChange={(d) => setDirection(d)}
              options={[
                { value: "usd", label: "USD → LBP" },
                { value: "lbp", label: "LBP → USD" },
              ]}
            />
            <Box sx={{ width: { xs: "100%", sm: 200 } }}>
              <MoneyField label="Amount" currency={direction === "usd" ? "USD" : "LBP"} value={amount} onChange={setAmount} />
            </Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <SwapHorizRounded sx={{ color: "text.secondary" }} />
              <Typography variant="h6" component="output" aria-live="polite" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }} noWrap>
                {result}
              </Typography>
            </Stack>
          </Stack>
        </SectionCard>
      </Box>

      {canEdit ? (
        <DataTable<ExchangeRateRecord>
          title="History"
          label="Exchange rate history"
          rows={rows}
          getRowId={(r) => r.id ?? r._id ?? r.createdAt}
          columns={columns}
          loading={history.isLoading}
          refreshing={history.isFetching && !history.isLoading}
          error={history.error}
          onRetry={() => history.refetch()}
          onRefresh={() => {
            history.refetch();
            current.refetch();
          }}
          search={{ placeholder: "Search notes or names" }}
          filters={<DateField label="Changed since" size="small" value={since} onChange={setSince} maxDate={todayKey()} fullWidth={false} />}
          activeFilterCount={since ? 1 : 0}
          onClearFilters={() => setSince(null)}
          initialSort={{ field: "createdAt", direction: "desc" }}
          exportCsv={{ filename: "exchange-rate-history" }}
          empty={{ title: since ? "No changes since that day" : "No changes yet" }}
        />
      ) : (
        <Alert severity="info">Only admins and managers can change the rate.</Alert>
      )}

      <UpdateRateDialog open={open} current={rate} onClose={() => setOpen(false)} />
    </Box>
  );
};

export default ExchangeRate;
