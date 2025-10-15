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
  Grid,
  Autocomplete,
} from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import { productsApi } from "@/api/products.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays } from "date-fns";

const ProductSalesCard: React.FC = () => {
  const [productId, setProductId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => productsApi.getAll(),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["product-sales", productId, dateRange],
    queryFn: () =>
      reportApi.getSalesByProduct(
        productId || undefined,
        dateRange.startDate,
        dateRange.endDate
      ),
  });

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <ShoppingCart sx={{ mr: 1, color: "secondary.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Sales by Product
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              size="small"
              options={products?.data || []}
              getOptionLabel={(option: any) => `${option.name} (${option.sku})`}
              value={
                products?.data?.find((p: any) => p.id === productId) || null
              }
              onChange={(_, value) => setProductId(value?.id || "")}
              renderInput={(params) => (
                <TextField {...params} label="Product" />
              )}
            />
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
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Qty Sold</TableCell>
                  <TableCell align="right">Revenue (USD)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.map((prod: any) => (
                  <TableRow key={prod.productId}>
                    <TableCell>{prod.productName}</TableCell>
                    <TableCell>{prod.productSku}</TableCell>
                    <TableCell align="right">
                      {prod.totalQuantitySold}
                    </TableCell>
                    <TableCell align="right">
                      ${prod.totalRevenue.usd.toFixed(2)}
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

export default ProductSalesCard;
