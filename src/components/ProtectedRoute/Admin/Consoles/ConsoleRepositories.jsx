import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box, Alert, Chip, Typography, TextField } from '@mui/material';
import supabase from '../../../../utils/supabase';
import DialogRepository from '../Dialogs/DialogRepository';
import { useDebounce } from 'use-debounce';

const ConsoleRepositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);

  // ★★★ 1. 検索機能のためのstateを追加 ★★★
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // 500msの遅延

  const fetchRepositories = useCallback(async (term) => {
    setLoading(true);
    try {
      // ★★★ 2. 既存の検索用RPCを呼び出すように変更 ★★★
      const { data, error: reposError } = await supabase.rpc('search_repositories', {
        search_term: term,
      });

      if (reposError) throw reposError;
      setRepositories(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // debouncedSearchTermが変更されたらデータを再取得
  useEffect(() => {
    fetchRepositories(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchRepositories]);

  const handleOpenDialog = (repository = null) => {
    setSelectedRepository(repository);
    setDialogOpen(true);
  };

  const handleCloseDialog = (shouldRefresh) => {
    setDialogOpen(false);
    setSelectedRepository(null);
    if (shouldRefresh) {
      fetchRepositories(debouncedSearchTerm);
    }
  };

  // ★★★ 3. 表示するカラムを拡充 ★★★
  const columns = [
    { field: 'acronym', headerName: 'Acronym', width: 130 },
    { field: 'name_en', headerName: 'Official Name (English)', flex: 1, minWidth: 200 },
    { field: 'taxapad_code', headerName: 'Taxapad Code', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'city', headerName: 'City', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const isSynonym = params.row.is_synonym;
        return (
          <Chip
            label={isSynonym ? "Synonym" : "Valid Name"}
            color={isSynonym ? "warning" : "success"}
            size="small"
          />
        );
      },
    },
    {
      field: 'parent',
      headerName: 'Valid Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        if (!params.row.is_synonym) {
          return null;
        }
        return (
          <Typography variant="body2">
            {params.row.parent_acronym} — {params.row.parent_name_en}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 100,
      renderCell: (params) => (
        <Button onClick={() => handleOpenDialog(params.row)}>Edit</Button>
      ),
    },
  ];

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: '85vh', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        {/* ★★★ 4. 検索バーを設置 ★★★ */}
        <TextField
          label="Search Repositories..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: '400px' }}
        />
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          Add New Repository
        </Button>
      </Box>
      <DataGrid
        rows={repositories}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        pageSize={100}
        rowsPerPageOptions={[100]}
        disableSelectionOnClick
      />
      {dialogOpen && (
        <DialogRepository
          open={dialogOpen}
          onClose={handleCloseDialog}
          repository={selectedRepository}
        />
      )}
    </Box>
  );
};

export default ConsoleRepositories;