// src/components/ProtectedRoute/Admin/Dialogs/DialogAuthorAdd.jsx
import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, CircularProgress, Alert
} from "@mui/material";
import supabase from "../../../../utils/supabase"; // 既存プロジェクトのsupabaseラッパーに合わせる

export default function DialogAuthorAdd({ open, onClose, onAdd }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const reset = () => {
    setFirstName("");
    setLastName("");
    setError("");
    setLoading(false);
  };

  const handleSave = async () => {
    setError("");
    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    setLoading(true);
    try {
      // researchers テーブルに合わせてフィールド名を調整してください
      const payload = {
        first_name_eng: firstName || null,
        last_name_eng:  lastName  || null,
      };
      const { data, error } = await supabase
        .from("researchers")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // 親に返却（DialogScientificNameEdit が期待する形）
      onAdd?.({
        id: data.id,
        first_name_eng: data.first_name_eng,
        last_name_eng:  data.last_name_eng,
      });
      reset();
      onClose?.();
    } catch (e) {
      setError(e.message || "Failed to add author.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Add / Edit Author</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Last Name (English)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoFocus
            required
          />
          <TextField
            label="First Name (English)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
