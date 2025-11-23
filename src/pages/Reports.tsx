import React, { useState } from "react";
import { Box, Typography, Grid, Tabs, Tab } from "@mui/material";
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
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive sales and revenue reports
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
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
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <DailyReportCard
              date={dailyParams.date}
              onDateChange={(date) => setDailyParams({ date })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <WeeklyReportCard
              week={weeklyParams.week}
              month={weeklyParams.month}
              year={weeklyParams.year}
              onParamsChange={setWeeklyParams}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <MonthlyReportCard
              month={monthlyParams.month}
              year={monthlyParams.year}
              onParamsChange={setMonthlyParams}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
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
