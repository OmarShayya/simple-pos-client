import React from "react";
import { PaymentsOutlined } from "@mui/icons-material";
import { EmptyState, SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatUsd, plural } from "@/utils/format";
import type { PaymentMethodRow } from "@/types/report.types";
import ShareList from "./ShareList";
import { paymentLabel } from "./reportColumns";

/** Revenue by payment method (cash / card / bank transfer). */
const PaymentsCard: React.FC<{ rows: PaymentMethodRow[] | undefined; loading: boolean }> = ({ rows, loading }) => {
  const chart = useChartDefaults();
  return (
    <SectionCard title="How customers paid" subtitle="Revenue by payment method">
      {!loading && rows && rows.length === 0 ? (
        <EmptyState compact icon={<PaymentsOutlined />} title="No payments in this period" />
      ) : (
        <ShareList
          label="Revenue by payment method"
          loading={loading}
          color={chart.colors.other}
          rows={(rows ?? []).map((r) => ({ id: r.method, label: paymentLabel(r.method), value: formatUsd(r.amount), detail: plural(r.count, "order"), amount: r.amount }))}
        />
      )}
    </SectionCard>
  );
};

export default PaymentsCard;
