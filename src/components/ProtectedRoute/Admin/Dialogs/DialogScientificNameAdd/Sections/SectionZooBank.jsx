// src/components/ScientificNameDialog/Sections/ZooBankSection.jsx
import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

const SectionZooBank = ({ form, handleChange, errors }) => {
  return (
    <Box>
        <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            ZooBank URL
        </Typography>
        <TextField
            label="ZooBank URL"
            value={form.zoobank_url || ""} // Ensure value is controlled, not null/undefined
            onChange={e => handleChange("zoobank_url", e.target.value)}
            fullWidth
            margin="dense"
            placeholder="https://zoobank.org/..."
            error={errors.zoobankUrl}
            helperText={errors.zoobankUrl ? "Invalid ZooBank URL format (must start with http:// or https:// and contain zoobank.org)" : "Optional"}
        />
    </Box>
  );
};

export default SectionZooBank;