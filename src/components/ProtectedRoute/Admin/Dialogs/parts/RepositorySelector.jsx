import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Typography, Box, createFilterOptions } from '@mui/material';
import supabase from '../../../../../utils/supabase';
import { useDebounce } from 'use-debounce';
import DialogRepository from '../DialogRepository';

const filter = createFilterOptions();

const RepositorySelector = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue] = useDebounce(inputValue, 500);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState('');

  const searchRepositories = async (searchTerm) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('search_repositories', {
      search_term: searchTerm,
    });
    if (error) {
      console.error('Error searching repositories:', error);
      setOptions([]);
    } else {
      setOptions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    searchRepositories(debouncedInputValue);
  }, [debouncedInputValue]);

  const getOptionLabel = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    // ★★★ 修正箇所 1: 英語に翻訳 ★★★
    if (option.inputValue) {
      return `Add new: "${option.inputValue}"`;
    }
    if (option.is_synonym) {
      return `${option.acronym} — ${option.name_en} (Synonym of ${option.parent_acronym})`;
    }
    return `${option.acronym} — ${option.name_en}`;
  };

  const handleDialogClose = (shouldRefresh) => {
    setDialogOpen(false);
    if (shouldRefresh) {
      searchRepositories(dialogValue);
    }
  };

  return (
    <>
      <Autocomplete
        value={options.find(opt => opt.parent_uuid === value) || options.find(opt => opt.uuid === value && !opt.is_synonym) || null}
        
        onChange={(event, newValue) => {
          if (typeof newValue === 'string') {
            // "Add new" option might be selected as a string if not careful
          } else if (newValue && newValue.inputValue) {
            setDialogOpen(true);
            setDialogValue(newValue.inputValue);
          } else {
            onChange(newValue ? newValue.parent_uuid : null);
          }
        }}

        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}

        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          if (params.inputValue !== '' && !loading) {
            const isExisting = options.some((option) => getOptionLabel(option).toLowerCase() === params.inputValue.toLowerCase());
            if (!isExisting) {
              filtered.push({
                inputValue: params.inputValue,
              });
            }
          }
          return filtered;
        }}

        options={options}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, val) => option.uuid === val.uuid}
        loading={loading}
        filterSelectedOptions
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys

        renderOption={(props, option) => (
          <li {...props} key={option.uuid || option.inputValue}>
            {option.inputValue ? (
              // ★★★ 修正箇所 2: 英語に翻訳 ★★★
              <Typography sx={{fontStyle: 'italic'}}>Add new: "{option.inputValue}"</Typography>
            ) : (
              <Box>
                <Typography variant="body1">
                  {option.acronym} {option.taxapad_code ? `(${option.taxapad_code})` : ''} — {option.name_en}
                </Typography>
                {option.is_synonym && (
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    → Valid: {option.parent_acronym} — {option.parent_name_en}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary">
                  {option.city ? `${option.city}, ` : ''}{option.country}
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

      {dialogOpen && (
          <DialogRepository 
            open={dialogOpen} 
            onClose={handleDialogClose} 
            initialValue={dialogValue}
          />
      )}
    </>
  );
};

export default RepositorySelector;