// src/components/ScientificNameDialog/Sections/NameSpellingSection.jsx
import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

const SectionNameSpelling = ({ form, handleChange, errors }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Name Spelling
      </Typography>
      <Typography variant="caption" display="block" gutterBottom>
        Enter the specific part of the name being described (e.g., for "Genus species", enter "species").
      </Typography>

      <TextField
        label="Valid Name Spelling (Required)"
        value={form.name_spell_valid}
        onChange={(e) => handleChange('name_spell_valid', e.target.value)}
        fullWidth
        margin="dense"
        required
        error={errors.nameSpell} // Use error flag from parent
        helperText={errors.nameSpell ? 'Valid Name Spelling is required.' : ''}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Original Spelling (if different)"
        value={form.name_spell_original || ''}
        onChange={(e) => handleChange('name_spell_original', e.target.value)}
        fullWidth
        margin="dense"
        // Original spelling is optional, so no required/error logic needed unless specified
        // error={!form.name_spell_original?.trim()} // Example if it were required
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

export default SectionNameSpelling;