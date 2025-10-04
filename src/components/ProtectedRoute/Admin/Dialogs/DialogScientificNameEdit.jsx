// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/DialogScientificNameEdit.jsx
import React from "react";
import DialogScientificNameUpsert from "./DialogScientificNameUpsert";

export default function DialogScientificNameEdit({ open, scientificName, onClose }) {
  return (
    <DialogScientificNameUpsert
      open={open}
      mode="edit"
      scientificName={scientificName}
      onClose={onClose}
    />
  );
}
