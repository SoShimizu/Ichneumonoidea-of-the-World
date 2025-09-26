// src/components/ScientificNameDialog/Sections/AuthoritySection.jsx (修正版)
import React from "react";
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Stack,
  Button,
  FormControl,
  FormLabel,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { ReactSortable } from "react-sortablejs";

const SectionAuthority = ({
  form,
  handleChange,
  errors,
  allAuthors,
  selectedAuthors,
  setSelectedAuthors,
  authorInputValue,
  setAuthorInputValue,
  handleAuthorRemove,
  onShowAddAuthor,
  yearOptions,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
        Authority
      </Typography>

      {/* Author Search Autocomplete (変更なし) */}
      <Autocomplete
        options={allAuthors.sort((a, b) =>
          a.last_name_eng.localeCompare(b.last_name_eng)
        )}
        getOptionLabel={(a) => (a ? `${a.last_name_eng}, ${a.first_name_eng}` : '')} // Handle potential null/undefined option
        inputValue={authorInputValue}
        onInputChange={(e, val) => setAuthorInputValue(val)}
        onChange={(e, val) => {
          if (val && !selectedAuthors.find((x) => x.id === val.id)) {
            setSelectedAuthors((prev) => [...prev, val]);
            setAuthorInputValue(""); // Clear input after selection
          }
        }}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
        renderInput={(params) => (
          <TextField {...params} label="Search and Add Authority" margin="dense" />
        )}
        sx={{ mb: 1 }}
      />

      {/* Selected Authors Display (変更なし) */}
      <FormControl
        component="fieldset"
        margin="dense"
        fullWidth
        required // Indicate visually that selection is needed
        error={Boolean(errors.authority)} // Ensure boolean
        sx={{
          border: 1,
          borderColor: errors.authority ? "error.main" : "divider",
          borderRadius: 1,
          p: 1,
          minHeight: 56,
        }}
      >
        <FormLabel
          component="legend"
          sx={{ fontSize: "0.8rem", mb: selectedAuthors.length ? 1 : 0 }}
        >
          Selected Authorities (Required, Drag to reorder)
        </FormLabel>

        {selectedAuthors.length === 0 && (
          <Typography variant="body2" color={errors.authority ? "error" : "textSecondary"} sx={{ ml: 1 }}>
            At least one author must be selected.
          </Typography>
        )}

        <ReactSortable list={selectedAuthors} setList={setSelectedAuthors}>
          {selectedAuthors.map((a, i) => (
            <Chip
              key={a.id}
              label={`${i + 1}. ${a.last_name_eng}, ${a.first_name_eng}`}
              onDelete={() => handleAuthorRemove(a.id)}
              sx={{ m: 0.5, cursor: "grab" }}
              deleteIcon={<CloseIcon />}
            />
          ))}
        </ReactSortable>
      </FormControl>

      {/* Add Author Button (変更なし) */}
      <Stack direction="row" justifyContent="flex-end" mt={1}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={onShowAddAuthor}
        >
          + Add/Edit Author Master
        </Button>
      </Stack>

      {/* Authority Year Autocomplete (修正箇所あり) */}
      <Autocomplete
        options={yearOptions}
        value={form.authority_year || null}
        onChange={(e, v) => handleChange("authority_year", v || null)}
        inputValue={form.authority_year || ""}
        onInputChange={(e, newValue) => {
          // 数字4桁まで、または空文字のみ許可
          if (/^\d{0,4}$/.test(newValue)) {
            handleChange("authority_year", newValue);
          }
        }}
        freeSolo
        renderInput={(params) => (
          <TextField
            {...params} // <-- params を先に展開
            label="Authority Year (Required)"
            margin="dense"
            fullWidth
            required
            type="text"
            inputProps={{
              ...params.inputProps,
              maxLength: 4,
            }}
            error={Boolean(errors.authorityYear)}
            helperText={errors.authorityYear ? "Authority Year (4 digits) is required." : ""} 
          />
        )}
        sx={{ mb: 1, mt: 1 }}
      />
    </Box>
  );
};

export default SectionAuthority;