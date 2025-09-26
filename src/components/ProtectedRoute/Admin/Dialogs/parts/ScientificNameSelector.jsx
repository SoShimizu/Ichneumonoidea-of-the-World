// src/components/ProtectedRoute/Admin/Dialogs/parts/ScientificNameSelector.jsx
import React, { useState, useCallback } from "react";
import { Autocomplete, TextField, Stack, Button, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DialogScientificNameAdd from "../DialogScientificNameAdd/DialogScientificNameAdd";

export default function ScientificNameSelector({
  label = "Scientific Name",
  scientificNameData,     // useFetchScientificNames() から渡す配列
  onChange,               // 選択変更通知
  isRequired = false,     // 必須フラグ
  onRefreshData,          // 追加後にデータ再取得したい場合に渡す fetchNames 関数
}) {
  const [selectedId, setSelectedId] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // +Add ダイアログ開閉
  const openAddModal  = () => setIsAddOpen(true);
  const closeAddModal = async (didAdd) => {
    setIsAddOpen(false);
    // 追加成功なら parent の refresh を呼び出し
    if (didAdd && typeof onRefreshData === "function") {
      await onRefreshData();
    }
  };

  // TextField に表示する文字列
  const formatLabelString = useCallback(
    opt => {
      const parent = scientificNameData.find(p => p.id === opt.current_parent);
      const parentName = parent?.name_spell_valid || opt.current_parent || "";
      return `${opt.current_rank}: ${parentName} ${opt.name_spell_valid} (${opt.id})`;
    },
    [scientificNameData]
  );

  // ドロップダウンの JSX
  const renderOptionLabel = useCallback(
    opt => {
      const parent = scientificNameData.find(p => p.id === opt.current_parent);
      const parentName = parent?.name_spell_valid || opt.current_parent || "";
      return (
        <>
          {opt.current_rank}: {parentName}&nbsp;
          <strong>{opt.name_spell_valid}</strong>&nbsp;({opt.id})
        </>
      );
    },
    [scientificNameData]
  );

  return (
    <>
      <Autocomplete
        options={scientificNameData}
        getOptionLabel={formatLabelString}
        renderOption={(props, option) => (
          <li {...props}>
            <Box
              component="span"
              sx={{
                display: "block",
                whiteSpace: "nowrap",     // 折り返し禁止
                overflow: "hidden",       // はみ出し隠す
                textOverflow: "ellipsis", // 末尾…で省略
                maxWidth: "100%",
              }}
            >
              {renderOptionLabel(option)}
            </Box>
          </li>
        )}
        ListboxProps={{ sx: { maxHeight: 300, overflowY: "auto" } }}
        value={scientificNameData.find(n => n.id === selectedId) || null}
        onChange={(e, val) => {
          const id = val?.id || "";
          setSelectedId(id);
          if (onChange) onChange(id);
        }}
        renderInput={params => (
          <TextField
            {...params}
            label={isRequired ? `${label} (Required)` : `${label} (Optional)`}
            required={isRequired}
            error={isRequired && !selectedId}
            helperText={isRequired && !selectedId ? "This field is required." : ""}
            fullWidth
            margin="dense"
          />
        )}
      />

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={openAddModal}>
          + Add Name
        </Button>
      </Stack>

      {isAddOpen && (
        <DialogScientificNameAdd
          open
          onClose={didAdd => closeAddModal(didAdd)}
        />
      )}
    </>
  );
}
