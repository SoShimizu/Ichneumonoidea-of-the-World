import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete
} from '@mui/material';
import supabase from '../../../../utils/supabase';

// ★★★ `initialValue` prop を受け取れるように変更 ★★★
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

  useEffect(() => {
    const fetchAllRepos = async () => {
      const { data } = await supabase.from("Repositories").select('uuid, acronym, name_en');
      if (data) setAllRepositories(data);
    };
    if (open) {
      fetchAllRepos();
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
        // ★★★ 新規追加時、`initialValue` を acronym の初期値に設定 ★★★
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

  // (handleChange と handleSubmit のロジックは変更なし)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    let error;
    let newRecordUuid = null;

    const saveData = {
        acronym: formData.acronym,
        name_en: formData.name_en,
        parent_id: formData.parent_id,
        taxapad_code: formData.taxapad_code,
        country: formData.country,
        city: formData.city,
    };

    if (repository) { // Edit mode
      const { error: updateError } = await supabase
        .from('Repositories')
        .update(saveData)
        .match({ uuid: repository.uuid });
      error = updateError;
    } else { // Add mode
      const { data: newRecord, error: insertError } = await supabase
        .from('Repositories')
        .insert([saveData])
        .select('uuid')
        .single();
      
      error = insertError;
      if (newRecord) {
        newRecordUuid = newRecord.uuid;
      }
    }

    if (!error && newRecordUuid && !formData.parent_id) {
      const { error: selfParentError } = await supabase
        .from('Repositories')
        .update({ parent_id: newRecordUuid })
        .match({ uuid: newRecordUuid });
      
      if (selfParentError) {
        error = selfParentError;
      }
    }

    setLoading(false);
    if (error) {
      alert('Error saving repository: ' + error.message);
    } else {
      onClose(true);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{repository ? 'Edit Repository' : 'Add New Repository'}</DialogTitle>
      <DialogContent>
        <TextField autoFocus margin="dense" name="acronym" label="Acronym (e.g., NIAES, NARO)" type="text" fullWidth variant="outlined" value={formData.acronym} onChange={handleChange} required />
        <TextField margin="dense" name="name_en" label="Official Name (English)" type="text" fullWidth variant="outlined" value={formData.name_en} onChange={handleChange} />
        <TextField margin="dense" name="taxapad_code" label="Taxapad Code" type="text" fullWidth variant="outlined" value={formData.taxapad_code} onChange={handleChange} />
        <TextField margin="dense" name="country" label="Country" type="text" fullWidth variant="outlined" value={formData.country} onChange={handleChange} />
        <TextField margin="dense" name="city" label="City" type="text" fullWidth variant="outlined" value={formData.city} onChange={handleChange} />
        <Autocomplete
          sx={{ mt: 2 }}
          options={allRepositories}
          getOptionLabel={(option) => `${option.acronym} — ${option.name_en}`}
          value={allRepositories.find(r => r.uuid === formData.parent_id) || null}
          onChange={(event, newValue) => {
            setFormData(prev => ({ ...prev, parent_id: newValue ? newValue.uuid : null }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Valid Name (Parent)" margin="dense" helperText="If this is a synonym (e.g., NIAES), select its current valid name (e.g., NARO). If this is a valid name, leave it blank."/>
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