// src/components/ScientificNameDialog/Sections/RelationshipSection.jsx
import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
} from '@mui/material';

const SectionRelationship  = ({
  form,
  handleChange,
  errors,
  names,
  validNameRadio,
  handleValidNameRadio,
  typeTaxaRadio,
  handleTypeTaxaRadio,
}) => {
  const currentIdTrimmed = form.id?.trim() || '...';

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Relationships & Status
      </Typography>

      {/* Valid Name Relationship */}
      <FormControl component="fieldset" margin="dense" fullWidth>
        <FormLabel component="legend">Is this the Valid Name?</FormLabel>
        <RadioGroup
          row
          name="validNameRadio"
          value={validNameRadio}
          onChange={handleValidNameRadio}
        >
          <FormControlLabel
            value="own"
            control={<Radio />}
            label={`Yes (Uses current ID: ${currentIdTrimmed})`}
            disabled={!form.id?.trim()}
          />
          <FormControlLabel
            value="other"
            control={<Radio />}
            label="No, specify other Valid Name ID below"
          />
        </RadioGroup>
      </FormControl>

      <Autocomplete
        options={names.filter(n => n !== form.id?.trim())} // Exclude self from options
        value={names.find((n) => n === form.valid_name_id) || null}
        onChange={(e, v) => handleChange('valid_name_id', v || null)}
        disabled={validNameRadio !== 'other'}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Valid Name ID (Required if 'No' selected)"
            margin="dense"
            fullWidth
            required={validNameRadio === 'other'}
            error={errors.validNameId} // Use error flag
            helperText={errors.validNameId ? 'Valid Name ID must be selected when "No" is chosen.' : ''}
          />
        )}
        sx={{ mb: 2 }}
      />

      {/* Type Taxa Relationship */}
      <FormControl component="fieldset" margin="dense" fullWidth>
        <FormLabel component="legend">
          Type Designation (For genus-group names and above)
        </FormLabel>
        <RadioGroup
          row
          name="typeTaxaRadio"
          value={typeTaxaRadio}
          onChange={handleTypeTaxaRadio}
        >
          <FormControlLabel
            value="own"
            control={<Radio />}
            label={`This name itself is the type (ID: ${currentIdTrimmed})`}
            disabled={!form.id?.trim()}
          />
          <FormControlLabel
            value="other"
            control={<Radio />}
            label="The type is a different name (specify ID below)"
          />
        </RadioGroup>
      </FormControl>

      <Autocomplete
        options={names.filter(n => n !== form.id?.trim())} // Exclude self from options
        value={names.find((n) => n === form.type_taxa_id) || null}
        onChange={(e, v) => handleChange('type_taxa_id', v || null)}
        disabled={typeTaxaRadio !== 'other'}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Type Taxon ID (Required if 'Different name' selected)"
            margin="dense"
            fullWidth
            required={typeTaxaRadio === 'other'}
            error={errors.typeTaxaId} // Use error flag
            helperText={errors.typeTaxaId ? 'Type Taxon ID must be selected when "Different name" is chosen.' : ''}
          />
        )}
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

export default SectionRelationship;