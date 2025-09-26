import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormHelperText
} from "@mui/material";
import { useState, useEffect } from "react";
import supabase from "../../../../utils/supabase";

export default function DialogJournalAdd({ open, onClose, onAdd, journalToEdit = null }) {
  const isEditMode = !!journalToEdit;

  const [form, setForm] = useState({
    id: "",
    issn: "",
    publisher: "",
    name_english: "",
    name_original: ""
  });

  const [errors, setErrors] = useState({
    id: false,
    name_english: false,
    name_original: false
  });

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        setForm(journalToEdit);
      } else {
        setForm({
          id: "",
          issn: "",
          publisher: "",
          name_english: "",
          name_original: ""
        });
      }

      setErrors({
        id: false,
        name_english: false,
        name_original: false
      });
    }
  }, [open, journalToEdit, isEditMode]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async () => {
    const newErrors = {
      id: !form.id.trim(),
      name_english: !form.name_english.trim(),
      name_original: !form.name_original.trim()
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    if (!isEditMode) {
      const { data: duplicate } = await supabase
        .from("journals")
        .select("id")
        .eq("id", form.id);

      if (duplicate?.length > 0) {
        alert("Journal ID already exists. Please use a unique ID.");
        return;
      }

      const { data, error } = await supabase
        .from("journals")
        .insert([form])
        .select()
        .single();

      if (error) {
        alert("Failed to add journal: " + error.message);
      } else {
        onAdd(data);
        onClose();
      }
    } else {
      const { error } = await supabase
        .from("journals")
        .update(form)
        .eq("id", form.id);

      if (error) {
        alert("Failed to update journal: " + error.message);
      } else {
        onAdd(form); // 既存IDなので form を返す
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEditMode ? "Edit Journal" : "Add New Journal"}</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="ID"
          value={form.id}
          onChange={(e) => handleChange("id", e.target.value)}
          fullWidth
          margin="dense"
          disabled={isEditMode}
          error={errors.id}
          helperText={errors.id
            ? "ID is required."
            : isEditMode
              ? "ID cannot be changed."
              : "Set a unique ID (e.g., Zootaxa). This cannot be changed later."
          }
        />

        <TextField
          label="ISSN"
          value={form.issn}
          onChange={(e) => handleChange("issn", e.target.value)}
          fullWidth
          margin="dense"
        />
        <FormHelperText sx={{ mt: -1, mb: 2 }}>
          <strong>Optional</strong>: Enter the ISSN if available.
        </FormHelperText>

        <TextField
          label="Publisher"
          value={form.publisher}
          onChange={(e) => handleChange("publisher", e.target.value)}
          fullWidth
          margin="dense"
        />
        <FormHelperText sx={{ mt: -1, mb: 2 }}>
          <strong>Optional</strong>
        </FormHelperText>

        <TextField
          label="Journal Name (English)"
          value={form.name_english}
          onChange={(e) => handleChange("name_english", e.target.value)}
          fullWidth
          margin="dense"
          error={errors.name_english}
          helperText={errors.name_english ? "English name is required." : "*Required"}
        />

        <TextField
          label="Journal Name (Original Language)"
          value={form.name_original}
          onChange={(e) => handleChange("name_original", e.target.value)}
          fullWidth
          margin="dense"
          error={errors.name_original}
          helperText={errors.name_original ? "Original name is required." : "*Required"}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="contained">
          {isEditMode ? "Update" : "Add"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
