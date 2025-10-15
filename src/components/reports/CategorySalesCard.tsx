import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  Grid,
} from "@mui/material";
import { Category } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import { categoriesApi } from "@/api/categories.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays } from "date-fns";

const CategorySalesCard: React.FC = () => {
  const [categoryId, setCategoryId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => categoriesApi.getAll(),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["category-sales", categoryId, dateRange],
    queryFn: () =>
      reportApi.getSalesByCategory(
        categoryId || undefined,
        dateRange.startDate,
        dateRange.endDate
      ),
  });

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Category sx={{ mr: 1, color: "warning.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Sales by Category
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories?.data?.map((cat: any) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="date"
              size="small"
              label="Start Date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="date"
              size="small"
              label="End Date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {isLoading ? (
          <LoadingSpinner />
        ) : report && report.length > 0 ? (
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Qty Sold</TableCell>
                  <TableCell align="right">Revenue (USD)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.map((cat: any) => (
                  <TableRow key={cat.categoryId}>
                    <TableCell>{cat.categoryName}</TableCell>
                    <TableCell align="right">{cat.totalQuantitySold}</TableCell>
                    <TableCell align="right">
                      ${cat.totalRevenue.usd.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No data available
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default CategorySalesCard;
