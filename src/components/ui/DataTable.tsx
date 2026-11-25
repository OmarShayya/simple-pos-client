import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { AddRounded, FileDownloadOutlined, RefreshRounded, SearchOffRounded } from "@mui/icons-material";
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
  type GridSortModel,
} from "@mui/x-data-grid";
import SearchField from "./SearchField";
import FilterBar from "./FilterBar";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import MoneyText from "./MoneyText";
import StatusChip from "./StatusChip";
import CodeText from "./CodeText";
import { buildCsv, cellText, downloadCsv, getValue, isNumericType, sortValue, type DataTableColumn } from "./dataTableUtils";
import { formatDateTime, formatNumber } from "@/utils/format";

export type { DataTableColumn, ColumnType } from "./dataTableUtils";

export interface DataTableSort {
  field: string;
  direction: "asc" | "desc";
}

export interface DataTableSearch {
  placeholder?: string;
  /** Server mode: the current search text… */
  value?: string;
  /** …and its (debounced) change handler. Omit both for client-side search over the rows. */
  onChange?: (value: string) => void;
}

export interface DataTableAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DataTablePagination {
  /** 0-based page index. */
  page: number;
  pageSize: number;
  /** Total rows on the server. */
  rowCount: number;
  onChange: (page: number, pageSize: number) => void;
}

export interface DataTableProps<R> {
  rows: R[] | undefined | null;
  columns: DataTableColumn<R>[];
  /** Default: `row.id ?? row._id`. */
  getRowId?: (row: R) => string;
  /** First load (`query.isLoading`): skeleton rows under the real column headers. */
  loading?: boolean;
  /** Background refetch (`query.isFetching`): rows stay, a thin progress bar shows, Refresh spins. */
  refreshing?: boolean;
  error?: unknown;
  /** Retry after an error (usually `query.refetch`). */
  onRetry?: () => void;

  /** Accessible name of the table, e.g. "Orders". */
  label?: string;
  /** Optional heading above the toolbar (when the table isn't the whole page). */
  title?: React.ReactNode;
  /** `true` = client search over the rows; object = placeholder and/or server search. */
  search?: boolean | DataTableSearch;
  /** Filter controls (SelectField, SegmentedControl, DateRangeField…) shown next to the search. */
  filters?: React.ReactNode;
  /** Number of active filters → shows "Clear filters". */
  activeFilterCount?: number;
  onClearFilters?: () => void;
  /** Shows the Refresh button (usually `query.refetch`). */
  onRefresh?: () => void;
  /** The main button ("New product"). */
  primaryAction?: DataTableAction;
  /** Shows an Export button. `fetchAll` lets server tables export every row, not just the page. */
  exportCsv?: { filename: string; fetchAll?: () => Promise<R[]> };
  /** Extra controls before Refresh/Export (keep it to one or two). */
  toolbarExtra?: React.ReactNode;

  /** Server pagination. Omit for client pagination over `rows`. */
  pagination?: DataTablePagination;
  /** Client page size (default 25). */
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Server sorting: current sort + handler. Omit for client sorting. */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  /** Client mode: initial sort. */
  initialSort?: DataTableSort;

  onRowClick?: (row: R) => void;
  /** Checkbox selection (off by default). */
  selection?: { selected: string[]; onChange: (ids: string[]) => void };
  /** Empty state when there are no rows at all. */
  empty?: { title: string; description?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode };
  /** "compact" = 44px rows (dense admin lists). Default 52px. */
  density?: "standard" | "compact";
  /** Phones: "cards" (default — one card per row) or "table" (horizontal scroll). */
  phoneLayout?: "cards" | "table";
}

/* ---------------------------------------------------------------- cell rendering */

function renderCellContent<R>(col: DataTableColumn<R>, row: R): React.ReactNode {
  if (col.render) return col.render(row);
  const v = getValue(col, row);
  if (v === null || v === undefined || v === "") {
    return col.type === "actions" ? null : (
      <Box component="span" sx={{ color: "text.disabled" }}>
        —
      </Box>
    );
  }
  switch (col.type) {
    case "money":
      return <MoneyText value={Number(v)} currency={col.currency ?? "USD"} />;
    case "status":
      return <StatusChip status={String(v)} kind={col.statusKind} />;
    case "code":
      return <CodeText>{String(v)}</CodeText>;
    case "relative":
      return (
        <Tooltip title={formatDateTime(v as string)}>
          <span>{cellText(col, row)}</span>
        </Tooltip>
      );
    default:
      return cellText(col, row);
  }
}

