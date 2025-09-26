// ファイル例: /components/Dialogs/DialogRepository.jsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from "@mui/material";
import supabase from "../../../../utils/supabase";

/**
 * @param {Object} props
 * @param {boolean} props.open - ダイアログを開くかどうか
 * @param {function} props.onClose - ダイアログを閉じるコールバック
 * @param {Object} [props.repository] - 編集対象のレコード。null/undefinedの場合、新規追加モード
 * @param {function} [props.onSaved] - 保存後に呼ばれるコールバック (再取得用)
 */
export default function DialogRepository({ open, onClose, repository, onSaved }) {
  // repository があれば編集モード
  const isEditMode = !!(repository && repository.id);
  const dialogTitle = isEditMode ? "Edit Repository" : "Add Repository";

  const [form, setForm] = useState({
    id: "",
    full_name: "",
    city: "",
    country: "",
    full_name_original: "",
    Remark: "",
  });

  useEffect(() => {
    if (repository) {
      setForm({
        id: repository.id || "",
        full_name: repository.full_name || "",
        city: repository.city || "",
        country: repository.country || "",
        full_name_original: repository.full_name_original || "",
        Remark: repository.Remark || "",
      });
    } else {
      setForm({
        id: "",
        full_name: "",
        city: "",
        country: "",
        full_name_original: "",
        Remark: "",
      });
    }
  }, [repository]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // 必須チェック
    if (!form.id.trim() || !form.full_name.trim()) {
      alert("Required fields are missing (ID or Full Name).");
      return;
    }

    if (isEditMode) {
      // Update
      const { error } = await supabase
        .from("Repositories")
        .update({
          full_name: form.full_name,
          city: form.city,
          country: form.country,
          full_name_original: form.full_name_original,
          Remark: form.Remark,
        })
        .eq("id", form.id);

      if (error) {
        alert("Update failed: " + error.message);
      } else {
        alert("Repository updated successfully.");
        if (onSaved) onSaved(); // 再取得など
        onClose();
      }
    } else {
      // Insert
      const { data: dup } = await supabase
        .from("Repositories")
        .select("id")
        .eq("id", form.id);

      if (dup?.length > 0) {
        alert("Duplicate ID found.");
        return;
      }

      const { error } = await supabase
        .from("Repositories")
        .insert([form]);

      if (error) {
        alert("Insert failed: " + error.message);
      } else {
        alert("Repository added successfully.");
        if (onSaved) onSaved(); // 再取得など
        onClose();
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this repository?")) return;

    const { error } = await supabase
      .from("Repositories")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      alert("Repository deleted successfully.");
      if (onSaved) onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        {/* ID */}
        <TextField
          label="ID (Required)"
          value={form.id}
          onChange={(e) => handleChange("id", e.target.value)}
          fullWidth
          margin="dense"
          disabled={isEditMode} // IDは更新不可にする
        />

        <TextField
          label="Full Name (Required)"
          value={form.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
          fullWidth
          margin="dense"
        />

        <TextField
          label="City"
          value={form.city}
          onChange={(e) => handleChange("city", e.target.value)}
          fullWidth
          margin="dense"
        />

        <TextField
          label="Country"
          value={form.country}
          onChange={(e) => handleChange("country", e.target.value)}
          fullWidth
          margin="dense"
        />

        <TextField
          label="Full Name (Original)"
          value={form.full_name_original}
          onChange={(e) => handleChange("full_name_original", e.target.value)}
          fullWidth
          margin="dense"
        />

        <TextField
          label="Remark"
          value={form.Remark}
          onChange={(e) => handleChange("Remark", e.target.value)}
          fullWidth
          margin="dense"
          multiline
        />
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={handleSave}>
          {isEditMode ? "Update" : "Add"}
        </Button>
        {isEditMode && (
          <Button variant="outlined" color="error" onClick={handleDelete}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
