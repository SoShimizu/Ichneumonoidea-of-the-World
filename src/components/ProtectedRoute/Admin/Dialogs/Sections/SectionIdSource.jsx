// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/Sections/SectionIdSource.jsx
import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import PublicationSelector from '../parts/PublicationSelector';

// props:
//   publications, renderPublicationLabel, onRefreshPublications などは既存通り
//   ✅ 追加: disableId（Edit 時に ID 入力を無効化）
export default function SectionIdSource({
  form,
  handleChange,
  errors,
  publications,
  renderPublicationLabel,
  onShowAddPublication,
  onRefreshPublications,
  disableId = false,
}) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Data ID & Source Publication
      </Typography>

      {/* 1) ID 入力 */}
      <TextField
        label="ID (Required)"
        value={form.id}
        onChange={(e) => handleChange('id', e.target.value)}
        fullWidth
        margin="dense"
        required
        disabled={disableId}          // ✅ ここで無効化
        error={Boolean(errors?.id)}
        helperText={
          errors?.id
            ? 'ID is required.'
            : disableId
              ? 'ID cannot be changed in edit mode.'
              : "Create a unique ID, e.g., 'Genus_species_Author,Year'. Replace spaces with underscores."
        }
        sx={{ mb: 2 }}
      />

      {/* 2) Publication 選択 */}
      <PublicationSelector
        label="Source of Original Description"
        publicationsData={publications}
        renderOptionLabel={renderPublicationLabel}
        onChange={(id) => handleChange('source_of_original_description', id)}
        isRequired={false}
        onRefreshData={onRefreshPublications}
      />

      {/* 3) Page */}
      <TextField
        label="Page in Source"
        value={form.page}
        onChange={(e) => handleChange('page', e.target.value)}
        fullWidth
        margin="dense"
        sx={{ mt: 1 }}
      />
    </Box>
  );
}
