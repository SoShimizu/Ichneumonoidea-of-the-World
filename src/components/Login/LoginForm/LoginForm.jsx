import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import supabase from "../../../utils/supabase"; // パスは適宜調整してください

import {
  TextField,
  Button,
  Stack,
  Typography,
  Collapse,
  Paper,
} from "@mui/material";

const loginInputSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "The password must be at least 6 characters long." }),
});

export default function LoginForm({ onSuccess }) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
    reset,
  } = useForm({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const { email, password } = data;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);

      if (!user.user_metadata?.display_name) {
        const displayName = window.prompt("Please enter a display name (you can change it later).");
        if (!displayName) {
          alert("Login process is canceled as no display name was entered.");
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({
          data: { display_name: displayName },
        });
        if (updateError) throw new Error("Failed to save display name: " + updateError.message);
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn("Failed to refresh session. Please log out and log back in.", refreshError.message);
        }
      }

      const { error: rpcError } = await supabase.rpc("set_changed_by", { new_email: user.email });
      if (rpcError) {
        console.warn("Failed to set session variable:", rpcError.message);
      }

      alert("Login succeeded!");
      onSuccess?.();
      navigate("/admin");
    } catch (err) {
      alert("Failed to log in: " + err.message);
    } finally {
      reset();
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="E-mail"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            )}
          />

          <Stack spacing={1}>
            <Button
              size="small"
              onClick={() => setShowInfo((prev) => !prev)}
              variant="text"
              sx={{
                alignSelf: "flex-start",
                p: 0,
                minWidth: "unset",
                textTransform: "none", // ボタンの大文字化防止
              }}
            >
              Who can log in?
            </Button>

            <Collapse in={showInfo}>
              <Typography align="center" variant="body2" color="text.primary">
                <strong>Restricted to administrators only!</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This database is maintained by a team of experts to ensure data quality.
                If you are interested in joining the management team, please contact the administrator.
              </Typography>
            </Collapse>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              fullWidth
              sx={{
                textTransform: "none", // ボタンの大文字化防止
                padding: "12px 0", // ボタンの縦の余白調整
              }}
            >
              LOGIN
            </Button>
          </Stack>
        </Stack>
      </form>
    </Paper>
  );
}
