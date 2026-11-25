import { Box, Typography } from "@mui/material";
import type { DataTableColumn } from "@/components/ui";
import { cellText, isNumericType } from "@/components/ui/dataTableUtils";
import { fonts } from "@/theme/tokens";

export interface PrintTableProps<R> {
  /** The same column definitions the on-screen DataTable and the CSV use, so paper shows the same numbers. */
  columns: DataTableColumn<R>[];
  rows: R[];
  /** Accessible name. */
  label: string;
  /** Shown instead of an empty table. */
  emptyText: string;
}

/**
 * A plain table for the printed report. DataTable is interactive (sorting, paging, virtual rows,
 * phone cards) and doesn't fragment across A4 pages; paper needs a real `<table>` whose header
 * repeats on every page and whose rows never split. Candidate for the kit (a DataTable print mode).
 */
const PrintTable = <R,>({ columns, rows, label, emptyText }: PrintTableProps<R>) => {
  if (rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ fontSize: "10pt", py: 0.5 }}>
        {emptyText}
      </Typography>
    );
  }
  const align = (c: DataTableColumn<R>) => c.align ?? (isNumericType(c.type) ? "right" : "left");
  return (
    <Box
      component="table"
      aria-label={label}
      sx={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "10pt",
        lineHeight: 1.3,
        fontVariantNumeric: "tabular-nums",
        "& thead": { display: "table-header-group" },
        "& tr": { breakInside: "avoid" },
        "& th, & td": { py: "2px", px: "6px", verticalAlign: "baseline" },
        "& th:first-of-type, & td:first-of-type": { pl: 0 },
        "& th:last-of-type, & td:last-of-type": { pr: 0 },
        "& th": { fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: (t) => t.tokens.borderStrong, whiteSpace: "nowrap" },
        "& td": { borderBottom: 1, borderColor: "divider" },
        "& tbody tr:last-of-type td": { borderBottom: 0 },
      }}
    >
      <thead>
        <tr>
          {columns.map((c) => (
            <Box component="th" key={c.field} scope="col" sx={{ textAlign: align(c) }}>
              {c.header}
            </Box>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <Box
                component="td"
                key={c.field}
                sx={{ textAlign: align(c), ...(c.type === "code" ? { fontFamily: fonts.mono, fontSize: "9.5pt" } : {}), ...(c.flex ? {} : { whiteSpace: "nowrap" }) }}
              >
                {c.render ? c.render(row) : cellText(c, row) || "—"}
              </Box>
            ))}
          </tr>
        ))}
      </tbody>
    </Box>
  );
};

export default PrintTable;
