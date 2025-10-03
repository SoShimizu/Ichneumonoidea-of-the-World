// src/components/ProtectedRoute/Admin/Consoles/Pages/ResearchersConsole.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import researchersPlugin from "../Plugins/researchers.plugin";
import DialogResearcher from "../../Dialogs/DialogResearcher";

export default function ResearchersConsole() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortModel, setSortModel] = useState([
    { field: researchersPlugin.defaultSort.field, sort: researchersPlugin.defaultSort.sort },
  ]);
  const [search, setSearch] = useState("");

  const { rows, total, loading } = useConsoleData({
    plugin: researchersPlugin,
    page,
    pageSize,
    sortModel,
    search,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);

  const columns = useMemo(
    () =>
      researchersPlugin.columns({
        onEdit: (row) => {
          setTargetRow(row);
          setDialogOpen(true);
        },
      }),
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Researchers
        </Typography>
        <TextField
          size="small"
          placeholder="Search by name / alias / ORCID"
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
            setTargetRow(null);
            setDialogOpen(true);
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
        onPageChange={setPage}
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
        onRowClick={() => {}}
        loading={loading}
      />

      {dialogOpen && (
        <DialogResearcher
          open
          onClose={() => setDialogOpen(false)}
          researcherId={targetRow?.id ?? null}
        />
      )}
    </Box>
  );
}
