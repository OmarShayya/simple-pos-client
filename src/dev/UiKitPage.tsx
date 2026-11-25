import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DeleteOutlineRounded,
  EditOutlined,
  PaymentsOutlined,
  PrintOutlined,
  ReceiptLongOutlined,
  SportsEsportsOutlined,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import {
  AddressFields,
  ChartCard,
  CityField,
  CodeText,
  CountrySelect,
  DataTable,
  DateField,
  DateRangeField,
  DateTimeField,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDialog,
  KpiCard,
  MoneyField,
  MoneyText,
  PageHeader,
  PhoneField,
  QuantityStepper,
  SearchField,
  SectionCard,
  SegmentedControl,
  SelectField,
  StatusChip,
  type Address,
  type CityValue,
  type DataTableColumn,
  type PhoneValue,
} from "@/components/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { useThemeStore } from "@/store/themeStore";
import { useChartDefaults } from "@/theme/charts";
import { defaultDateRange, type DateRangeValue } from "@/utils/dateRanges";
import { formatUsd } from "@/utils/format";
import { STATUS_MAP, type StatusKind } from "@/components/ui/statusConfig";

/* ---------------------------------------------------------------- sample data */

interface DemoOrder {
  id: string;
  invoice: string;
  customer: string;
  phone: string;
  source: "pos" | "website";
  items: number;
  total: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  hasGaming: boolean;
}

const NAMES = ["Walk-in", "Ali Haidar", "Rami Khoury", "Karim Saad", "Jad Nassar", "Maya Fares", "Hadi Mansour", "Lina"];
const makeOrders = (): DemoOrder[] =>
  Array.from({ length: 42 }, (_, i) => {
    const status = i % 7 === 3 ? "cancelled" : i % 3 === 0 ? "pending" : "paid";
    return {
      id: `o${i}`,
      invoice: `20261125-${String(60 - i).padStart(4, "0")}`,
      customer: NAMES[i % NAMES.length],
      phone: i % 2 ? "+96170123456" : "+9613555777",
      source: i % 5 === 0 ? "website" : "pos",
      items: (i % 4) + 1,
      total: Math.round(((i * 37) % 90) * 25 + 150) / 100,
      status,
      createdAt: new Date(Date.now() - i * 47 * 60_000).toISOString(),
      hasGaming: i % 2 === 0,
    };
  });

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const today = HOURS.map((h) => (h < 10 ? 0 : Math.round(20 + 60 * Math.sin((h - 9) / 4.5) + (h % 3) * 6)));
const yesterday = HOURS.map((h) => (h < 10 ? 0 : Math.round(15 + 50 * Math.sin((h - 9) / 5) + (h % 4) * 5)));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ---------------------------------------------------------------- page */

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Box component="section" sx={{ py: 4, borderTop: 1, borderColor: "divider" }}>
    <Typography variant="h5" component="h3">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
        {description}
      </Typography>
    )}
    <Box sx={{ mt: 2.5 }}>{children}</Box>
  </Box>
);

