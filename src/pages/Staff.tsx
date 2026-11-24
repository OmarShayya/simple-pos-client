import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { PersonAdd, Visibility, VisibilityOff, Block, Restore, Groups } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import EmptyState from "@/components/common/EmptyState";
import StatusChip from "@/components/common/StatusChip";
import { staffApi, type StaffMember } from "@/api/staff.api";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/auth.types";
import { handleApiError } from "@/utils/errorHandler";

const ROLE_INFO: Record<UserRole, { label: string; help: string }> = {
  admin: { label: "Admin", help: "Everything, including staff accounts and settings" },
  manager: { label: "Manager", help: "Reports, stations, discounts, booking rules; can add cashiers" },
  cashier: { label: "Cashier", help: "Sales, gaming sessions and reservations" },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const Staff: React.FC = () => {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === "admin";
  const allowedRoles: UserRole[] = isAdmin ? ["cashier", "manager", "admin"] : ["cashier"];

  const q = useQuery({ queryKey: ["staff"], queryFn: staffApi.list });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "cashier" as UserRole });
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const create = useMutation({
    mutationFn: () => staffApi.create({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() }),
    onSuccess: (u) => {
      toast.success(`${u.name} can now sign in`);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "cashier" });
      setTouched(false);
      invalidate();
    },
    onError: (e) => toast.error(handleApiError(e)),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; role?: UserRole; isActive?: boolean }): Promise<void> => {
      if (data.isActive === false) await staffApi.deactivate(id);
      else await staffApi.update(id, data);
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e) => toast.error(handleApiError(e)),
  });

  const emailOk = /^\S+@\S+\.\S+$/.test(form.email.trim());
  const valid = form.name.trim().length >= 2 && emailOk && form.password.length >= 8;
  const staff = q.data ?? [];

  const row = (u: StaffMember) => {
    const isMe = u.id === me?.id;
    return (
      <Card key={u.id} sx={{ p: 1.75, opacity: u.isActive ? 1 : 0.6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: u.role === "admin" ? "secondary.main" : "primary.main", color: "#000", fontWeight: 800 }}>{initials(u.name)}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>
                {u.name} {isMe && <Typography component="span" variant="caption" color="text.secondary">(you)</Typography>}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {u.email}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {!u.isActive && <StatusChip status="inactive" />}
            {isAdmin && u.isActive && !isMe ? (
              <TextField
                select
                size="small"
                value={u.role}
                onChange={(e) => update.mutate({ id: u.id, role: e.target.value as UserRole })}
                sx={{ minWidth: 130 }}
                slotProps={{ htmlInput: { "aria-label": `Role for ${u.name}` } }}
              >
                {(["cashier", "manager", "admin"] as UserRole[]).map((r) => (
                  <MenuItem key={r} value={r}>
                    {ROLE_INFO[r].label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <StatusChip status={u.role} label={ROLE_INFO[u.role]?.label ?? u.role} dot={false} />
            )}
            {isAdmin && !isMe && (
              <Tooltip title={u.isActive ? "Deactivate (can't sign in)" : "Reactivate"}>
                <IconButton
                  color={u.isActive ? "error" : "success"}
                  onClick={() => update.mutate({ id: u.id, isActive: !u.isActive })}
                  aria-label={u.isActive ? `Deactivate ${u.name}` : `Reactivate ${u.name}`}
                >
                  {u.isActive ? <Block /> : <Restore />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Card>
    );
  };

  return (
    <Box>
      <PageHeader
        title="Staff"
        subtitle="Who can sign in to the POS. New accounts can only be created here."
        actions={
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpen(true)}>
            Add staff
          </Button>
        }
      />

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          As a manager you can add cashier accounts. Ask an admin to change roles or deactivate accounts.
        </Alert>
      )}

      {q.isLoading ? (
        <Stack spacing={1.25}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      ) : q.isError ? (
        <Alert severity="error">{handleApiError(q.error)}</Alert>
      ) : staff.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<Groups />} title="No staff yet" />
        </SectionCard>
      ) : (
        <Stack spacing={1.25}>{staff.map(row)}</Stack>
      )}

      <Dialog open={open} onClose={() => !create.isPending && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Add staff account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={touched && form.name.trim().length < 2} autoFocus />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={touched && !emailOk}
              helperText={touched && !emailOk ? "Enter a valid email" : "They'll sign in with this"}
            />
            <TextField
              label="Temporary password"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={touched && form.password.length < 8}
              helperText="At least 8 characters — share it with them in person"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw((v) => !v)} edge="end" aria-label={showPw ? "Hide password" : "Show password"}>
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              helperText={ROLE_INFO[form.role].help}
            >
              {allowedRoles.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_INFO[r].label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={create.isPending}
            onClick={() => {
              setTouched(true);
              if (valid) create.mutate();
            }}
          >
            {create.isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;
