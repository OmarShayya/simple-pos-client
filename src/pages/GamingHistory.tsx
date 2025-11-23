import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Search, CalendarToday } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { gamingApi } from "@/api/gaming.api";
import { SessionStatus, SessionPaymentStatus } from "@/types/gaming.types";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format } from "date-fns";

const GamingHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    SessionPaymentStatus | ""
  >("");
  const [dateFilterType, setDateFilterType] = useState<"daily" | "range">(
    "daily"
  );
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const getDateFilters = () => {
    if (dateFilterType === "daily") {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
      };
    }
    return dateRange;
  };

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: [
      "gaming-sessions",
      paginationModel.page + 1,
      statusFilter,
      paymentStatusFilter,
      dateFilterType,
      selectedDate,
      dateRange,
    ],
    queryFn: () =>
      gamingApi.getAllSessions({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        ...getDateFilters(),
      }),
  });

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const columns: GridColDef[] = [
    {
      field: "sessionNumber",
      headerName: "Session #",
      width: 140,
    },
    {
      field: "pc",
      headerName: "PC",
      width: 150,
      renderCell: (params) =>
        `${params.row.pc.name} (${params.row.pc.pcNumber})`,
    },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
    },
    {
      field: "duration",
      headerName: "Duration",
      width: 120,
      renderCell: (params) => formatDuration(params.row.duration),
    },
    {
      field: "totalCost",
      headerName: "Total (USD)",
      width: 120,
      renderCell: (params) =>
        params.row.totalCost ? `$${params.row.totalCost.usd.toFixed(2)}` : "-",
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.status.toUpperCase()}
          color={
            params.row.status === SessionStatus.COMPLETED
              ? "success"
              : params.row.status === SessionStatus.ACTIVE
              ? "primary"
              : "default"
          }
          size="small"
        />
      ),
    },
    {
      field: "paymentStatus",
      headerName: "Payment",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.paymentStatus.toUpperCase()}
          color={
            params.row.paymentStatus === SessionPaymentStatus.PAID
              ? "success"
              : "warning"
          }
          size="small"
        />
      ),
    },
    {
      field: "startTime",
      headerName: "Start Time",
      width: 150,
      renderCell: (params) =>
        new Date(params.row.startTime).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Gaming Sessions History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View all gaming sessions and payments
          </Typography>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SessionStatus | "")
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SessionStatus.ACTIVE}>Active</MenuItem>
              <MenuItem value={SessionStatus.COMPLETED}>Completed</MenuItem>
              <MenuItem value={SessionStatus.CANCELLED}>Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              select
              label="Payment"
              value={paymentStatusFilter}
              onChange={(e) =>
                setPaymentStatusFilter(
                  e.target.value as SessionPaymentStatus | ""
                )
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SessionPaymentStatus.PAID}>Paid</MenuItem>
              <MenuItem value={SessionPaymentStatus.UNPAID}>Unpaid</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <ToggleButtonGroup
                value={dateFilterType}
                exclusive
                onChange={(_, value) => value && setDateFilterType(value)}
                size="small"
              >
                <ToggleButton value="daily">
                  <CalendarToday sx={{ mr: 0.5, fontSize: 18 }} />
                  Daily
                </ToggleButton>
                <ToggleButton value="range">Range</ToggleButton>
              </ToggleButtonGroup>
              {dateFilterType === "daily" ? (
                <TextField
                  type="date"
                  size="small"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  sx={{ flexGrow: 1 }}
                />
              ) : (
                <>
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        startDate: e.target.value,
                      })
                    }
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        endDate: e.target.value,
                      })
                    }
                    sx={{ flexGrow: 1 }}
                  />
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <DataGrid
          rows={sessionsData?.data || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={sessionsData?.pagination.total || 0}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationMode="server"
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>
    </Box>
  );
};

export default GamingHistory;
