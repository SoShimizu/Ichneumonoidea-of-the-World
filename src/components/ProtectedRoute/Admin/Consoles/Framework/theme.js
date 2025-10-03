// src/admin/console/framework/theme.js
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7dd3fc" },
    secondary: { main: "#a78bfa" },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 12, textTransform: "none", fontWeight: 700 } } },
    MuiDataGrid: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
  },
});