const NATURAL = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/* Placeholder rows for the first load: real headers, skeleton cells (never a spinner). */
const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => ({ __skeleton: i }));
const SKELETON_WIDTHS = ["72%", "54%", "84%", "46%", "64%", "58%", "40%"];
const isSkeleton = (row: unknown): row is { __skeleton: number } => typeof (row as { __skeleton?: number })?.__skeleton === "number";

const defaultRowId = (row: unknown) => {
  const r = row as { id?: string | number; _id?: string | number };
  return String(r.id ?? r._id ?? "");
};

/* ---------------------------------------------------------------- overlays (read state from context) */

interface OverlayState {
  error?: unknown;
  onRetry?: () => void;
  empty?: DataTableProps<unknown>["empty"];
  searching: boolean;
  clearSearch?: () => void;
}
const OverlayContext = createContext<OverlayState>({ searching: false });

const NoRowsOverlay: React.FC = () => {
  const { error, onRetry, empty, searching, clearSearch } = useContext(OverlayContext);
  return <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}><TableMessage {...{ error, onRetry, empty, searching, clearSearch }} /></Box>;
};

const TableMessage: React.FC<OverlayState> = ({ error, onRetry, empty, searching, clearSearch }) => {
  if (error) return <ErrorState compact error={error} onRetry={onRetry} />;
  if (searching)
    return (
      <EmptyState
        compact
        icon={<SearchOffRounded />}
        title="No matches"
        description="Try a different word or clear the filters."
        action={
          clearSearch && (
            <Button variant="outlined" onClick={clearSearch}>
              Clear search
            </Button>
          )
        }
      />
    );
  return <EmptyState compact title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} icon={empty?.icon} />;
};

/* ---------------------------------------------------------------- phone card layout */

