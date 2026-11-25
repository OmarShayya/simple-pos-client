import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Link, Stack, TextField } from "@mui/material";
import { LoginRounded } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSetupStatus } from "@/components/auth/useSetupStatus";
import { authApi } from "@/api/auth.api";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useAuthStore } from "@/store/authStore";
import { friendlyError } from "@/utils/apiError";
import { PasswordField } from "@/components/ui";

/** Staff sign-in. The first-run link to create the owner account only shows while no account exists. */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setup = useSetupStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const login = useApiMutation({
    mutationFn: authApi.login,
    errorMessage: false,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate("/dashboard");
    },
  });

  const missing = { email: !email.trim(), password: !password };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.email || missing.password) return;
    login.mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the email and password the owner gave you."
      footer={
        setup.data?.needsSetup ? null : "New here? Ask an admin to create your account."
      }
    >
      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2.5}>
          {setup.data?.needsSetup && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" onClick={() => navigate("/register")}>
                  Set up
                </Button>
              }
            >
              First time? Create the owner account.
            </Alert>
          )}
          {login.isError && <Alert severity="error">{friendlyError(login.error)}</Alert>}
          <TextField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            error={touched && missing.email}
            helperText={touched && missing.email ? "Enter your email" : undefined}
            slotProps={{ htmlInput: { autoComplete: "username", inputMode: "email" } }}
          />
          <PasswordField
            label="Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={touched && missing.password}
            helperText={touched && missing.password ? "Enter your password" : undefined}
            slotProps={{ htmlInput: { autoComplete: "current-password" } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={login.isPending}
            startIcon={login.isPending ? <CircularProgress size={18} color="inherit" /> : <LoginRounded />}
            sx={{ minHeight: 52, fontSize: "1rem" }}
          >
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
          {setup.data?.needsSetup && (
            <Link component={RouterLink} to="/register" sx={{ textAlign: "center" }}>
              Set up the owner account
            </Link>
          )}
        </Stack>
      </Box>
    </AuthLayout>
  );
};

export default Login;
