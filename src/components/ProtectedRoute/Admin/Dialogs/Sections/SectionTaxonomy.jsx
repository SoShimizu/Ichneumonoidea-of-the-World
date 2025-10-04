// src/components/ProtectedRoute/Admin/Dialogs/Sections/SectionTaxonomy.jsx
import React from "react";
import { Box, Typography, Autocomplete, TextField } from "@mui/material";
import ScientificNameSelector from "../parts/ScientificNameSelector";

export default function SectionTaxonomy({
  form,
  handleChange,
  errors = {},
  ranks = [],
  scientificNameData = [],
  refresh,
}) {
  const rankHelpIfErr = (isErr) => (isErr ? "This field is required." : "");

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Taxonomy
      </Typography>

      {/* Rank：モバイル1列/SM以上2列。AutocompleteはfullWidth */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          mb: 2,
        }}
      >
        <Autocomplete
          freeSolo
          options={ranks}
          value={form.current_rank || ""}
          onChange={(_, v) => handleChange("current_rank", v || null)}
          onInputChange={(_, v, reason) => {
            if (reason === "input") handleChange("current_rank", v || null);
          }}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label="Current Rank *"
              required
              error={!!errors.currentRank}
              helperText={rankHelpIfErr(!!errors.currentRank)}
            />
          )}
        />

        <Autocomplete
          freeSolo
          options={ranks}
          value={form.original_rank || ""}
          onChange={(_, v) => handleChange("original_rank", v || null)}
          onInputChange={(_, v, reason) => {
            if (reason === "input") handleChange("original_rank", v || null);
          }}
          fullWidth
          renderInput={(params) => (
            <TextField {...params} fullWidth label="Original Rank" />
          )}
        />
      </Box>

      {/* Parent（縦並び・全幅） */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Current Parent *
        </Typography>
        <ScientificNameSelector
          key={`cur-${form.id}-${form.current_parent ?? "null"}`} // 編集切替時に確実に反映
          label="Search by name / id"
          isRequired
          // ★ 編集時に消えないよう、現在値を明示的に渡す（想定されうるprop名をすべてケア）
          value={form.current_parent || null}
          selectedId={form.current_parent || null}
          valueId={form.current_parent || null}
          initialValueId={form.current_parent || null}
          scientificNameData={scientificNameData}
          onChange={(id) => handleChange("current_parent", id || null)}
          onRefreshData={refresh}
        />
        {errors.current_parent ? (
          <Typography
            variant="caption"
            color="error"
            sx={{ mt: 0.5, display: "block" }}
          >
            This field is required.
          </Typography>
        ) : null}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Original Parent
        </Typography>
        <ScientificNameSelector
          key={`org-${form.id}-${form.original_parent ?? "null"}`}
          label="Search by name / id"
          value={form.original_parent || null}
          selectedId={form.original_parent || null}
          valueId={form.original_parent || null}
          initialValueId={form.original_parent || null}
          scientificNameData={scientificNameData}
          onChange={(id) => handleChange("original_parent", id || null)}
          onRefreshData={refresh}
        />
      </Box>
    </Box>
  );
}
