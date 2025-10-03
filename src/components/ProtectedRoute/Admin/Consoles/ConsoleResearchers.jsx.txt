import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box, Alert, TextField, Typography } from '@mui/material';
import supabase from '../../../../utils/supabase';
import DialogResearcher from '../Dialogs/DialogResearcher';
import { useDebounce } from 'use-debounce';

const ConsoleResearchers = () => {
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResearcher, setSelectedResearcher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const fetchResearchers = useCallback(async (term) => {
    setLoading(true);
    setError(null);
    try {
      // ▼▼▼ ここから修正 ▼▼▼
      // クライアントでのクエリ構築をやめ、先ほど作成したDB関数(RPC)を呼び出す
      const { data, error: rpcError } = await supabase.rpc('search_researchers', {
        search_term: term,
      }).select(`
        id,
        first_name,
        last_name,
        orcid,
        researcher_aliases (alias_name)
      `);
      // ▲▲▲ ここまで修正 ▲▲▲

      if (rpcError) throw rpcError;
      
      setResearchers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResearchers(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchResearchers]);

  const handleOpenDialog = (researcher = null) => {
    setSelectedResearcher(researcher);
    setDialogOpen(true);
  };

  const handleCloseDialog = (shouldRefresh) => {
    setDialogOpen(false);
    setSelectedResearcher(null);
    if (shouldRefresh) {
      fetchResearchers(debouncedSearchTerm);
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => `${params.row.last_name || ''}, ${params.row.first_name || ''}`
    },
    {
      field: 'orcid',
      headerName: 'ORCID',
      width: 200
    },
    {
      field: 'aliases',
      headerName: 'Aliases',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Typography variant="body2" color="textSecondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {params.row.researcher_aliases?.map(a => a.alias_name).join(', ') || ''}
        </Typography>
      )
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
        <TextField
          label="Search Researchers by Name or Alias..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: '400px' }}
        />
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          Add New Researcher
        </Button>
      </Box>
      <DataGrid
        rows={researchers}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        pageSizeOptions={[100]}
        initialState={{
            pagination: { paginationModel: { pageSize: 100 } },
        }}
        disableRowSelectionOnClick
      />
      {dialogOpen && (
        <DialogResearcher
          open={dialogOpen}
          onClose={handleCloseDialog}
          researcherId={selectedResearcher ? selectedResearcher.id : null}
        />
      )}
    </Box>
  );
};

export default ConsoleResearchers;