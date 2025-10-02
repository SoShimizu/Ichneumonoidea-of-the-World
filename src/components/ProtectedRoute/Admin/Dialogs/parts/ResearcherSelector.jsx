import React, { useState, useEffect, useCallback } from 'react';
import { Autocomplete, TextField, CircularProgress, createFilterOptions, Button, Stack } from '@mui/material';
import supabase from '../../../../../utils/supabase';
import { useDebounce } from 'use-debounce';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DialogResearcher from '../DialogResearcher'; // 編集/追加ダイアログを再利用

// ▼▼▼ `filter` を正しく使用するために、ここで定義します ▼▼▼
const filter = createFilterOptions();

const ResearcherSelector = ({ value, onChange, error, helperText, label = "Search or Add Researcher..." }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue] = useDebounce(inputValue, 500);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);

  const searchResearchers = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setOptions(selectedValue ? [selectedValue] : []);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc('search_researchers', { search_term: searchTerm });
    if (selectedValue && data && !data.some(option => option.id === selectedValue.id)) {
      setOptions([selectedValue, ...data]);
    } else {
      setOptions(data || []);
    }
    setLoading(false);
  }, [selectedValue]);

  useEffect(() => {
    searchResearchers(debouncedInputValue);
  }, [debouncedInputValue, searchResearchers]);

  useEffect(() => {
    if (!value) {
      setSelectedValue(null);
      return;
    }
    if (selectedValue && selectedValue.id === value) {
      return;
    }
    const fetchSelected = async () => {
      setLoading(true);
      const { data } = await supabase.from('researchers').select('*').eq('id', value).single();
      if (data) {
        setSelectedValue(data);
      }
      setLoading(false);
    };
    fetchSelected();
  }, [value, selectedValue]);

  const handleDialogClose = (shouldRefresh) => {
    setDialogOpen(false);
    if (shouldRefresh) {
      searchResearchers(inputValue);
    }
  };

  return (
    <>
      <Autocomplete
        value={selectedValue}
        onChange={(event, newValue) => {
          // ▼▼▼ 新規追加オプションが選択された場合の処理を追加 ▼▼▼
          if (newValue && newValue.inputValue) {
            setDialogOpen(true);
          } else {
            onChange(newValue ? newValue.id : null);
          }
        }}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        // ▼▼▼ `filterOptions` プロパティを追加して `filter` を使用 ▼▼▼
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          // 検索語があり、完全一致する候補がない場合に「新規追加」オプションを追加
          if (params.inputValue !== '' && !loading && !options.some((option) => `${option.last_name}, ${option.first_name}` === params.inputValue)) {
            filtered.push({
              inputValue: params.inputValue,
              last_name: `Add new: "${params.inputValue}"`,
              first_name: ''
            });
          }
          return filtered;
        }}
        options={options}
        getOptionLabel={(option) => option ? `${option.last_name}, ${option.first_name}` : ''}
        isOptionEqualToValue={(option, val) => option && val && option.id === val.id}
        loading={loading}
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant="outlined"
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Stack direction="row" justifyContent="flex-end" mt={1}>
        <Button
          size="small"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setDialogOpen(true)}
        >
          + Add/Edit Researcher Master
        </Button>
      </Stack>
      {dialogOpen && (
        <DialogResearcher
          open={dialogOpen}
          onClose={handleDialogClose}
          researcherId={null}
        />
      )}
    </>
  );
};

export default ResearcherSelector;