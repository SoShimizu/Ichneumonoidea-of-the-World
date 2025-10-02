import React from "react";
import {
  Box,
  TextField,
  Chip,
  FormControl,
  FormLabel,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ReactSortable } from "react-sortablejs";
// 新しく作成したResearcherSelectorをインポート
import ResearcherSelector from "../../parts/ResearcherSelector";
import supabase from "../../../../../../utils/supabase";

const SectionAuthority = ({
  form,
  handleChange,
  errors,
  selectedAuthors,
  setSelectedAuthors,
  handleAuthorRemove,
  yearOptions,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
        Authority
      </Typography>

      {/* ▼▼▼ AutocompleteをResearcherSelectorに置き換え ▼▼▼ */}
      <ResearcherSelector
        // `value`は常に単一選択なのでnullを渡す
        value={null}
        // 選択されたら、`selectedAuthors`のリストに追加する
        onChange={(selectedId) => {
          if (selectedId && !selectedAuthors.find((x) => x.id === selectedId)) {
            // IDだけでは表示できないので、supabaseから完全なオブジェクトを取得する
            const fetchAuthor = async () => {
              const { data } = await supabase.from('researchers').select('*').eq('id', selectedId).single();
              if (data) {
                setSelectedAuthors((prev) => [...prev, data]);
              }
            };
            fetchAuthor();
          }
        }}
        label="Search and Add Authority"
      />
      {/* ▲▲▲ 置き換え完了 ▲▲▲ */}


      <FormControl
        component="fieldset"
        margin="dense"
        fullWidth
        required
        error={Boolean(errors.authority)}
        sx={{
          border: 1,
          borderColor: errors.authority ? "error.main" : "divider",
          borderRadius: 1,
          p: 1,
          minHeight: 56,
          mt: 2 // マージン調整
        }}
      >
        <FormLabel component="legend" sx={{ fontSize: "0.8rem", mb: selectedAuthors.length ? 1 : 0 }}>
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
              // `last_name_eng` を `last_name` に変更
              label={`${i + 1}. ${a.last_name}, ${a.first_name}`}
              onDelete={() => handleAuthorRemove(a.id)}
              sx={{ m: 0.5, cursor: "grab" }}
              deleteIcon={<CloseIcon />}
            />
          ))}
        </ReactSortable>
      </FormControl>

      {/* 年号の入力部分は変更なし */}
      <TextField
          label="Authority Year (Required)"
          margin="dense"
          fullWidth
          required
          type="text"
          value={form.authority_year || ''}
          onChange={(e) => {
            if (/^\d{0,4}$/.test(e.target.value)) {
              handleChange("authority_year", e.target.value);
            }
          }}
          inputProps={{ maxLength: 4 }}
          error={Boolean(errors.authorityYear)}
          helperText={errors.authorityYear ? "Authority Year (4 digits) is required." : ""}
          sx={{ mt: 1 }}
      />
    </Box>
  );
};

export default SectionAuthority;