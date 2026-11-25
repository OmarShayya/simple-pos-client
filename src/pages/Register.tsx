import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Link, Skeleton, Stack, TextField } from "@mui/material";
import { PersonAddAlt1Outlined } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSetupStatus } from "@/components/auth/useSetupStatus";
import { authApi } from "@/api/auth.api";
import { affects } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useAuthStore } from "@/store/authStore";
import { friendlyError } from "@/utils/apiError";
import { PasswordField } from "@/components/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First run only: creates the owner (admin) account. Afterwards staff accounts are made on the Staff screen. */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setup = useSetupStatus();
  const closed = setup.data?.needsSetup === false;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const register = useApiMutation({
    mutationFn: authApi.register,
    invalidates: affects.staff,
    errorMessage: false,
    successMessage: "Welcome! Your owner account is ready.",
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate("/dashboard");
    },
  });

  const errors = {
    name: name.trim().length < 2 ? "Enter your full name" : undefined,
    email: !EMAIL.test(email.trim()) ? "Enter a valid email — you'll sign in with it" : undefined,
    password: password.length < 8 ? "At least 8 characters" : undefined,
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    // The first account is always the admin; the server decides the role
    register.mutate({ name: name.trim(), email: email.trim().toLowerCase(), password });
  };

  return (
    <AuthLayout
      title={closed ? "Ask an admin for an account" : "Set up Epic Lounge"}
      subtitle={closed ? "Staff accounts are created by an admin or a manager." : "Create the owner account. It gets full admin access."}
      footer={
        <>
          Already have an account?{" "}
          <Link component={RouterLink} to="/login">
            Sign in
          </Link>
        </>
      }
    >
      {setup.isLoading ? (
        <Stack spacing={2.5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
          <Skeleton variant="rounded" height={52} />
        </Stack>
      ) : closed ? (
        <Stack spacing={2.5}>
          <Alert severity="info">
            For security, accounts can't be created from this screen. Ask an admin to add you under <b>Admin → Staff</b> — they'll give you your email
            and a temporary password.
          </Alert>
          <Button variant="contained" size="large" fullWidth onClick={() => navigate("/login")} sx={{ minHeight: 52 }}>
            Back to sign in
          </Button>
        </Stack>
      ) : (
        <Box component="form" noValidate onSubmit={submit}>
          <Stack spacing={2.5}>
            {register.isError && <Alert severity="error">{friendlyError(register.error)}</Alert>}
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus error={Boolean(show("name"))} helperText={show("name")} slotProps={{ htmlInput: { autoComplete: "name" } }} />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={Boolean(show("email"))} helperText={show("email")} slotProps={{ htmlInput: { autoComplete: "username", inputMode: "email" } }} />
            <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required error={Boolean(show("password"))} helperText={show("password") ?? "At least 8 characters"} slotProps={{ htmlInput: { autoComplete: "new-password" } }} />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={register.isPending}
              startIcon={register.isPending ? <CircularProgress size={18} color="inherit" /> : <PersonAddAlt1Outlined />}
              sx={{ minHeight: 52, fontSize: "1rem" }}
            >
              {register.isPending ? "Creating account…" : "Create owner account"}
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  );
};

export default Register;
