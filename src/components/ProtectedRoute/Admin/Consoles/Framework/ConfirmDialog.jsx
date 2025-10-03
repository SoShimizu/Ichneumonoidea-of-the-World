// src/admin/console/framework/ConfirmDialog.jsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { Close as CloseIcon, Delete as DeleteIcon } from "@mui/icons-material";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  onCancel,
  onConfirm,
  confirmText = "Delete",
  color = "error",
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1 }}>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} startIcon={<CloseIcon />}>Cancel</Button>
        <Button onClick={onConfirm} color={color} variant="contained" startIcon={<DeleteIcon />}>{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
