import React, { useMemo } from "react";
import { DataTable, SectionCard } from "@/components/ui";
import type { TopProductRow } from "@/types/report.types";
import { topProductColumns, type RankedProduct } from "./reportColumns";
import { SECTION_COPY } from "./reportPeriods";

export interface TopProductsTableProps {
  rows: TopProductRow[] | undefined;
  /** All product revenue in the period (for the share column). */
  productRevenue: number;
  loading: boolean;
}

/** The ten best-selling products by revenue. */
const TopProductsTable: React.FC<TopProductsTableProps> = ({ rows, productRevenue, loading }) => {
  const ranked = useMemo<RankedProduct[] | undefined>(() => rows?.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const columns = useMemo(() => topProductColumns(productRevenue), [productRevenue]);
  return (
    <SectionCard variant="plain" {...SECTION_COPY.topProducts}>
      <DataTable<RankedProduct>
        label="Top products"
        rows={ranked}
        columns={columns}
        getRowId={(r) => r.productId || r.name}
        loading={loading}
        density="compact"
        phoneLayout="table"
        pageSize={10}
        pageSizeOptions={[10]}
        empty={{ title: "No products sold in this period" }}
      />
    </SectionCard>
  );
};

export default TopProductsTable;
