// src/components/ProtectedRoute/Admin/Consoles/Pages/InstitutesConsole.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import repositoriesPlugin from "../Plugins/repositories.plugin";

// 既存のレポジトリ（研究機関）ダイアログ
import DialogRepository from "../../Dialogs/DialogRepository";

export default function InstitutesConsole() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortModel, setSortModel] = useState([
    { field: repositoriesPlugin.defaultSort.field, sort: repositoriesPlugin.defaultSort.sort },
  ]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const { rows, total, loading } = useConsoleData({
    plugin: repositoriesPlugin,
    page,
    pageSize,
    sortModel,
    search,
    refreshKey,
  });

  const columns = useMemo(
    () =>
      repositoriesPlugin.columns({
        onEdit: (row) => {
          console.debug("[InstitutesConsole] Edit clicked", row?.uuid);
          setEditRow(row);
        },
      }),
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Institutes
        </Typography>
        <TextField
          size="small"
          placeholder="Search institutes (acronym / name / taxapad)"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            console.debug("[InstitutesConsole] Add clicked");
            setOpenAdd(true);
          }}
        >
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
        onRowClick={(row) => {
          console.debug("[InstitutesConsole] Row clicked", row?.uuid);
          setEditRow(row);
        }}
        loading={loading}
      />

      {/* Add */}
      {openAdd && (
        <DialogRepository
          open={openAdd}
          onClose={(saved) => {
            console.debug("[InstitutesConsole] Add dialog closed", { saved });
            setOpenAdd(false);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Edit */}
      {editRow && (
        <DialogRepository
          open={!!editRow}
          repository={editRow}
          onClose={(saved) => {
            console.debug("[InstitutesConsole] Edit dialog closed", { saved, uuid: editRow?.uuid });
            setEditRow(null);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
