// src/components/ProtectedRoute/Admin/Consoles/Pages/TaxonomicActsConsole.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import taxonomicActsPlugin from "../Plugins/taxonomicActs.plugin";

// 既存のダイアログ（編集／追加）を流用
import DialogTaxonomicActEdit from "../../Dialogs/DialogTaxonomicActEdit";
import DialogTaxonomicActAdd from "../../Dialogs/DialogTaxonomicActAdd";

const LOG_TAG = "[TaxonomicActsConsole]";

export default function TaxonomicActsConsole() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortModel, setSortModel] = useState([
    { field: taxonomicActsPlugin.defaultSort.field, sort: taxonomicActsPlugin.defaultSort.sort },
  ]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const { rows, total, loading } = useConsoleData({
    plugin: taxonomicActsPlugin,
    page,
    pageSize,
    sortModel,
    search,
    refreshKey,
  });

  const columns = useMemo(
    () =>
      taxonomicActsPlugin.columns({
        onEdit: (row) => {
          console.debug(`${LOG_TAG} onEdit`, row?.id);
          setEditRow(row);
        },
      }),
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Taxonomic Acts
        </Typography>

        <TextField
          size="small"
          placeholder="Search by any field (id / names / page / remarks...)"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
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
          console.debug(`${LOG_TAG} row click`, row?.id);
          setEditRow(row);
        }}
        loading={loading}
      />

      {/* 追加 */}
      {openAdd && (
        <DialogTaxonomicActAdd
          onClose={(saved) => {
            setOpenAdd(false);
            if (saved) {
              console.debug(`${LOG_TAG} add: refresh`);
              setRefreshKey((k) => k + 1);
            }
          }}
        />
      )}

      {/* 編集 */}
      {editRow && (
        <DialogTaxonomicActEdit
          taxonomicAct={editRow}
          onClose={(saved) => {
            setEditRow(null);
            if (saved) {
              console.debug(`${LOG_TAG} edit: refresh`);
              setRefreshKey((k) => k + 1);
            }
          }}
        />
      )}
    </Box>
  );
}