const UiKitPage: React.FC = () => {
  const { mode, setTheme } = useThemeStore();
  const chart = useChartDefaults();
  const confirm = useConfirm();

  // form state
  const [date, setDate] = useState<string | null>("2026-11-25");
  const [dateTime, setDateTime] = useState<Date | null>(new Date(2026, 10, 25, 21, 30));
  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("thisWeek"));
  const [phone, setPhone] = useState<PhoneValue | null>(null);
  const [country, setCountry] = useState<string | null>("LB");
  const [city, setCity] = useState<CityValue | null>({ city: "Beirut", area: "Hamra" });
  const [address, setAddress] = useState<Partial<Address>>({ country: "LB", city: "Sawfar" });
  const [price, setPrice] = useState<number | null>(12.5);
  const [lbp, setLbp] = useState<number | null>(1120000);
  const [qty, setQty] = useState(2);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");

  // table state
  const allOrders = useMemo(makeOrders, []);
  const [status, setStatus] = useState<"all" | "pending" | "paid">("all");
  const [tableState, setTableState] = useState<"ready" | "loading" | "refreshing" | "error" | "empty">("ready");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    if (tableState === "empty") return [];
    return status === "all" ? allOrders : allOrders.filter((o) => o.status === status);
  }, [allOrders, status, tableState]);

  const columns: DataTableColumn<DemoOrder>[] = [
    { field: "invoice", header: "Invoice", type: "code", width: 150, mobile: "title" },
    { field: "customer", header: "Customer", mobile: "subtitle" },
    { field: "source", header: "Source", type: "status", statusKind: "source", hideBelow: "lg" },
    { field: "items", header: "Items", type: "number", width: 90, hideBelow: "md" },
    { field: "createdAt", header: "Time", type: "smartDateTime", width: 170 },
    { field: "status", header: "Status", type: "status", statusKind: "order", mobile: "end" },
    { field: "total", header: "Total", type: "money", mobile: "end" },
    {
      field: "actions",
      header: "Actions",
      type: "actions",
      width: 110,
      render: (o) => (
        <>
          {o.status === "pending" && (
            <Tooltip title="Take payment">
              <IconButton size="small" aria-label={`Take payment for ${o.invoice}`}>
                <PaymentsOutlined />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Print receipt">
            <IconButton size="small" aria-label={`Print receipt ${o.invoice}`}>
              <PrintOutlined />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const kinds = Object.keys(STATUS_MAP) as StatusKind[];

  return (
    <Box>
      <PageHeader
        title="UI kit"
        subtitle="Every shared component, in the current colour mode. Development only — not in production builds."
        actions={
          <SegmentedControl
            aria-label="Colour mode"
            value={mode}
            onChange={(m) => setTheme(m)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        }
      />

      {/* ------------------------------------------------------------ basics */}
      <Section title="Buttons, chips and status" description="Primary actions are teal and labelled. Outlined = secondary. Icon-only buttons always have a tooltip and an aria-label.">
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
          <Button variant="contained" size="large">
            Charge $12.50
          </Button>
          <Button variant="contained">Start session</Button>
          <Button variant="outlined" startIcon={<PrintOutlined />}>
            Print receipt
          </Button>
          <Button variant="text">View all</Button>
          <Button variant="contained" color="error">
            Cancel order
          </Button>
          <Button variant="contained" disabled>
            Disabled
          </Button>
          <Button variant="outlined" size="small">
            Small
          </Button>
          <Tooltip title="Edit">
            <IconButton aria-label="Edit">
              <EditOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton aria-label="Delete" color="error">
              <DeleteOutlineRounded />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
          <Chip label="Default" />
          <Chip label="Primary" color="primary" />
          <Chip label="Outlined" variant="outlined" />
          <Chip label="Clickable" clickable onClick={() => undefined} />
          <Chip label="Deletable" onDelete={() => undefined} />
          <Chip icon={<SportsEsportsOutlined />} label="PC-05 · 1h 30m" color="primary" size="small" />
        </Stack>
        <Box sx={{ mt: 2.5, display: "grid", gap: 1.25 }}>
          {kinds.map((k) => (
            <Stack key={k} direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ width: 96 }}>
                {k}
              </Typography>
              {Object.keys(STATUS_MAP[k]).map((s) => (
                <StatusChip key={s} status={s} kind={k} />
              ))}
            </Stack>
          ))}
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mt: 3 }} alignItems={{ md: "center" }}>
          <SegmentedControl
            aria-label="Period"
            value={period}
            onChange={setPeriod}
            size="large"
            options={[
              { value: "day", label: "Daily" },
              { value: "week", label: "Weekly" },
              { value: "month", label: "Monthly" },
              { value: "year", label: "Yearly" },
            ]}
          />
          <FormControlLabel control={<Switch defaultChecked />} label="Accept website orders" />
          <FormControlLabel control={<Checkbox defaultChecked />} label="Print receipt" />
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 3 }}>
          <Tab label="Overview" />
          <Tab label="Orders" />
          <Tab label="Sessions" />
          <Tab label="Reservations" />
        </Tabs>
        <Stack spacing={1.5} sx={{ mt: 3, maxWidth: 640 }}>
          <Alert severity="success">Payment saved. Receipt sent to the printer.</Alert>
          <Alert severity="info">Website orders appear here as soon as they are placed.</Alert>
          <Alert severity="warning">PC-07 has been running for 6 hours.</Alert>
          <Alert severity="error">Couldn't reach the server. Check the connection.</Alert>
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 3 }} alignItems="baseline" useFlexGap flexWrap="wrap">
          <MoneyText value={12.5} variant="h5" />
          <MoneyText value={12.5} lbp={1118750} />
          <MoneyText value={-3} tone="sign" signed />
          <MoneyText value={1120000} currency="LBP" />
          <MoneyText value={15} strike tone="muted" />
          <CodeText>20261125-0014</CodeText>
          <CodeText>EL-7K2Q</CodeText>
        </Stack>
      </Section>

      {/* ------------------------------------------------------------ KPIs */}
      <Section title="KPI cards" description="Value, change vs the previous period (green = good; for bad metrics like no-shows, down is green), optional sparkline. Loading skeletons the numbers only.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard label="Revenue today" value={1284.5} format="money" previous={1102} previousLabel="vs yesterday" sparkline={today.slice(9)} icon={<PaymentsOutlined />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard label="Orders" value={86} previous={94} previousLabel="vs yesterday" icon={<ReceiptLongOutlined />} hint="12 from the website" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard label="No-shows" value={2} previous={5} goodDirection="down" deltaFormat="absolute" previousLabel="vs last week" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard label="Gaming hours" value={null} loading format="hours" />
          </Grid>
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ charts */}
      <Section title="Charts" description="ChartCard + useChartDefaults(): teal = gaming/PC, blue = PlayStation, amber = products, grey dashed = previous period.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <ChartCard
              title="Revenue by hour"
              subtitle="Today vs yesterday"
              legend={[
                { label: "Today", color: chart.colors.revenue, value: formatUsd(today.reduce((a, b) => a + b, 0)) },
                { label: "Yesterday", color: chart.colors.previous, dashed: true, value: formatUsd(yesterday.reduce((a, b) => a + b, 0)) },
              ]}
              height={260}
            >
              <LineChart
                {...chart.line}
                height={260}
                xAxis={[{ data: HOURS, valueFormatter: chart.hourTick, tickInterval: (h: number) => h % 3 === 0, scaleType: "point" }]}
                yAxis={[{ valueFormatter: chart.moneyTick, width: 56 }]}
                series={[
                  { id: "today", data: today, label: "Today", color: chart.colors.revenue, valueFormatter: chart.money, showMark: false, area: true },
                  { id: "yesterday", data: yesterday, label: "Yesterday", color: chart.colors.previous, valueFormatter: chart.money, showMark: false },
                ]}
                sx={{ ...chart.line.sx, ...chart.dashed("yesterday") }}
              />
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <ChartCard
              title="Revenue by station type"
              legend={[
                { label: "PCs", color: chart.colors.pc, value: "$640" },
                { label: "PlayStation", color: chart.colors.playstation, value: "$310" },
                { label: "Products", color: chart.colors.products, value: "$334" },
              ]}
              height={260}
            >
              <PieChart
                {...chart.pie}
                height={260}
                series={[
                  {
                    ...chart.pieSeries,
                    valueFormatter: (v) => formatUsd(v.value),
                    data: [
                      { id: 0, value: 640, label: "PCs", color: chart.colors.pc },
                      { id: 1, value: 310, label: "PlayStation", color: chart.colors.playstation },
                      { id: 2, value: 334, label: "Products", color: chart.colors.products },
                    ],
                  },
                ]}
              />
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartCard
              title="This week"
              legend={[
                { label: "Gaming", color: chart.colors.pc },
                { label: "Products", color: chart.colors.products },
              ]}
              action={<Button variant="text">Open report</Button>}
              height={240}
            >
              <BarChart
                {...chart.bar}
                height={240}
                xAxis={[{ data: DAYS, scaleType: "band" }]}
                yAxis={[{ valueFormatter: chart.moneyTick, width: 56 }]}
                series={[
                  { data: [220, 180, 260, 240, 410, 520, 380], label: "Gaming", color: chart.colors.pc, stack: "rev", valueFormatter: chart.money },
                  { data: [90, 70, 120, 110, 160, 240, 170], label: "Products", color: chart.colors.products, stack: "rev", valueFormatter: chart.money },
                ]}
              />
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ChartCard title="Loading" loading height={240}>
              <div />
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ChartCard title="Empty" empty emptyDescription="No sales were recorded on this day." height={240}>
              <div />
            </ChartCard>
          </Grid>
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ table */}
      <Section
        title="DataTable"
        description="Toolbar (search, filters, Refresh, Export, primary action), typed columns, client/server pagination and sorting. Skeleton rows on first load, thin progress bar on refetch. Cards on phones."
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Simulate:
          </Typography>
          <SegmentedControl
            aria-label="Table state"
            value={tableState}
            onChange={setTableState}
            options={[
              { value: "ready", label: "Ready" },
              { value: "loading", label: "First load" },
              { value: "refreshing", label: "Refreshing" },
              { value: "error", label: "Error" },
              { value: "empty", label: "Empty" },
            ]}
          />
        </Stack>
        <DataTable<DemoOrder>
          label="Orders"
          rows={tableState === "loading" ? undefined : tableState === "error" ? undefined : rows}
          columns={columns}
          loading={tableState === "loading"}
          refreshing={tableState === "refreshing"}
          error={tableState === "error" ? new Error("The server didn't respond (timeout).") : undefined}
          onRetry={() => setTableState("ready")}
          search={{ placeholder: "Search invoice or customer" }}
          filters={
            <SegmentedControl
              aria-label="Order status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Unpaid", count: allOrders.filter((o) => o.status === "pending").length },
                { value: "paid", label: "Paid" },
              ]}
            />
          }
          activeFilterCount={status === "all" ? 0 : 1}
          onClearFilters={() => setStatus("all")}
          onRefresh={() => {
            setTableState("refreshing");
            window.setTimeout(() => setTableState("ready"), 1500);
          }}
          exportCsv={{ filename: "orders" }}
          primaryAction={{ label: "New sale", onClick: () => setDialogOpen(true) }}
          onRowClick={() => setDialogOpen(true)}
          initialSort={{ field: "createdAt", direction: "desc" }}
          pageSize={10}
          empty={{ title: "No orders yet today", description: "Orders from the counter, gaming sessions and the website show up here.", action: <Button variant="contained">New sale</Button> }}
        />
      </Section>

      {/* ------------------------------------------------------------ forms */}
      <Section title="Form fields" description="Labels always visible on the outline; 48px fields (44px small); clear focus ring. Build every form from these.">
        <Grid container spacing={2.5} sx={{ maxWidth: 960 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Customer name" defaultValue="Ali Haidar" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Notes" placeholder="Anything the staff should know" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <PhoneField value="03 555 777" country="LB" onChange={setPhone} helperText="We'll find the customer by this number" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              emptyOption="All categories"
              options={[
                { value: "hot", label: "Hot drinks" },
                { value: "cold", label: "Cold drinks" },
                { value: "snacks", label: "Snacks" },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MoneyField label="Price" value={price} onChange={setPrice} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <MoneyField label="Price in LBP" currency="LBP" value={lbp} onChange={setLbp} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <QuantityStepper value={qty} onChange={setQty} min={1} label="Quantity of Pepsi" />
            <QuantityStepper value={qty} onChange={setQty} min={1} size="large" label="Quantity" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DateField label="Date" value={date} onChange={setDate} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DateTimeField label="Start time" value={dateTime} onChange={setDateTime} />
          </Grid>
          <Grid size={12}>
            <DateRangeField value={range} onChange={setRange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CountrySelect value={country} onChange={setCountry} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CityField country={country} value={city} onChange={setCity} />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              AddressFields
            </Typography>
            <AddressFields value={address} onChange={setAddress} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="With error" defaultValue="abc" error helperText="Please enter a number" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Disabled" defaultValue="Read only" disabled fullWidth />
          </Grid>
        </Grid>
        <Box
          component="pre"
          sx={{ mt: 2.5, p: 2, bgcolor: "action.hover", borderRadius: "8px", fontSize: "0.8125rem", overflowX: "auto", maxWidth: 960 }}
        >
          {JSON.stringify({ date, dateTime, range, phone, country, city, address, price, lbp, qty }, null, 2)}
        </Box>
      </Section>

      {/* ------------------------------------------------------------ layout pieces */}
      <Section title="Sections, filters and states">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Open orders" subtitle="Unpaid, newest first" action={<Button variant="text">View all</Button>} divider flush>
              {allOrders.slice(0, 4).map((o) => (
                <Box key={o.id} sx={{ display: "flex", alignItems: "center", gap: 2, px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 500 }}>{o.customer}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      <CodeText>{o.invoice}</CodeText>
                    </Typography>
                  </Box>
                  <StatusChip status={o.source} kind="source" />
                  <MoneyText value={o.total} sx={{ fontWeight: 600 }} />
                </Box>
              ))}
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Loading values" subtitle="Titles render immediately; only values skeleton">
              <Stack spacing={1.25}>
                {["Cash", "Card", "Bank transfer"].map((l) => (
                  <Box key={l} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">{l}</Typography>
                    <Skeleton width={72} />
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Search products" />} activeCount={category ? 1 : 0} onClear={() => setCategory("")} actions={<Button variant="contained">New product</Button>}>
              <SelectField
                label="Category"
                value={category}
                onChange={setCategory}
                emptyOption="All categories"
                fullWidth={false}
                size="small"
                options={[
                  { value: "hot", label: "Hot drinks" },
                  { value: "snacks", label: "Snacks" },
                ]}
              />
            </FilterBar>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard>
              <EmptyState title="No reservations today" description="Bookings from the website and the counter will show here." action={<Button variant="outlined">New reservation</Button>} />
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard>
              <ErrorState error={new Error("Network Error")} onRetry={() => undefined} />
            </SectionCard>
          </Grid>
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ dialogs */}
      <Section title="Dialogs" description="FormDialog for forms (full screen on phones), useConfirm() for yes/no questions.">
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => setDialogOpen(true)}>
            Open form dialog
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              await confirm({
                title: "Cancel this order?",
                message: "Order 20261125-0014 will be cancelled and its items returned to stock. This can't be undone.",
                confirmLabel: "Cancel order",
                tone: "danger",
              });
            }}
          >
            Ask to confirm
          </Button>
        </Stack>
      </Section>

      {/* ------------------------------------------------------------ type */}
      <Section title="Typography" description="IBM Plex Sans; tabular numbers everywhere; IBM Plex Mono only for codes. Nothing below 13px.">
        <Stack spacing={1}>
          <Typography variant="h4">Page title — Orders</Typography>
          <Typography variant="h5">Section title — Today at the lounge</Typography>
          <Typography variant="subtitle1">Card title — Open orders</Typography>
          <Typography>Body 15px — Start a session for PC-05 and add two Pepsis to the same order.</Typography>
          <Typography variant="body2" color="text.secondary">
            Secondary 14px — Paid by cash · 9:41 PM
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Caption 13px — Updated 5 min ago
          </Typography>
          <Divider />
          <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>1,234.50 · 11,111.11 · 98,765.00</Typography>
        </Stack>
      </Section>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New customer"
        subtitle="Only the name and phone are required."
        submitLabel="Save customer"
        loading={saving}
        onSubmit={() => {
          setSaving(true);
          window.setTimeout(() => {
            setSaving(false);
            setDialogOpen(false);
          }, 900);
        }}
      >
        <Stack spacing={2.5}>
          <TextField label="Full name" required autoFocus fullWidth />
          <PhoneField value="" onChange={() => undefined} required />
          <AddressFields value={{ country: "LB" }} onChange={() => undefined} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

export default UiKitPage;
