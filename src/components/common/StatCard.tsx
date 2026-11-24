import React from "react";
import { Box, Card, CardActionArea, CardContent, Skeleton, Typography, alpha, useTheme } from "@mui/material";
import { brand } from "@/theme/theme";

export type StatTone = "primary" | "secondary" | "success" | "warning" | "error" | "info";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  /** Small line under the value (e.g. a breakdown). */
  hint?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

/** KPI tile: label, big number, optional icon + hint. */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone = "primary", hint, loading, onClick }) => {
  const theme = useTheme();
  const color = theme.palette[tone].main;

  const body = (
    <CardContent sx={{ p: { xs: 2, md: 2.25 }, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              color,
              bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.16 : 0.12),
              "& svg": { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      {loading ? (
        <Skeleton width="60%" height={40} />
      ) : (
        <Typography
          className="num"
          sx={{ fontFamily: brand.fontDisplay, fontWeight: 700, fontSize: { xs: "1.45rem", md: "1.65rem" }, mt: 0.75, lineHeight: 1.2 }}
        >
          {value}
        </Typography>
      )}
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </CardContent>
  );

  return (
    <Card sx={{ height: "100%" }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
};

export default StatCard;
