// src/components/ProtectedRoute/Admin/Consoles/Pages/ScientificNamesConsole.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import scientificNamesPlugin from "../Plugins/scientificNames.plugin";

import DialogScientificNameEdit from "../../Dialogs/DialogScientificNameEdit";
import DialogScientificNameAdd from "../../Dialogs/DialogScientificNameAdd/DialogScientificNameAdd";

export default function ScientificNamesConsole() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [sortModel, setSortModel] = useState([
    { field: scientificNamesPlugin.defaultSort.field, sort: scientificNamesPlugin.defaultSort.sort },
  ]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const { rows, total, loading } = useConsoleData({
    plugin: scientificNamesPlugin,
    page,
    pageSize,
    sortModel,
    search,
    refreshKey,
  });

  const columns = useMemo(
    () =>
      scientificNamesPlugin.columns({
        onEdit: (row) => setEditRow(row),
      }),
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Scientific Name Data
        </Typography>
        <TextField
          size="small"
          placeholder="Search (name / author / fields...)"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
          Add
        </Button>
      </Stack>

      <ConsoleTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onPageSizeChange={(s) => {
          setPage(0);
          setPageSize(s);
        }}
        sortModel={sortModel}
        onSortModelChange={(m) => {
          setPage(0);
          setSortModel(m);
        }}
        onRowClick={(row) => setEditRow(row)}
        loading={loading}
        getRowId={(row) => row.id}
      />

      {openAdd && (
        <DialogScientificNameAdd
          onClose={(saved) => {
            setOpenAdd(false);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {editRow && (
        <DialogScientificNameEdit
          scientificName={editRow}
          onClose={(saved) => {
            setEditRow(null);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
