import React, { useEffect, useState } from "react";
import { IconButton, InputAdornment, Stack, TextField, Tooltip } from "@mui/material";
import { VisibilityOffOutlined, VisibilityOutlined } from "@mui/icons-material";
import { FormDialog, SelectField } from "@/components/ui";
import type { StaffMember } from "@/api/staff.api";
import type { UserRole } from "@/types/auth.types";
import { ROLE_INFO } from "./roles";
import { useStaffMutations } from "./staffQueries";

export interface StaffFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this account (name + role); omit to create one. */
  member?: StaffMember | null;
  /** Roles the signed-in user may give. */
  allowedRoles: UserRole[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** New staff account (name, email, temporary password, role) or edit name / role. */
const StaffFormDialog: React.FC<StaffFormDialogProps> = ({ open, onClose, member, allowedRoles }) => {
  const editing = Boolean(member);
  const { create, update } = useStaffMutations();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(member?.name ?? "");
    setEmail(member?.email ?? "");
    setPassword("");
    setRole(member?.role ?? "cashier");
    setShowPw(false);
    setTouched(false);
  }, [open, member]);

  const errors = {
    name: name.trim().length < 2 ? "Enter their full name" : undefined,
    email: !editing && !EMAIL.test(email.trim()) ? "Enter a valid email — they sign in with it" : undefined,
    password: !editing && password.length < 8 ? "At least 8 characters" : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  const roles = editing && !allowedRoles.includes(role) ? [...allowedRoles, role] : allowedRoles;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    if (editing) update.mutate({ id: member!.id, name: name.trim(), role }, { onSuccess: onClose });
    else create.mutate({ name: name.trim(), email: email.trim().toLowerCase(), password, role }, { onSuccess: onClose });
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${member!.name}` : "Add staff account"}
      subtitle={editing ? member!.email : "They sign in with this email and the temporary password you give them."}
      onSubmit={submit}
      submitLabel={editing ? "Save changes" : "Create account"}
      loading={create.isPending || update.isPending}
      maxWidth="xs"
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus error={Boolean(show("name"))} helperText={show("name")} slotProps={{ htmlInput: { autoComplete: "off" } }} />
        {!editing && (
          <>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={Boolean(show("email"))} helperText={show("email")} slotProps={{ htmlInput: { autoComplete: "off", inputMode: "email" } }} />
            <TextField
              label="Temporary password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={Boolean(show("password"))}
              helperText={show("password") ?? "At least 8 characters — give it to them in person"}
              slotProps={{
                htmlInput: { autoComplete: "new-password" },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPw ? "Hide password" : "Show password"}>
                        <IconButton onClick={() => setShowPw((v) => !v)} edge="end" aria-label={showPw ? "Hide password" : "Show password"}>
                          {showPw ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </>
        )}
        <SelectField<UserRole>
          label="Role"
          value={role}
          onChange={setRole}
          options={roles.map((r) => ({ value: r, label: ROLE_INFO[r].label }))}
          helperText={ROLE_INFO[role].help}
          disabled={allowedRoles.length <= 1}
        />
      </Stack>
    </FormDialog>
  );
};

export default StaffFormDialog;
