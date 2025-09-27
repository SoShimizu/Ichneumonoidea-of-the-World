import React, { useState, useEffect, useCallback } from 'react';
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
  
  const [selectedValue, setSelectedValue] = useState(null);

  const searchRepositories = useCallback(async (searchTerm) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('search_repositories', { search_term: searchTerm });
    if (error) {
      console.error('Error searching repositories:', error);
      setOptions([]);
    } else {
      setOptions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    searchRepositories(debouncedInputValue);
  }, [debouncedInputValue, searchRepositories]);

  useEffect(() => {
    if (!value) {
      setSelectedValue(null);
      return;
    }
    if (selectedValue && (selectedValue.uuid === value || selectedValue.parent_uuid === value)) {
      return;
    }
    const fetchSelectedRepo = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('Repositories')
        .select(`*, parent:parent_id(uuid, acronym, name_en)`)
        .eq('uuid', value)
        .single();
      
      if (data) {
        const repoObject = {
          ...data,
          is_synonym: data.uuid !== data.parent_id,
          parent_uuid: data.parent?.uuid || data.uuid,
          parent_acronym: data.parent?.acronym || data.acronym,
          parent_name_en: data.parent?.name_en || data.name_en,
        };
        setSelectedValue(repoObject);
      }
      setLoading(false);
    };
    fetchSelectedRepo();
  }, [value, selectedValue]);

  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    if (option.inputValue) return `Add new: "${option.inputValue}"`;
    if (option.is_synonym) return `${option.acronym} — ${option.name_en} (Synonym of ${option.parent_acronym})`;
    return `${option.acronym} — ${option.name_en}`;
  };

  const handleDialogClose = (shouldRefresh, newRepo) => {
    setDialogOpen(false);
    if (shouldRefresh && newRepo) {
      const parentRepo = newRepo.parent || newRepo;
      const newRepoObject = {
        ...newRepo,
        is_synonym: newRepo.uuid !== newRepo.parent_id,
        parent_uuid: parentRepo.uuid,
        parent_acronym: parentRepo.acronym,
        parent_name_en: parentRepo.name_en,
      };
      onChange(newRepoObject.parent_uuid);
      setSelectedValue(newRepoObject);
    }
  };

  return (
    <>
      <Autocomplete
        value={selectedValue}
        onChange={(event, newValue) => {
          if (typeof newValue === 'string') {
            //
          } else if (newValue && newValue.inputValue) {
            setDialogOpen(true);
            setDialogValue(newValue.inputValue);
          } else {
            onChange(newValue ? newValue.parent_uuid : null);
            setSelectedValue(newValue);
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
              filtered.push({ inputValue: params.inputValue });
            }
          }
          return filtered;
        }}
        options={options}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, val) => option && val && option.uuid === val.uuid}
        loading={loading}
        filterSelectedOptions
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        renderOption={(props, option) => (
          <li {...props} key={option.uuid || option.inputValue}>
            {option.inputValue ? (
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