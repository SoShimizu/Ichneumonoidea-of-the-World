// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/DialogScientificNameAdd.jsx
import React from "react";
import DialogScientificNameUpsert from "./DialogScientificNameUpsert";

export default function DialogScientificNameAdd({ open, onClose }) {
  return (
    <DialogScientificNameUpsert
      open={open}
      mode="add"
      onClose={onClose}
    />
  );
}
