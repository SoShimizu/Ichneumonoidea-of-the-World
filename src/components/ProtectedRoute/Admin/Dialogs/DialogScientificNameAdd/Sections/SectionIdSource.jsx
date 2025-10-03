// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/Sections/SectionIdSource.jsx
import React from "react";
import { Box, TextField, Typography } from "@mui/material";
import PublicationSelector from "../../parts/PublicationSelector";

export default function SectionIdSource({
  form,
  handleChange,
  errors,
  publications,
  renderPublicationLabel,
  onShowAddPublication,   // 使わないが互換のため残す
  onRefreshPublications,  // PublicationSelectorに渡す
}) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
        Data ID & Source Publication
      </Typography>

      {/* 1) ID */}
      <TextField
        label="ID (Required)"
        value={form.id}
        onChange={(e) => handleChange("id", e.target.value)}
        fullWidth
        margin="dense"
        required
        error={Boolean(errors.id)}
        helperText={
          errors.id
            ? "ID is required."
            : "Create a unique ID, e.g., 'Genus_species_Author,Year'. Replace spaces with underscores."
        }
        sx={{ mb: 2 }}
      />

      {/* 2) Source Publication（オートコンプリート） */}
      <PublicationSelector
        label="Source of Original Description"
        value={form.source_of_original_description || null}
        onChange={(id) => handleChange("source_of_original_description", id)}
        publicationsData={publications}
        renderOptionLabel={renderPublicationLabel}
        required={false}
        // 両prop名に対応しているコンポーネントなのでどちらでもOK
        onRefreshPublications={onRefreshPublications}
      />

      {/* 3) Page */}
      <TextField
        label="Page in Source"
        value={form.page}
        onChange={(e) => handleChange("page", e.target.value)}
        fullWidth
        margin="dense"
        sx={{ mt: 1 }}
      />
    </Box>
  );
}
