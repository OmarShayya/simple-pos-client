import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, IconButton, Skeleton, Stack, Tooltip } from "@mui/material";
import { ComputerOutlined, EventAvailableOutlined, RefreshRounded, SportsEsportsOutlined } from "@mui/icons-material";
import { EmptyState, ErrorState, PageHeader, SegmentedControl } from "@/components/ui";
import { useNow } from "@/hooks/useNow";
import type { StationType } from "@/types/reservation.types";
import StationCard from "@/components/gaming/StationCard";
import StartSessionDialog from "@/components/gaming/StartSessionDialog";
import EndSessionDialog from "@/components/gaming/EndSessionDialog";
import { useStationBoard, type StationView } from "@/components/gaming/useStationBoard";
import PaymentDialog from "@/components/orders/PaymentDialog";
import { orderUrl } from "@/components/orders/orderMeta";

/** Maintenance stations show under "All" (a filter just for them isn't worth the space). */
type StateFilter = "all" | "available" | "occupied";
type TypeFilter = "all" | StationType;

const GRID = { display: "grid", gap: 2, alignItems: "stretch", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", listStyle: "none", m: 0, p: 0 } as const;

/**
 * Gaming stations (PCs + PlayStation rooms): start a session (always opens an order), watch time
 * and the order's running total live, end it and charge now or keep the order open.
 */
const GamingStations: React.FC = () => {
  const navigate = useNavigate();
  const board = useStationBoard();
  const now = useNow(1000);
  const [type, setType] = useState<TypeFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [starting, setStarting] = useState<StationView | null>(null);
  const [ending, setEnding] = useState<StationView | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);

  const typed = board.views.filter((v) => type === "all" || (v.pc.type ?? "pc") === type);
  const count = (s: StateFilter) => typed.filter((v) => s === "all" || v.state === s).length;
  const visible = typed.filter((v) => state === "all" || v.state === state);
  const hasPs = board.views.some((v) => v.pc.type === "playstation");
  const openBooking = (id: string) => navigate(`/reservations?highlight=${id}`);

  return (
    <Box>
      <PageHeader
        title="Gaming stations"
        subtitle="Start a session, add drinks to its order, end it and charge — time and totals update live."
        actions={
          <>
            <Tooltip title="Refresh">
              <IconButton aria-label="Refresh stations" onClick={() => board.refetch()} sx={{ border: 1, borderColor: "divider", "& svg": { animation: board.isFetching ? "pos-spin 0.9s linear infinite" : "none" } }}>
                <RefreshRounded />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<EventAvailableOutlined />} onClick={() => navigate("/reservations")}>
              Reservations
            </Button>
          </>
        }
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
          {hasPs && (
            <SegmentedControl<TypeFilter>
              aria-label="Station type"
              value={type}
              onChange={setType}
              options={[
                { value: "all", label: "All stations" },
                { value: "pc", label: "PCs", icon: <ComputerOutlined /> },
                { value: "playstation", label: "PlayStation", icon: <SportsEsportsOutlined /> },
              ]}
            />
          )}
          <SegmentedControl<StateFilter>
            aria-label="Station status"
            value={state}
            onChange={setState}
            options={[
              { value: "all", label: "All", count: board.isLoading ? undefined : count("all") },
              { value: "available", label: "Free", count: board.isLoading ? undefined : count("available") },
              { value: "occupied", label: "In use", count: board.isLoading ? undefined : count("occupied") },
            ]}
          />
        </Stack>
      </PageHeader>

      {board.error && !board.views.length ? (
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      ) : board.isLoading ? (
        <Box component="ul" sx={GRID} aria-busy>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box component="li" key={i} sx={{ border: 1, borderColor: "divider", borderRadius: "12px", p: 2 }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Skeleton variant="rounded" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                </Box>
              </Stack>
              <Skeleton width="100%" sx={{ mt: 2 }} />
              <Skeleton variant="rounded" height={52} sx={{ mt: 2 }} />
            </Box>
          ))}
        </Box>
      ) : visible.length === 0 ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px" }}>
          <EmptyState
            icon={<SportsEsportsOutlined />}
            title={board.views.length === 0 ? "No stations yet" : "No stations here"}
            description={board.views.length === 0 ? "Add your PCs and PlayStation rooms in Manage stations." : "No station matches this filter right now."}
            action={
              board.views.length === 0 ? (
                <Button variant="contained" onClick={() => navigate("/gaming/pc-management")}>
                  Manage stations
                </Button>
              ) : (
                <Button variant="outlined" onClick={() => { setState("all"); setType("all"); }}>
                  Show all stations
                </Button>
              )
            }
          />
        </Box>
      ) : (
        <Box component="ul" sx={GRID} aria-label="Stations">
          {visible.map((v) => (
            <StationCard
              key={v.pc.id}
              view={v}
              now={now}
              onStart={setStarting}
              onEnd={setEnding}
              onOpenOrder={(id) => navigate(orderUrl(id))}
              onOpenBooking={openBooking}
            />
          ))}
        </Box>
      )}

      <StartSessionDialog view={starting} onClose={() => setStarting(null)} onOpenBooking={openBooking} />
      <EndSessionDialog view={ending} onClose={() => setEnding(null)} onCharge={setPayFor} />
      <PaymentDialog orderId={payFor} open={Boolean(payFor)} onClose={() => setPayFor(null)} />
    </Box>
  );
};

export default GamingStations;
