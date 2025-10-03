// Consoles/Pages/PublicationsConsole.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import publicationsPlugin from "../Plugins/publications.plugin";

// ← 既存ダイアログを利用
import DialogPublicationAdd from "../../Dialogs/DialogPublicationAdd";
import DialogPublicationEdit from "../../Dialogs/DialogPublicationEdit";

export default function PublicationsConsole() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortModel, setSortModel] = useState([
    { field: publicationsPlugin.defaultSort.field, sort: publicationsPlugin.defaultSort.sort },
  ]);
  const [search, setSearch] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // 保存後の再読込

  const { rows, total, loading } = useConsoleData({
    plugin: publicationsPlugin,
    page,
    pageSize,
    sortModel,
    search,
    refreshKey,
  });

  const columns = useMemo(
    () =>
      publicationsPlugin.columns({
        onEdit: (row) => setEditRow(row),
      }),
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Publications
        </Typography>
        <TextField
          size="small"
          placeholder="Search title / ID / DOI / Authors / Journal"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          sx={{ minWidth: 360 }}
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
        onPageSizeChange={(s) => { setPage(0); setPageSize(s); }}
        sortModel={sortModel}
        onSortModelChange={(m) => { setPage(0); setSortModel(m); }}
        onRowClick={(row) => setEditRow(row)} // ダブルクリックで編集
        loading={loading}
      />

      {openAdd && (
        <DialogPublicationAdd
          onClose={(saved) => {
            setOpenAdd(false);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {editRow && (
        <DialogPublicationEdit
          publication={editRow}
          onClose={(saved) => {
            setEditRow(null);
            if (saved) setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
