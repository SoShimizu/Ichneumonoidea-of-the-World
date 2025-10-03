import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Typography,
  Box,
  createFilterOptions,
} from '@mui/material';
import supabase from '../../../../../utils/supabase';
import { useDebounce } from 'use-debounce';
import DialogRepository from '../DialogRepository';

const filter = createFilterOptions();

// 1件を表示用の形に正規化
const normalizeRepo = (repo) => {
  if (!repo) return null;
  const parent = repo.parent || repo;
  return {
    ...repo,
    is_synonym: repo.uuid !== repo.parent_id,
    parent_uuid: parent?.uuid ?? repo.uuid,
    parent_acronym: parent?.acronym ?? repo.acronym ?? '',
    parent_name_en: parent?.name_en ?? repo.name_en ?? '',
  };
};

// ラベル
const getOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  if (option.inputValue) return `Add new: "${option.inputValue}"`;
  const ac = option.acronym ? `${option.acronym} — ` : '';
  if (option.is_synonym) {
    return `${ac}${option.name_en} (Synonym of ${option.parent_acronym})`;
  }
  return `${ac}${option.name_en ?? ''}`;
};

export default function RepositorySelector({
  // ここは「オブジェクトをそのまま」受け取る
  value,                // null | { uuid, ... }
  // ここも「オブジェクトをそのまま」返す
  onChange,             // (repoObj|null) => void
  error,
  helperText,
  disabled,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInput] = useDebounce(inputValue, 400);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState('');

  // value は常にオブジェクトで保持
  const selected = useMemo(() => (value ? normalizeRepo(value) : null), [value]);

  // 検索
  const search = useCallback(
    async (term) => {
      if (!term || term.trim().length < 2) {
        // 入力が短い間は選択値だけを options に入れておけば選択維持される
        setOptions(selected ? [selected] : []);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc('search_repositories', {
        search_term: term.trim(),
      });
      const list = (data || []).map(normalizeRepo);
      // 選択値が options に無ければ先頭に追加して選択維持
      if (selected && !list.some((r) => r.uuid === selected.uuid)) {
        list.unshift(selected);
      }
      setOptions(list);
      setLoading(false);
      if (error) {
        // 失敗しても UX を崩さない
        console.warn('[RepositorySelector] search_repositories error:', error);
      }
    },
    [selected]
  );

  useEffect(() => {
    search(debouncedInput);
  }, [debouncedInput, search]);

  // 編集時など「value が options にいない」ケースに対応
  useEffect(() => {
    if (selected && !options.some((o) => o.uuid === selected.uuid)) {
      setOptions((prev) => [selected, ...prev]);
    }
  }, [selected, options]);

  const handleCloseDialog = (shouldRefresh, newRepo) => {
    setDialogOpen(false);
    if (shouldRefresh && newRepo) {
      // ダイアログから返ってきた新規レコードを正規化してそのまま返す
      const normalized = normalizeRepo(newRepo);
      setOptions((prev) => [normalized, ...prev]);
      onChange?.(normalized);
    }
  };

  return (
    <>
      <Autocomplete
        value={selected}
        onChange={(_, newValue) => {
          if (newValue && newValue.inputValue) {
            setDialogOpen(true);
            setDialogValue(newValue.inputValue);
            return;
          }
          // newValue は option オブジェクト。null なら null を返す
          onChange?.(newValue ? normalizeRepo(newValue) : null);
        }}
        onInputChange={(_, v) => setInputValue(v)}
        options={options}
        getOptionLabel={getOptionLabel}
        // uuid で同一性を判定（参照が変わっても選択維持）
        isOptionEqualToValue={(opt, val) => (opt?.uuid || '') === (val?.uuid || '')}
        filterOptions={(opts, params) => {
          const filtered = filter(opts, params);
          const labelMatch = (o) =>
            getOptionLabel(o).toLowerCase() === params.inputValue.toLowerCase();
          if (
            params.inputValue !== '' &&
            !loading &&
            !opts.some(labelMatch)
          ) {
            filtered.push({ inputValue: params.inputValue });
          }
          return filtered;
        }}
        loading={loading}
        fullWidth
        renderOption={(props, option) => (
          <li {...props} key={option.uuid || option.inputValue}>
            {option.inputValue ? (
              <Typography sx={{ fontStyle: 'italic' }}>
                Add new: "{option.inputValue}"
              </Typography>
            ) : (
              <Box>
                <Typography variant="body1">
                  {option.acronym ? `${option.acronym} — ` : ''}
                  {option.name_en}
                </Typography>
                {option.is_synonym && (
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    → Valid: {option.parent_acronym} — {option.parent_name_en}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary">
                  {option.city ? `${option.city}, ` : ''}
                  {option.country || ''}
                </Typography>
              </Box>
            )}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search or Add Repository..."
            variant="outlined"
            error={error}
            helperText={helperText}
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            disabled={disabled}
          />
        )}
      />

      {dialogOpen && (
        <DialogRepository
          open={dialogOpen}
          onClose={handleCloseDialog}
          initialValue={dialogValue}
        />
      )}
    </>
  );
}
