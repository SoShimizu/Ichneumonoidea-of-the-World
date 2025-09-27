import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box, CircularProgress, Alert, Chip, Typography } from '@mui/material';
import supabase from '../../../../utils/supabase';
import DialogRepository from '../Dialogs/DialogRepository';

const ConsoleRepositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    try {
      // 親の情報を同時に取得するためにJOINする
      const { data, error: reposError } = await supabase
        .from('Repositories')
        .select(`
          *,
          parent:parent_id (acronym, name_en)
        `)
        .order('acronym', { ascending: true });

      if (reposError) throw reposError;
      setRepositories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleOpenDialog = (repository = null) => {
    setSelectedRepository(repository);
    setDialogOpen(true);
  };

  const handleCloseDialog = (shouldRefresh) => {
    setDialogOpen(false);
    setSelectedRepository(null);
    if (shouldRefresh) {
      fetchRepositories();
    }
  };

  const columns = [
    { field: 'acronym', headerName: 'Acronym', width: 150 },
    { field: 'name_en', headerName: 'Official Name (English)', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const isSynonym = params.row.uuid !== params.row.parent_id;
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
      renderCell: (params) => {
        if (params.row.uuid === params.row.parent_id || !params.row.parent) {
          return null;
        }
        return (
          <Typography variant="body2">
            {params.row.parent.acronym} — {params.row.parent.name_en}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 150,
      renderCell: (params) => (
        <Button onClick={() => handleOpenDialog(params.row)}>Edit</Button>
      ),
    },
  ];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: '85vh', width: '100%' }}>
      <Button variant="contained" onClick={() => handleOpenDialog()} sx={{ mb: 2 }}>
        Add New Repository
      </Button>
      <DataGrid
        rows={repositories}
        columns={columns}
        getRowId={(row) => row.uuid} // 主キーがuuidであることを指定
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