import React, { useState } from "react";
import supabase from "../../../../utils/supabase";
import {
    Button,
    Dialog,
    DialogActions,
    DialogTitle,
    DialogContent,
  TextField,
} from "@mui/material";

export default function DialogTypeCategoryAdd({ open, onClose, onAdd }) {
  const [newCategory, setNewCategory] = useState("");

  const handleSave = async () => {
    if (!newCategory.trim()) return;

    const { error } = await supabase.from("type_categories").insert([{ id: newCategory.trim() }]);
    if (error) {
      alert("Failed to add new type category.");
      console.error(error);
    } else {
      onAdd({ id: newCategory.trim() });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Type Category</DialogTitle>
      <DialogContent>
        <TextField
          label="Type Category (e.g., Holotype)"
          fullWidth
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
