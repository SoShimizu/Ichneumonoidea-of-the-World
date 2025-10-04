// src/components/ScientificNameDialog/Sections/OtherInfoSection.jsx
import React from 'react';
import { Box, TextField, Autocomplete, Typography } from '@mui/material';

const SectionOtherInfo = ({ form, handleChange, statuses }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Other Information
      </Typography>

      <Autocomplete
        options={statuses.sort()} // Sort basic statuses alphabetically
        value={form.extant_fossil || null}
        onChange={(e, v) => handleChange('extant_fossil', v || null)}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Status (Extant / Fossil)"
            margin="dense"
            fullWidth
          />
        )}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Remarks"
        value={form.remark || ''} // Ensure controlled component
        onChange={(e) => handleChange('remark', e.target.value)}
        fullWidth
        margin="dense"
        multiline
        rows={3}
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

export default SectionOtherInfo;