// src/components/ScientificNameDialog/Sections/SectionTypeSpecimen.jsx (修正版)
import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  Stack,
  MenuItem,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // アイコンを使用する場合

const TypeSpecimenSection = ({
  form,
  handleChange,
  errors,
  typeCategories,
  onShowAddTypeCategory,
  countriesList,
  RanksNoLocalityConst,
  repositories,
  onShowRepoDialog,
  combinedNames,
  imgRows,
  handleImgRowChange,
  addImgRow,
  removeImgRow,
  urlRegex, // 親から渡される正規表現
}) => {
  // タイプ産地が無効になるランクかどうかを判定
  const isLocalityDisabled =
    form.current_rank &&
    RanksNoLocalityConst.includes(form.current_rank.toLowerCase());

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'teal' }}>
        Type Specimen Information (Primarily for species-group names)
      </Typography>

      {/* Type Category */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
        <Autocomplete
          sx={{ flexGrow: 1 }}
          options={typeCategories.map((t) => t.id).sort()}
          value={form.type_category || ''}
          onChange={(e, v) => handleChange('type_category', v || '')}
          isOptionEqualToValue={(option, value) => option === value} // Simple comparison for strings
          renderInput={(params) => (
            <TextField
              {...params} // params を正しく展開
              label="Type Category (e.g., Holotype, Lectotype)"
              margin="dense"
              fullWidth
            />
          )}
        />
        <Button
          size="small"
          startIcon={<AddIcon />} // アイコンが必要な場合
          onClick={onShowAddTypeCategory}
          sx={{ mt: '15px' }} // ボタンの位置調整
        >
          + Add
        </Button>
      </Stack>

      {/* Type Sex */}
      <TextField
        select
        label="Type Sex"
        value={form.type_sex || ''}
        onChange={(e) => handleChange('type_sex', e.target.value || null)} // nullを許容する場合
        fullWidth
        margin="dense"
      >
        <MenuItem value="">(Unknown/Not Applicable)</MenuItem>
        <MenuItem value="Male">Male</MenuItem>
        <MenuItem value="Female">Female</MenuItem>
      </TextField>

      {/* Type Locality */}
      <Autocomplete
        options={countriesList.sort((a, b) => a.id.localeCompare(b.id))}
        getOptionLabel={(c) => c?.id || ''}
        value={countriesList.find((c) => c.id === form.type_locality) || null}
        onChange={(e, val) => handleChange('type_locality', val?.id || null)}
        isOptionEqualToValue={(option, value) => option?.id === value?.id}
        disabled={isLocalityDisabled}
        renderInput={(params) => (
          <TextField
            {...params} // params を正しく展開
            label="Type Locality (Country)"
            margin="dense"
            fullWidth
            disabled={isLocalityDisabled} // TextField自体も無効化
            helperText={isLocalityDisabled ? 'Not applicable for this rank' : ''}
          />
        )}
        sx={{ mb: 2, mt: 1 }}
      />

      {/* Type Repository */}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Autocomplete
          sx={{ flexGrow: 1 }}
          options={repositories.sort((a, b) => a.id.localeCompare(b.id))}
          getOptionLabel={(r) => (r ? `${r.id} — ${r.full_name}` : '')}
          value={repositories.find((r) => r.id === form.type_repository) || null}
          onChange={(e, val) => handleChange('type_repository', val?.id || null)}
          isOptionEqualToValue={(option, value) => option?.id === value?.id} // IDで比較
          renderInput={(params) => (
            <TextField
              {...params} // params を正しく展開
              label="Type Repository"
              margin="dense"
              fullWidth
            />
          )}
        />
        <Button
          size="small"
          startIcon={<AddIcon />} // アイコンが必要な場合
          onClick={onShowRepoDialog}
          sx={{ mt: '15px' }} // ボタンの位置調整
        >
          Manage Repositories
        </Button>
      </Stack>

      {/* Type Host */}
      <Autocomplete
        options={combinedNames}
        value={form.type_host || null}
        onChange={(e, v) => handleChange('type_host', v || null)}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params} // params を正しく展開
            label="Type Host (if applicable)"
            margin="dense"
            fullWidth
          />
        )}
        sx={{ mb: 1, mt: 1 }}
      />

      {/* Type Image URLs */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
        Type Image URLs (Optional)
      </Typography>
      {imgRows.map((row, idx) => (
        <Stack direction="row" spacing={1} key={idx} sx={{ mb: 1 }}>
          <TextField
            label={`Image ${idx + 1} Title`}
            value={row.title}
            onChange={(e) => handleImgRowChange(idx, 'title', e.target.value)}
            fullWidth
            size="small"
            // ★★★ 修正点: Boolean() で明示的にキャスト ★★★
            error={ Boolean((row.url.trim() || row.title.trim()) && !row.title.trim()) }
            helperText={
              (row.url.trim() || row.title.trim()) && !row.title.trim()
                ? 'Title required if URL is present'
                : ''
            }
          />
          <TextField
            label={`Image ${idx + 1} URL`}
            value={row.url}
            onChange={(e) => handleImgRowChange(idx, 'url', e.target.value)}
            fullWidth
            size="small"
            // ★★★ 修正点: Boolean() で明示的にキャスト ★★★
            error={ Boolean((row.url.trim() || row.title.trim()) && !urlRegex.test(row.url)) }
            helperText={
              (row.url.trim() || row.title.trim()) && !urlRegex.test(row.url)
                ? 'Valid URL required (http/https)'
                : ''
            }
          />
          <Button
            variant="outlined"
            color="error"
            onClick={() => removeImgRow(idx)}
            // 最後の空行の削除ボタンは無効化
            disabled={imgRows.length === 1 && !row.title.trim() && !row.url.trim()}
            sx={{ minWidth: '40px', height: '40px', alignSelf: 'center' }}
          >
            −
          </Button>
        </Stack>
      ))}

      <Button
        size="small"
        startIcon={<AddIcon />} // アイコンが必要な場合
        onClick={addImgRow}
        sx={{ mb: 2, mt: 1 }}
      >
        + Add Image URL
      </Button>

      {/* グローバルな typeImg エラー表示 (オプション) */}
      {errors.typeImg && (
        <Typography variant="caption" color="error" display="block">
          For rows with content, both Title and a valid URL are required.
        </Typography>
      )}
    </Box>
  );
};

export default TypeSpecimenSection;