import React, { useState } from "react";
import { Box, Grid, Tabs, Tab } from "@mui/material";
import {
  CalendarToday,
  Category,
  ShoppingCart,
  SportsEsports,
} from "@mui/icons-material";
import { format } from "date-fns";
import WeeklyReportCard from "@/components/reports/WeeklyReportCard";
import MonthlyReportCard from "@/components/reports/MonthlyReportCard";
import YearlyReportCard from "@/components/reports/YearlyReportCard";
import DailyReportCard from "@/components/reports/DailyReportCard";
import CategorySalesCard from "@/components/reports/CategorySalesCard";
import ProductSalesCard from "@/components/reports/ProductSalesCard";
import DailyTransactionsCard from "@/components/reports/DailyTransactionsCard";
import GamingRevenueCard from "@/components/reports/GamingRevenueCard";
import PageHeader from "@/components/common/PageHeader";

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [dailyParams, setDailyParams] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const [weeklyParams, setWeeklyParams] = useState({
    week: 1,
    month: currentMonth,
    year: currentYear,
  });

  const [monthlyParams, setMonthlyParams] = useState({
    month: currentMonth,
    year: currentYear,
  });

  const [yearlyParams, setYearlyParams] = useState({
    year: currentYear,
  });

  return (
    <Box>
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive sales and revenue reports" />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label="Time Reports"
          icon={<CalendarToday />}
          iconPosition="start"
        />
        <Tab
          label="Category & Products"
          icon={<Category />}
          iconPosition="start"
        />
        <Tab
          label="Transactions"
          icon={<ShoppingCart />}
          iconPosition="start"
        />
        <Tab
          label="Gaming Revenue"
          icon={<SportsEsports />}
          iconPosition="start"
        />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <DailyReportCard
              date={dailyParams.date}
              onDateChange={(date) => setDailyParams({ date })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <WeeklyReportCard
              week={weeklyParams.week}
              month={weeklyParams.month}
              year={weeklyParams.year}
              onParamsChange={setWeeklyParams}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <MonthlyReportCard
              month={monthlyParams.month}
              year={monthlyParams.year}
              onParamsChange={setMonthlyParams}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <YearlyReportCard
              year={yearlyParams.year}
              onParamsChange={setYearlyParams}
            />
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <CategorySalesCard />
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <ProductSalesCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <DailyTransactionsCard />
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <GamingRevenueCard />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
