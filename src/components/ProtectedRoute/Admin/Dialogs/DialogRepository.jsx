import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete
} from '@mui/material';
import supabase from '../../../../utils/supabase';

const DialogRepository = ({ open, onClose, repository, initialValue = '' }) => {
  const [formData, setFormData] = useState({
    acronym: '',
    name_en: '',
    parent_id: null,
    taxapad_code: '',
    country: '',
    city: ''
  });
  const [allRepositories, setAllRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  // ★★★ 1. 未定義だった `countriesList` の state を追加 ★★★
  const [countriesList, setCountriesList] = useState([]);

  useEffect(() => {
    const fetchAllRepos = async () => {
      const { data } = await supabase.from("Repositories").select('uuid, acronym, name_en');
      if (data) setAllRepositories(data);
    };
    // ★★★ 2. 国名リストを取得する処理を追加 ★★★
    const fetchCountries = async () => {
        const { data } = await supabase.from('countries').select('id');
        if (data) setCountriesList(data.map(c => c.id));
    };

    if (open) {
      fetchAllRepos();
      fetchCountries(); // ダイアログが開くときに国名も取得
      if (repository) {
        setFormData({
          acronym: repository.acronym || '',
          name_en: repository.name_en || '',
          parent_id: repository.parent_id || null,
          taxapad_code: repository.taxapad_code || '',
          country: repository.country || '',
          city: repository.city || '',
        });
      } else {
        setFormData({ 
            acronym: initialValue, 
            name_en: '', 
            parent_id: null, 
            taxapad_code: '', 
            country: '', 
            city: '' 
        });
      }
    }
  }, [repository, open, initialValue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAutocompleteChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    let finalError;
    let finalRepoData = null;

    const saveData = {
        acronym: formData.acronym,
        name_en: formData.name_en,
        parent_id: formData.parent_id,
        taxapad_code: formData.taxapad_code,
        country: formData.country,
        city: formData.city,
    };

    if (repository) { // Edit mode
      const { data, error } = await supabase
        .from('Repositories')
        .update(saveData)
        .eq('uuid', repository.uuid)
        .select(`*, parent:parent_id(*)`)
        .single();
      finalError = error;
      finalRepoData = data;
    } else { // Add mode
      const { data, error } = await supabase
        .from('Repositories')
        .insert([saveData])
        .select()
        .single();
      
      finalError = error;
      if (data && !data.parent_id) {
        const { data: updatedData, error: selfParentError } = await supabase
          .from('Repositories')
          .update({ parent_id: data.uuid })
          .eq('uuid', data.uuid)
          .select(`*, parent:parent_id(*)`)
          .single();
        finalError = selfParentError;
        finalRepoData = updatedData;
      } else if (data) {
        const { data: withParentData, error: parentError } = await supabase
          .from('Repositories')
          .select(`*, parent:parent_id(*)`)
          .eq('uuid', data.uuid)
          .single();
        finalError = parentError;
        finalRepoData = withParentData;
      }
    }

    setLoading(false);
    if (finalError) {
      alert('Error saving repository: ' + finalError.message);
      onClose(false, null);
    } else {
      onClose(true, finalRepoData);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{repository ? 'Edit Repository' : 'Add New Repository'}</DialogTitle>
      <DialogContent>
        <TextField autoFocus margin="dense" name="acronym" label="Acronym (e.g., NIAES, NARO)" type="text" fullWidth variant="outlined" value={formData.acronym} onChange={handleChange} required />
        <TextField margin="dense" name="name_en" label="Official Name (English)" type="text" fullWidth variant="outlined" value={formData.name_en} onChange={handleChange} />
        <TextField margin="dense" name="taxapad_code" label="Taxapad Code" type="text" fullWidth variant="outlined" value={formData.taxapad_code} onChange={handleChange} />
        
        {/* ★★★ 3. `countriesList` を使ってオートコンプリートを表示 ★★★ */}
        <Autocomplete
          options={countriesList.sort()}
          value={formData.country || null}
          onChange={(event, newValue) => {
            handleAutocompleteChange('country', newValue);
          }}
          renderInput={(params) => (
            <TextField {...params} margin="dense" label="Country" fullWidth />
          )}
        />

        <TextField margin="dense" name="city" label="City" type="text" fullWidth variant="outlined" value={formData.city} onChange={handleChange} />
        <Autocomplete
          sx={{ mt: 2 }}
          options={allRepositories}
          getOptionLabel={(option) => `${option.acronym} — ${option.name_en}`}
          value={allRepositories.find(r => r.uuid === formData.parent_id) || null}
          onChange={(event, newValue) => {
            handleAutocompleteChange('parent_id', newValue ? newValue.uuid : null);
          }}
          renderInput={(params) => (
            <TextField {...params} label="Valid Name (Parent)" margin="dense" helperText="If this is a synonym, select its current valid name. If this is a valid name, leave it blank."/>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogRepository;