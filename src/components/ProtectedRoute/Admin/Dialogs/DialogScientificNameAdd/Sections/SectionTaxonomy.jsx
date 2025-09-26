// src/components/ScientificNameDialog/Sections/TaxonomySection.jsx
import React from 'react';
import { Box, TextField, Autocomplete, Typography } from '@mui/material';
import ScientificNameSelector from '../../parts/ScientificNameSelector';

const SectionTaxonomy = ({ form, handleChange, errors, ranks, scientificNameData, refresh }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Taxonomic Rank & Hierarchy
      </Typography>

      <Autocomplete
        options={ranks}
        value={form.current_rank || null}
        onChange={(e, v) => handleChange('current_rank', v || null)}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Current Rank (Required)"
            margin="dense"
            fullWidth
            required
            error={errors.currentRank} // Use error flag
            helperText={errors.currentRank ? 'Current Rank is required.' : ''}
          />
        )}
        sx={{ mb: 2 }}
      />

      <Autocomplete
        options={ranks}
        value={form.original_rank || null}
        onChange={(e, v) => handleChange('original_rank', v || null)}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Original Rank (if different)"
            margin="dense"
            fullWidth
          />
        )}
        sx={{ mb: 2 }}
      />

      <Typography variant="caption" display="block" gutterBottom>
        Select the direct parent taxon for the **current** classification.
      </Typography>

      <ScientificNameSelector
        label="Current Parent"
        isRequired="true"
        scientificNameData={scientificNameData}
        onChange={id => handleChange('current_parent', id)}
        onRefreshData={refresh}
      />

      <Typography variant="caption" display="block" gutterBottom>
        Select the direct parent taxon under which the name was **originally** described (if different).
      </Typography>

      <ScientificNameSelector
        label="Original Parent"
        scientificNameData={scientificNameData}
        onChange={id => handleChange('original_parent', id)}
        onRefreshData={refresh}
      />

    </Box>
  );
};

export default SectionTaxonomy;