// src/components/ProtectedRoute/Admin/Dialogs/parts/ScientificNameSelector.jsx
import React, { useState, useCallback, useEffect } from "react";
import { Autocomplete, TextField, Stack, Button, Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DialogScientificNameAdd from "../DialogScientificNameAdd";

/**
 * 幅いっぱい＆縦配置対応の学名セレクタ
 */
export default function ScientificNameSelector({
  scientificNameData = [],
  onChange,
  onRefreshData,
  valueId = "",
  isRequired = false,
  disabled = false,

  // UI
  label = "Scientific Name",
  placeholder = "Search by name / id",
  size = "small",
  showInputLabel = false, // true: TextFieldのlabelとして表示
  inlineAdd = true,       // ラベル行右に「Add Name」を表示
  fullWidth = true,       // 幅いっぱいに広げる
  sx = {},                // 追加スタイル（rootに適用）
}) {
  const [selectedId, setSelectedId] = useState(valueId || "");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    setSelectedId(valueId || "");
  }, [valueId]);

  const openAddModal  = () => setIsAddOpen(true);
  const closeAddModal = async (didAdd) => {
    setIsAddOpen(false);
    if (didAdd && typeof onRefreshData === "function") await onRefreshData();
  };

  const getLabelString = useCallback(
    (opt) => {
      if (!opt) return "";
      const parent = scientificNameData.find((p) => p.id === opt.current_parent);
      const parentName = parent?.name_spell_valid || opt.current_parent || "";
      return `${opt.current_rank}: ${parentName} ${opt.name_spell_valid} (${opt.id})`;
    },
    [scientificNameData]
  );

  const renderOptionRow = useCallback(
    (opt) => {
      const parent = scientificNameData.find((p) => p.id === opt.current_parent);
      const parentName = parent?.name_spell_valid || opt.current_parent || "";
      return (
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {opt.current_rank}: {parentName}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {opt.name_spell_valid}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>({opt.id})</Typography>
        </Box>
      );
    },
    [scientificNameData]
  );

  const valueObj = scientificNameData.find((n) => n.id === selectedId) || null;

  return (
    <Box sx={{ width: 1, display: "block", ...sx }}>
      {/* ラベル行（右に Add Name） */}
      {inlineAdd || !showInputLabel ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2">
            {label}{isRequired ? " *" : ""}
          </Typography>
          <Button size="small" onClick={openAddModal} startIcon={<AddIcon />} sx={{ minWidth: 0, px: 1 }}>
            {/* 先頭の「+」は付けない → 重複回避 */}
            Add Name
          </Button>
        </Stack>
      ) : null}

      <Autocomplete
        options={scientificNameData}
        getOptionLabel={getLabelString}
        isOptionEqualToValue={(a, b) => a?.id === b?.id}
        value={valueObj}
        onChange={(e, val) => {
          const id = val?.id || "";
          setSelectedId(id);
          onChange?.(id);
        }}
        size={size}
        disableClearable={!!isRequired}
        disabled={disabled}
        sx={{ width: 1 }}          // ← ルートを強制的に幅100%
        renderOption={(props, option) => {
          // li に余計な属性(button等)が入って警告になるのを防ぐ
          const { key, button, ...liProps } = props;
          return (
            <li {...liProps} key={key}>
              {renderOptionRow(option)}
            </li>
          );
        }}
        ListboxProps={{ sx: { maxHeight: 320, overflowY: "auto" } }}
        renderInput={(params) => (
          <TextField
            {...params}
            size={size}
            placeholder={!showInputLabel ? placeholder : undefined}
            label={showInputLabel ? (isRequired ? `${label} *` : label) : undefined}
            required={!!isRequired}
            error={!!(isRequired && !selectedId)}
            helperText={isRequired && !selectedId ? "This field is required." : ""}
            fullWidth
            margin="dense"
          />
        )}
      />

      {!inlineAdd && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.75 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={openAddModal}>
            Add Name
          </Button>
        </Stack>
      )}

      {isAddOpen && (
        <DialogScientificNameAdd open onClose={(didAdd) => closeAddModal(didAdd)} />
      )}
    </Box>
  );
}
