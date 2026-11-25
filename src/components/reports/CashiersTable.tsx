import React from "react";
import { DataTable, SectionCard } from "@/components/ui";
import type { CashierRow } from "@/types/report.types";
import { cashierColumns } from "./reportColumns";
import { SECTION_COPY } from "./reportPeriods";

export interface CashiersTableProps {
  rows: CashierRow[] | undefined;
  loading: boolean;
}

/** Revenue per staff member — credited to whoever took the payment. */
const CashiersTable: React.FC<CashiersTableProps> = ({ rows, loading }) => {
  return (
    <SectionCard variant="plain" {...SECTION_COPY.cashiers}>
      <DataTable<CashierRow>
        label="Revenue by staff member"
        rows={rows}
        columns={cashierColumns}
        loading={loading}
        density="compact"
        phoneLayout="table"
        initialSort={{ field: "revenue", direction: "desc" }}
        empty={{ title: "No payments taken in this period" }}
      />
    </SectionCard>
  );
};

export default CashiersTable;
