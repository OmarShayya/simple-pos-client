import React, { useState } from "react";
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Link,
  Container,
  Stack,
  MenuItem,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PersonAdd,
  SportsEsports,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth.types";
import { handleApiError } from "@/utils/errorHandler";
import { toast } from "react-toastify";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.CASHIER,
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success("Registration successful!");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background: "#0A1929",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left Side - Animated Background with Branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "linear-gradient(135deg, #0A1929 0%, #1a237e 50%, #0A1929 100%)",
          overflow: "hidden",
        }}
      >
        {/* Animated Background Grid */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, #00CED1 2px, #00CED1 4px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, #9B51E0 2px, #9B51E0 4px)
            `,
            backgroundSize: "100px 100px",
            animation: "gridMove 20s linear infinite",
            "@keyframes gridMove": {
              "0%": { transform: "translate(0, 0)" },
              "100%": { transform: "translate(100px, 100px)" },
            },
          }}
        />

        {/* Glowing Orbs */}
        <Box
          component={motion.div}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          sx={{
            position: "absolute",
            top: "20%",
            right: "10%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,206,209,0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <Box
          component={motion.div}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          sx={{
            position: "absolute",
            bottom: "20%",
            left: "10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(155,81,224,0.4) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            px: 4,
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Epic Lounge"
              sx={{
                height: 120,
                width: "auto",
                mb: 4,
                filter: "drop-shadow(0 0 30px rgba(0,206,209,0.6))",
              }}
            />
          </motion.div>

          {/* Brand Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <Typography
              sx={{
                fontSize: "4rem",
                fontWeight: 900,
                fontFamily: "Orbitron",
                textTransform: "uppercase",
                background:
                  "linear-gradient(135deg, #00CED1 0%, #9B51E0 50%, #FF00FF 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradient 4s linear infinite",
                textShadow: "0 0 80px rgba(0,206,209,0.5)",
                letterSpacing: "0.05em",
                mb: 2,
                "@keyframes gradient": {
                  "0%": { backgroundPosition: "0% center" },
                  "100%": { backgroundPosition: "200% center" },
                },
              }}
            >
              EPIC LOUNGE
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Typography
              variant="h5"
              sx={{
                color: "#B2BAC2",
                fontWeight: 600,
                mb: 4,
              }}
            >
              Point of Sale System
            </Typography>
          </motion.div>

          {/* Animated Gaming Icon */}
          <motion.div
            animate={{
              rotate: [0, 5, 0, -5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Box
              sx={{
                display: "inline-block",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(0,206,209,0.4) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <SportsEsports
                sx={{
                  fontSize: 100,
                  color: "#00CED1",
                  filter: "drop-shadow(0 0 20px rgba(0,206,209,0.8))",
                  position: "relative",
                }}
              />
            </Box>
          </motion.div>
        </Box>
      </Box>

      {/* Right Side - Register Form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(19, 47, 76, 0.3)",
          backdropFilter: "blur(10px)",
          position: "relative",
        }}
      >
        {/* Decorative Corner Elements */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 100,
            height: 100,
            borderTop: "3px solid #00CED1",
            borderRight: "3px solid #00CED1",
            opacity: 0.5,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            width: 100,
            height: 100,
            borderBottom: "3px solid #9B51E0",
            borderLeft: "3px solid #9B51E0",
            opacity: 0.5,
          }}
        />

        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card
              sx={{
                background: "rgba(10, 25, 41, 0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0,206,209,0.3)",
                borderRadius: 4,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <Box sx={{ p: 5 }}>
                {/* Mobile Logo */}
                <Box
                  sx={{
                    display: { xs: "flex", md: "none" },
                    justifyContent: "center",
                    mb: 3,
                  }}
                >
                  <Box
                    component="img"
                    src="/logo.png"
                    alt="Epic Lounge"
                    sx={{
                      height: 80,
                      width: "auto",
                      filter: "drop-shadow(0 0 20px rgba(0,206,209,0.6))",
                    }}
                  />
                </Box>

                {/* Header */}
                <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: "Orbitron",
                      fontWeight: 700,
                      background:
                        "linear-gradient(135deg, #00CED1 0%, #9B51E0 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 1,
                    }}
                  >
                    Create Account
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#B2BAC2" }}>
                    Join the Epic Lounge team
                  </Typography>
                </Box>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      autoFocus
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "&:hover fieldset": {
                            borderColor: "#00CED1",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#00CED1",
                          },
                        },
                        "& .MuiInputLabel-root.Mui-focused": {
                          color: "#00CED1",
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "&:hover fieldset": {
                            borderColor: "#00CED1",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#00CED1",
                          },
                        },
                        "& .MuiInputLabel-root.Mui-focused": {
                          color: "#00CED1",
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      helperText="Minimum 8 characters"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ color: "#00CED1" }}
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "&:hover fieldset": {
                            borderColor: "#00CED1",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#00CED1",
                          },
                        },
                        "& .MuiInputLabel-root.Mui-focused": {
                          color: "#00CED1",
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      select
                      label="Role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      helperText="Select your role in the system"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "&:hover fieldset": {
                            borderColor: "#00CED1",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#00CED1",
                          },
                        },
                        "& .MuiInputLabel-root.Mui-focused": {
                          color: "#00CED1",
                        },
                      }}
                    >
                      <MenuItem value={UserRole.CASHIER}>Cashier</MenuItem>
                      <MenuItem value={UserRole.MANAGER}>Manager</MenuItem>
                      <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                    </TextField>

                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<PersonAdd />}
                      disabled={registerMutation.isPending}
                      sx={{
                        py: 1.8,
                        fontSize: "1.1rem",
                        fontFamily: "Orbitron",
                        fontWeight: 700,
                        background:
                          "linear-gradient(135deg, #00CED1 0%, #9B51E0 100%)",
                        boxShadow: "0 8px 32px rgba(0,206,209,0.4)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #5FE3E6 0%, #BA7FED 100%)",
                          boxShadow: "0 12px 48px rgba(155,81,224,0.6)",
                          transform: "translateY(-2px)",
                        },
                        transition: "all 0.3s ease",
                      }}
                    >
                      {registerMutation.isPending
                        ? "Creating Account..."
                        : "Sign Up"}
                    </Button>
                  </Stack>
                </form>

                {/* Footer */}
                <Box sx={{ textAlign: "center", mt: 3 }}>
                  <Typography variant="body2" sx={{ color: "#B2BAC2" }}>
                    Already have an account?{" "}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate("/login")}
                      sx={{
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "#00CED1",
                        textDecoration: "none",
                        "&:hover": {
                          color: "#9B51E0",
                        },
                      }}
                    >
                      Sign in
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Card>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default Register;
