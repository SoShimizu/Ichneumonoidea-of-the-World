// src/components/ProtectedRoute/Admin/Dialogs/parts/PublicationSelector.jsx
"use client";

import React, { useState } from "react";
import { Autocomplete, TextField, Stack, Button, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DialogPublicationAdd from "../DialogPublicationAdd";

export default function PublicationSelector({
  label = "Publication",
  publicationsData,    // Array<{ id, title_english, publication_date, ... }>
  renderOptionLabel,   // option → string or JSX
  onChange,            // (selectedId: string) => void
  isRequired = false,
  onRefreshData,       // () => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const openAddModal  = () => setIsAddOpen(true);
  const closeAddModal = async (didAdd) => {
    setIsAddOpen(false);
    if (didAdd && onRefreshData) {
      await onRefreshData();
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Autocomplete
          options={publicationsData}
          getOptionLabel={renderOptionLabel}
          value={publicationsData.find(p => p.id === selectedId) || null}
          onChange={(_, val) => {
            const id = val?.id || "";
            setSelectedId(id);
            onChange?.(id);
          }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderOption={(props, option) => (
            <li {...props}>
              <Box
                component="span"
                sx={{
                  display: "block",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {renderOptionLabel(option)}
              </Box>
            </li>
          )}
          renderInput={params => (
            <TextField
              {...params}
              label={isRequired ? `${label} (Required)` : `${label} (Optional)`}
              required={isRequired}
              margin="dense"
              fullWidth
              multiline
              //maxRows={3}
              sx={{
                "& .MuiInputBase-input": {
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflow: "visible",
                }
              }}
            />
          )}
          sx={{ flexGrow: 1 }}
        />

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={openAddModal}
          sx={{ mt: "15px" }}
        >
          + Add
        </Button>
      </Stack>

      {isAddOpen && (
        <DialogPublicationAdd
          open
          onClose={didAdd => closeAddModal(didAdd)}
        />
      )}
    </>
  );
}
