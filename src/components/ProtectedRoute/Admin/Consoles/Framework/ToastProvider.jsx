// src/admin/console/framework/ToastProvider.jsx
import React, { createContext, useContext, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const ToastCtx = createContext({ push: (_severity, _msg) => {} });

export const ToastProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [severity, setSeverity] = useState("info");

  const push = (sev, m) => {
    setSeverity(sev);
    setMsg(m);
    setOpen(true);
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setOpen(false)} severity={severity} variant="filled" sx={{ width: "100%" }}>
          {msg}
        </Alert>
      </Snackbar>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);
