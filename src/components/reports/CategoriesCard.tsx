import React from "react";
import { CategoryOutlined } from "@mui/icons-material";
import { EmptyState, SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatUsd, plural } from "@/utils/format";
import type { CategoryRow } from "@/types/report.types";
import ShareList from "./ShareList";

/** Product revenue by category (drinks, snacks, food…). Gaming time is not a category. */
const CategoriesCard: React.FC<{ rows: CategoryRow[] | undefined; loading: boolean }> = ({ rows, loading }) => {
  const chart = useChartDefaults();
  return (
    <SectionCard title="Product sales by category" subtitle="Drinks, snacks and food (gaming time not included)">
      {!loading && rows && rows.length === 0 ? (
        <EmptyState compact icon={<CategoryOutlined />} title="No products sold in this period" />
      ) : (
        <ShareList
          label="Product revenue by category"
          loading={loading}
          color={chart.colors.products}
          rows={(rows ?? []).map((r) => ({ id: r.category, label: r.category, value: formatUsd(r.revenue), detail: plural(r.quantity, "item"), amount: r.revenue }))}
        />
      )}
    </SectionCard>
  );
};

export default CategoriesCard;
