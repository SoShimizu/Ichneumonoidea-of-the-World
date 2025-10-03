// src/admin/console/framework/AdminConsoleLayout.jsx
import React from "react";
import { AppBar, Box, Chip, Divider, Paper, Stack, Toolbar, Typography } from "@mui/material";

export default function AdminConsoleLayout({ title, subtitle, actions, children }) {
  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ borderRadius: 3 }}>
        <AppBar position="static" color="transparent" enableColorOnDark sx={{ background: "transparent" }}>
          <Toolbar sx={{ gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{title}</Typography>
            {subtitle && <Chip label={subtitle} variant="outlined" />}
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={1}>{actions}</Stack>
          </Toolbar>
        </AppBar>
        <Divider />
        <Box sx={{ p: 2 }}>{children}</Box>
      </Paper>
    </Box>
  );
}
