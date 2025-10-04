// src/components/ProtectedRoute/Admin/Dialogs/Framework/ConfirmDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

/**
 * 汎用確認ダイアログ
 * props:
 * - open: boolean
 * - title: string | ReactNode
 * - message: string | ReactNode
 * - confirmText?: string (default: "OK")
 * - cancelText?: string (default: "Cancel")
 * - onConfirm?: () => void
 * - onCancel?: () => void
 */
export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {typeof message === "string" ? (
          <Typography>{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