function PhoneCards<R>({
  rows,
  columns,
  getRowId,
  loading,
  onRowClick,
}: {
  rows: R[];
  columns: DataTableColumn<R>[];
  getRowId: (row: R) => string;
  loading: boolean;
  onRowClick?: (row: R) => void;
}) {
  const visible = columns.filter((c) => c.mobile !== "hidden");
  const actions = visible.filter((c) => c.type === "actions");
  const data = visible.filter((c) => c.type !== "actions");
  const title = data.find((c) => c.mobile === "title") ?? data[0];
  const subtitles = data.filter((c) => c.mobile === "subtitle");
  const explicitEnd = data.filter((c) => c.mobile === "end");
  const ends = explicitEnd.length
    ? explicitEnd
    : data.filter((c) => c !== title && !c.mobile && (c.type === "money" || c.type === "status")).slice(0, 2);
  const metas = data.filter((c) => c !== title && !subtitles.includes(c) && !ends.includes(c) && (!c.mobile || c.mobile === "meta")).slice(0, 4);

  if (loading) {
    return (
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px", overflow: "hidden" }} aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ p: 2, borderTop: i ? 1 : 0, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Skeleton width="45%" />
              <Skeleton width="20%" />
            </Stack>
            <Skeleton width="65%" />
            <Skeleton width="35%" />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, border: 1, borderColor: "divider", borderRadius: "12px", overflow: "hidden", bgcolor: "background.paper" }}>
      {rows.map((row, i) => {
        const inner = (
          <Box sx={{ width: "100%", p: 2, textAlign: "left", display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="div" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title ? renderCellContent(title, row) : null}
                </Typography>
                {subtitles.length > 0 && (
                  <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {subtitles.map((c, j) => (
                      <React.Fragment key={c.field}>
                        {j > 0 && " · "}
                        {renderCellContent(c, row)}
                      </React.Fragment>
                    ))}
                  </Typography>
                )}
              </Box>
              {ends.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0, fontWeight: 600 }}>
                  {ends.map((c) => (
                    <Box key={c.field}>{renderCellContent(c, row)}</Box>
                  ))}
                </Box>
              )}
            </Box>
            {metas.length > 0 && (
              <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.25 }}>
                {metas.map((c) => (
                  <React.Fragment key={c.field}>
                    <Typography component="dt" variant="body2" color="text.secondary">
                      {c.header}
                    </Typography>
                    <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {renderCellContent(c, row)}
                    </Typography>
                  </React.Fragment>
                ))}
              </Box>
            )}
          </Box>
        );
        return (
          <Box component="li" key={getRowId(row)} sx={{ borderTop: i ? 1 : 0, borderColor: "divider" }}>
            {onRowClick ? (
              <ButtonBase onClick={() => onRowClick(row)} sx={{ width: "100%", display: "block", "&:hover": { bgcolor: "action.hover" } }}>
                {inner}
              </ButtonBase>
            ) : (
              inner
            )}
            {actions.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 2, pb: 1.5, mt: -0.5 }}>
                {actions.map((c) => (
                  <React.Fragment key={c.field}>{renderCellContent(c, row)}</React.Fragment>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/* ---------------------------------------------------------------- the table */

/**
 * THE table for every list in the POS: toolbar (search, filters, Refresh, Export, primary action),
 * typed columns (money / dates / status / codes formatted the same everywhere), client or server
 * pagination + sorting, skeleton rows on first load, a thin progress bar on refetch (rows stay),
 * empty and error states, and stacked cards on phones. Wraps MUI X DataGrid (MIT) on wider screens.
 */
function DataTable<R>(props: DataTableProps<R>) {
  const {
    rows,
    columns,
    getRowId = defaultRowId,
    loading = false,
    refreshing = false,
    error,
    onRetry,
    label,
    title,
    search,
    filters,
    activeFilterCount,
    onClearFilters,
    onRefresh,
    primaryAction,
    exportCsv,
    toolbarExtra,
    pagination,
    pageSize: clientPageSizeProp = 25,
    pageSizeOptions = [10, 25, 50, 100],
    sort,
    onSortChange,
    initialSort,
    onRowClick,
    selection,
    empty,
    density = "standard",
    phoneLayout = "cards",
  } = props;

  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });

  const serverSearch = typeof search === "object" && typeof search.onChange === "function";
  const [clientQuery, setClientQuery] = useState("");
  const query = serverSearch ? (search as DataTableSearch).value ?? "" : clientQuery;
  const setQuery = serverSearch ? (search as DataTableSearch).onChange! : setClientQuery;

  const serverSort = typeof onSortChange === "function";
  const [clientSort, setClientSort] = useState<DataTableSort | null>(initialSort ?? null);
  const activeSort = serverSort ? sort ?? null : clientSort;

  const serverPaging = Boolean(pagination);
  const [clientPage, setClientPage] = useState(0);
  const [clientPageSize, setClientPageSize] = useState(clientPageSizeProp);

  // Client pipeline: search → sort → page
  const processed = useMemo(() => {
    let list = rows ?? [];
    const q = clientQuery.trim().toLowerCase();
    if (!serverSearch && search && q) {
      const searchable = columns.filter((c) => c.type !== "actions" && (c.searchable ?? (!c.type || c.type === "text" || c.type === "code" || c.type === "status")));
      list = list.filter((row) => searchable.some((c) => cellText(c, row).toLowerCase().includes(q)));
    }
    if (!serverSort && clientSort) {
      const col = columns.find((c) => c.field === clientSort.field);
      if (col) {
        const dir = clientSort.direction === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const va = sortValue(col, a);
          const vb = sortValue(col, b);
          // Text sorts the way people count: "PC-2" before "PC-10"
          if (typeof va === "string" && typeof vb === "string") return dir * NATURAL.compare(va, vb);
          return va < vb ? -dir : va > vb ? dir : 0;
        });
      }
    }
    return list;
  }, [rows, columns, clientQuery, search, serverSearch, serverSort, clientSort]);

  // Back to the first page when the client search changes
  useEffect(() => setClientPage(0), [clientQuery]);

  const page = serverPaging ? pagination!.page : clientPage;
  const pageSize = serverPaging ? pagination!.pageSize : clientPageSize;
  const total = serverPaging ? pagination!.rowCount : processed.length;
  const pageRows = serverPaging ? processed : processed.slice(page * pageSize, page * pageSize + pageSize);
  const firstLoad = loading && !(rows && rows.length);
  const searching = Boolean(query.trim()) || Boolean(activeFilterCount);
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  // If the data shrank under the current client page, go back
  useEffect(() => {
    if (!serverPaging && clientPage > lastPage) setClientPage(lastPage);
  }, [serverPaging, clientPage, lastPage]);

  const changePage = (p: number, size: number) => {
    if (serverPaging) pagination!.onChange(p, size);
    else {
      setClientPage(size !== clientPageSize ? 0 : p);
      setClientPageSize(size);
    }
  };

  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (!exportCsv) return;
    setExporting(true);
    try {
      const data = exportCsv.fetchAll ? await exportCsv.fetchAll() : processed;
      downloadCsv(exportCsv.filename, buildCsv(columns, data));
    } finally {
      setExporting(false);
    }
  };

  /* ------------------------------ toolbar */
  const showToolbar = Boolean(search || filters || onRefresh || primaryAction || exportCsv || toolbarExtra);
  const searchProps = typeof search === "object" ? search : {};
  const toolbar = showToolbar && (
    <FilterBar
      search={
        search ? (
          <SearchField value={query} onChange={setQuery} placeholder={searchProps.placeholder ?? "Search"} delay={serverSearch ? 300 : 120} />
        ) : undefined
      }
      activeCount={activeFilterCount}
      onClear={onClearFilters}
      actions={
        (toolbarExtra || onRefresh || exportCsv || primaryAction) && (
          <>
            {toolbarExtra}
            {onRefresh && (
              <Tooltip title={refreshing ? "Refreshing…" : "Refresh"}>
                <IconButton
                  onClick={onRefresh}
                  aria-label="Refresh"
                  sx={{ border: 1, borderColor: (t) => t.tokens.borderStrong, "& svg": { animation: refreshing ? "pos-spin 0.9s linear infinite" : "none" } }}
                >
                  <RefreshRounded />
                </IconButton>
              </Tooltip>
            )}
            {exportCsv && (
              <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={doExport} disabled={exporting || firstLoad || total === 0}>
                {exporting ? "Exporting…" : "Export"}
              </Button>
            )}
            {primaryAction && (
              <Button variant="contained" startIcon={primaryAction.icon ?? <AddRounded />} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
                {primaryAction.label}
              </Button>
            )}
          </>
        )
      }
    >
      {filters}
    </FilterBar>
  );

  /* ------------------------------ grid columns */
  const gridColumns = useMemo<GridColDef[]>(
    () =>
      columns.map((col, colIndex) => {
        const numeric = isNumericType(col.type);
        const isActions = col.type === "actions";
        const align = col.align ?? (numeric || isActions ? "right" : "left");
        return {
          field: col.field,
          headerName: col.header,
          description: isActions ? undefined : col.header,
          sortable: !isActions && (col.sortable ?? true),
          flex: col.width ? undefined : col.flex ?? (isActions ? undefined : numeric || col.type === "status" ? 0.6 : 1),
          width: col.width ?? (isActions ? 120 : undefined),
          // A fixed width is also the minimum, so narrow columns stay narrow
          minWidth: col.minWidth ?? col.width ?? (isActions ? 96 : col.type === "status" ? 120 : numeric ? 100 : 130),
          align,
          headerAlign: align,
          renderCell: (p) =>
            isSkeleton(p.row) ? (
              isActions ? null : (
                <Skeleton
                  variant="rounded"
                  height={12}
                  width={SKELETON_WIDTHS[(colIndex + p.row.__skeleton) % SKELETON_WIDTHS.length]}
                  sx={{ borderRadius: "4px", ml: align === "right" ? "auto" : 0, maxWidth: 160 }}
                />
              )
            ) : isActions ? (
              <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end", width: "100%" }}>
                {renderCellContent(col, p.row as R)}
              </Box>
            ) : (
              <Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: align }}>
                {renderCellContent(col, p.row as R)}
              </Box>
            ),
        } satisfies GridColDef;
      }),
    [columns]
  );

  const columnVisibilityModel = useMemo(
    () =>
      Object.fromEntries(
        columns.filter((c) => c.hideBelow).map((c) => [c.field, c.hideBelow === "lg" ? isLgUp : isMdUp])
      ),
    [columns, isMdUp, isLgUp]
  );

  // Stable references: a "new" sort/pagination model on every render makes the grid jump back to page 1
  const sortField = activeSort?.field;
  const sortDirection = activeSort?.direction;
  const sortModel = useMemo<GridSortModel>(() => (sortField ? [{ field: sortField, sort: sortDirection ?? "asc" }] : []), [sortField, sortDirection]);
  const paginationModel = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const rowHeight = density === "compact" ? 44 : 52;
  const overlayState: OverlayState = { error, onRetry, empty: empty as OverlayState["empty"], searching, clearSearch: query ? () => setQuery("") : onClearFilters };
  const staleError = Boolean(error) && Boolean(rows && rows.length);

  /* ------------------------------ render */
  const progress = refreshing && !firstLoad && (
    <LinearProgress aria-label="Refreshing" sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 3, borderRadius: 0, bgcolor: "transparent" }} />
  );

  const phoneCards = isPhone && phoneLayout === "cards";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      {title && (
        <Typography variant="subtitle1" component="h3">
          {title}
        </Typography>
      )}
      {toolbar}
      {staleError && (
        <Alert
          severity="warning"
          action={
            onRetry && (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        >
          Couldn't refresh — showing the last loaded data.
        </Alert>
      )}

      <OverlayContext.Provider value={overlayState}>
        {phoneCards ? (
          <Box sx={{ position: "relative" }}>
            {progress}
            {!firstLoad && pageRows.length === 0 ? (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px" }}>
                <TableMessage {...overlayState} />
              </Box>
            ) : (
              <PhoneCards rows={pageRows} columns={columns} getRowId={getRowId} loading={firstLoad} onRowClick={onRowClick} />
            )}
            {total > pageSize && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(page * pageSize + 1)}–{formatNumber(Math.min(total, (page + 1) * pageSize))} of {formatNumber(total)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" disabled={page === 0} onClick={() => changePage(page - 1, pageSize)}>
                    Previous
                  </Button>
                  <Button variant="outlined" disabled={page >= lastPage} onClick={() => changePage(page + 1, pageSize)}>
                    Next
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        ) : (
          <Box sx={{ position: "relative", minWidth: 0, borderRadius: "12px", overflow: "hidden" }}>
            {progress}
            <DataGrid
              aria-label={label}
              rows={firstLoad ? SKELETON_ROWS : pageRows}
              columns={gridColumns}
              getRowId={(r) => (isSkeleton(r) ? `__skeleton-${r.__skeleton}` : getRowId(r as R))}
              aria-busy={firstLoad || undefined}
              autoHeight
              rowHeight={rowHeight}
              columnHeaderHeight={44}
              disableColumnMenu
              disableColumnSelector
              disableDensitySelector
              disableRowSelectionOnClick
              disableVirtualization={pageRows.length <= 100}
              sortingMode="server"
              paginationMode="server"
              filterMode="server"
              sortModel={sortModel}
              onSortModelChange={(model) => {
                const next = model[0] ? { field: model[0].field, direction: (model[0].sort ?? "asc") as "asc" | "desc" } : null;
                if (serverSort) onSortChange!(next);
                else setClientSort(next);
                if (!serverPaging) setClientPage(0);
              }}
              rowCount={total}
              paginationModel={paginationModel}
              onPaginationModelChange={(m) => changePage(m.page, m.pageSize)}
              pageSizeOptions={pageSizeOptions}
              hideFooter={firstLoad || (total <= Math.min(...pageSizeOptions, pageSize) && page === 0)}
              columnVisibilityModel={columnVisibilityModel}
              onRowClick={onRowClick && !firstLoad ? (p) => onRowClick(p.row as R) : undefined}
              checkboxSelection={Boolean(selection)}
              rowSelectionModel={selection ? ({ type: "include", ids: new Set(selection.selected) } as GridRowSelectionModel) : undefined}
              onRowSelectionModelChange={
                selection
                  ? (m) => {
                      const ids = m.type === "include" ? [...m.ids] : pageRows.map((r) => getRowId(r)).filter((id) => !m.ids.has(id));
                      selection.onChange(ids.map(String));
                    }
                  : undefined
              }
              slots={{ noRowsOverlay: NoRowsOverlay, noResultsOverlay: NoRowsOverlay }}
              sx={{
                "--DataGrid-overlayHeight": `${rowHeight * 5}px`,
                "& .MuiDataGrid-row": { cursor: onRowClick && !firstLoad ? "pointer" : "default" },
                ...(firstLoad ? { "& .MuiDataGrid-row:hover": { bgcolor: "transparent" } } : {}),
                ...(isPhone ? { "& .MuiDataGrid-virtualScroller": { overflowX: "auto" } } : {}),
              }}
            />
          </Box>
        )}
      </OverlayContext.Provider>
    </Box>
  );
}

export default DataTable;
