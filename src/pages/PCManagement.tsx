import React, { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import { Computer, DeleteOutlineRounded, EditOutlined, SportsEsports } from "@mui/icons-material";
import { DataTable, MoneyText, PageHeader, SegmentedControl, SelectField, StatusChip } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import StationFormDialog from "@/components/stations/StationFormDialog";
import { useAllStations, useStationMutations } from "@/components/stations/stationQueries";
import { distinctValues } from "@/components/stations/stationFormat";
import { useConfirm } from "@/hooks/useConfirm";
import { PCStatus, type PC } from "@/types/gaming.types";
import { STATION_TYPE_LABEL, type StationType } from "@/types/reservation.types";

type TypeFilter = "all" | StationType;

/** Add and edit gaming stations (PCs and PlayStation rooms): number, rate, zone, specs, maintenance. */
const PCManagement: React.FC = () => {
  const theme = useTheme();
  const confirm = useConfirm();
  const q = useAllStations();
  const { remove } = useStationMutations();
  const [type, setType] = useState<TypeFilter>("all");
  const [zone, setZone] = useState("");
  const [form, setForm] = useState<{ station: PC | null } | null>(null);

  const stations = useMemo(() => q.data?.data ?? [], [q.data]);
  const zones = useMemo(() => distinctValues(stations.map((s) => s.location)), [stations]);
  const count = (t: StationType) => stations.filter((s) => (s.type ?? "pc") === t).length;
  const rows = stations.filter((s) => (type === "all" || (s.type ?? "pc") === type) && (!zone || (s.location ?? "").trim().toLowerCase() === zone.toLowerCase()));

  const askDelete = async (s: PC) => {
    const ok = await confirm({
      title: `Delete ${s.pcNumber}?`,
      message: "It disappears from the stations screen, the website and bookings. To take it out of service for a while, edit it and switch on \"Under maintenance\" instead.",
      confirmLabel: "Delete station",
      tone: "danger",
    });
    if (ok) remove.mutate(s);
  };

  const columns: DataTableColumn<PC>[] = [
    {
      field: "pcNumber",
      header: "Station",
      minWidth: 200,
      flex: 1.2,
      mobile: "title",
      value: (s) => `${s.pcNumber} ${s.name}`,
      csv: (s) => s.pcNumber,
      render: (s) => {
        const Icon = s.type === "playstation" ? SportsEsports : Computer;
        return (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Icon fontSize="small" sx={{ color: s.type === "playstation" ? theme.tokens.series.playstation : theme.tokens.series.pc }} />
            <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
              <Typography component="div" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }} noWrap>
                {s.pcNumber}
              </Typography>
              <Typography component="div" variant="body2" color="text.secondary" noWrap>
                {s.name}
              </Typography>
            </Box>
          </Stack>
        );
      },
    },
    { field: "type", header: "Type", value: (s) => STATION_TYPE_LABEL[s.type ?? "pc"], width: 130, hideBelow: "lg", mobile: "hidden" },
    { field: "location", header: "Zone", value: (s) => s.location, minWidth: 150, mobile: "subtitle" },
    {
      field: "hourlyRate",
      header: "Per hour",
      type: "money",
      value: (s) => s.hourlyRate.usd,
      render: (s) => <MoneyText value={s.hourlyRate.usd} />,
      width: 120,
    },
    {
      field: "status",
      header: "Status",
      value: (s) => (s.isActive ? s.status : "hidden"),
      render: (s) => (s.isActive ? <StatusChip status={s.status} kind="station" /> : <StatusChip status="inactive" kind="generic" label="Not in use" />),
      width: 140,
      mobile: "end",
    },
    {
      field: "actions",
      header: "Actions",
      type: "actions",
      width: 112,
      render: (s) => (
        <>
          <Tooltip title="Edit station">
            <IconButton aria-label={`Edit ${s.pcNumber}`} onClick={() => setForm({ station: s })}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title={s.status === PCStatus.OCCUPIED ? "Someone is playing — end the session first" : "Delete station"}>
            <span>
              <IconButton aria-label={`Delete ${s.pcNumber}`} onClick={() => askDelete(s)} disabled={s.status === PCStatus.OCCUPIED} sx={{ color: "error.main" }}>
                <DeleteOutlineRounded />
              </IconButton>
            </span>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Manage stations" subtitle="PCs and PlayStation rooms: numbers, hourly prices, zones and specs. Start sessions from the Stations screen." />
      <DataTable<PC>
        label="Stations"
        rows={rows}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => q.refetch()}
        search={{ placeholder: "Search number or name" }}
        filters={
          <>
            <SegmentedControl<TypeFilter>
              aria-label="Station type"
              value={type}
              onChange={setType}
              options={[
                { value: "all", label: "All", count: q.data ? stations.length : undefined },
                { value: "pc", label: "PCs", count: q.data ? count("pc") : undefined },
                { value: "playstation", label: "PlayStation", count: q.data ? count("playstation") : undefined },
              ]}
            />
            {zones.length > 1 && (
              <SelectField<string> label="Zone" size="small" fullWidth={false} minWidth={170} value={zone} onChange={setZone} emptyOption="All zones" options={zones.map((z) => ({ value: z, label: z }))} />
            )}
          </>
        }
        activeFilterCount={(type !== "all" ? 1 : 0) + (zone ? 1 : 0)}
        onClearFilters={() => {
          setType("all");
          setZone("");
        }}
        initialSort={{ field: "pcNumber", direction: "asc" }}
        primaryAction={{ label: "Add station", onClick: () => setForm({ station: null }) }}
        onRowClick={(s) => setForm({ station: s })}
        exportCsv={{ filename: "stations" }}
        empty={{ title: "No stations yet", description: "Add your gaming PCs and PlayStation rooms to start sessions and take bookings." }}
      />
      <StationFormDialog
        open={Boolean(form)}
        station={form?.station}
        stations={stations}
        defaultType={type === "all" ? "pc" : type}
        onClose={() => setForm(null)}
      />
    </Box>
  );
};

export default PCManagement;
