import React, { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { BlockOutlined, EditOutlined, PersonAddAlt1Outlined, RestoreRounded } from "@mui/icons-material";
import { DataTable, IconAction, PageHeader, StatusChip } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import StaffFormDialog from "@/components/staff/StaffFormDialog";
import { ROLE_INFO } from "@/components/staff/roles";
import { useStaffList, useStaffMutations } from "@/components/staff/staffQueries";
import { useConfirm } from "@/hooks/useConfirm";
import { useAuthStore } from "@/store/authStore";
import type { StaffMember } from "@/api/staff.api";
import type { UserRole } from "@/types/auth.types";

/** Who can sign in to the POS, and what they can do. */
const Staff: React.FC = () => {
  const confirm = useConfirm();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === "admin";
  const allowedRoles: UserRole[] = isAdmin ? ["cashier", "manager", "admin"] : ["cashier"];
  const q = useStaffList();
  const { update } = useStaffMutations();
  const [form, setForm] = useState<{ member: StaffMember | null } | null>(null);

  const toggleActive = async (u: StaffMember) => {
    if (u.isActive) {
      const ok = await confirm({
        title: `Deactivate ${u.name}?`,
        message: "They can't sign in any more. Their sales and history stay. You can reactivate the account later.",
        confirmLabel: "Deactivate",
        tone: "danger",
      });
      if (!ok) return;
    }
    update.mutate({ id: u.id, isActive: !u.isActive });
  };

  const columns: DataTableColumn<StaffMember>[] = [
    {
      field: "name",
      header: "Name",
      flex: 1,
      minWidth: 180,
      mobile: "title",
      render: (u) => (
        <span>
          {u.name}
          {u.id === me?.id && (
            <Typography component="span" variant="body2" color="text.secondary">
              {" "}
              (you)
            </Typography>
          )}
        </span>
      ),
    },
    { field: "email", header: "Email", flex: 1.2, minWidth: 200, mobile: "subtitle" },
    { field: "role", header: "Role", width: 130, value: (u) => ROLE_INFO[u.role]?.label ?? u.role, render: (u) => <StatusChip status={u.role} kind="role" dot={false} /> },
    { field: "isActive", header: "Status", width: 150, value: (u) => (u.isActive ? "active" : "inactive"), render: (u) => <StatusChip status={u.isActive ? "active" : "inactive"} kind="generic" label={u.isActive ? "Can sign in" : "Deactivated"} />, mobile: "end" },
    { field: "createdAt", header: "Added", type: "date", width: 130, hideBelow: "lg", mobile: "hidden" },
    ...(isAdmin
      ? [
          {
            field: "actions",
            header: "Actions",
            type: "actions",
            width: 112,
            render: (u: StaffMember) =>
              u.id === me?.id ? null : (
                <>
                  <IconAction title="Edit name or role" label={`Edit ${u.name}`} icon={<EditOutlined />} onClick={() => setForm({ member: u })} />
                  <IconAction title={u.isActive ? "Deactivate (can't sign in)" : "Reactivate"} label={u.isActive ? `Deactivate ${u.name}` : `Reactivate ${u.name}`} icon={u.isActive ? <BlockOutlined /> : <RestoreRounded />} onClick={() => toggleActive(u)} tone={u.isActive ? "danger" : "default"} />
                </>
              ),
          } satisfies DataTableColumn<StaffMember>,
        ]
      : []),
  ];

  return (
    <Box>
      <PageHeader
        title="Staff"
        subtitle="Who can sign in to the POS. New accounts are only created here."
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1Outlined />} onClick={() => setForm({ member: null })}>
            Add staff
          </Button>
        }
      />
      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          As a manager you can add cashier accounts. Ask an admin to change roles or deactivate accounts.
        </Alert>
      )}
      <DataTable<StaffMember>
        label="Staff"
        rows={q.data}
        columns={columns}
        loading={q.isLoading}
        refreshing={q.isFetching && !q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onRefresh={() => q.refetch()}
        search={{ placeholder: "Search name or email" }}
        onRowClick={isAdmin ? (u) => u.id !== me?.id && setForm({ member: u }) : undefined}
        empty={{ title: "No staff yet" }}
      />
      <StaffFormDialog open={Boolean(form)} member={form?.member} allowedRoles={allowedRoles} onClose={() => setForm(null)} />
    </Box>
  );
};

export default Staff;
