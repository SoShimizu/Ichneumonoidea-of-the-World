// src/admin/console/pages/ConsoleScreen.jsx
import React, { useMemo, useState } from "react";
import AdminConsoleLayout from "../Framework/AdminConsoleLayout";
import ConsoleToolbar from "../Framework/ConsoleToolbar";
import ConsoleTable from "../Framework/ConsoleTable";
import EntityDetailDialog from "../Framework/EntityDetailDialog";
import EntityFormDialog from "../Framework/EntityFormDialog";
import ConfirmDialog from "../Framework/ConfirmDialog";
import useConsoleData from "../Data/useConsoleData";
import { useToast } from "../Framework/ToastProvider";
import { exportCsv, upsertRow, deleteRow } from "../Data/crud";
import { Button, IconButton, Stack, Tooltip } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, FileDownload as FileDownloadIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";

export default function ConsoleScreen({ plugin }) {
  const {
    rows, total, page, setPage, pageSize, setPageSize, sortModel, setSortModel,
    searchText, setSearchText, filters, setFilterValue, refresh, loading,
  } = useConsoleData({ plugin });

  const toast = useToast();
  const [showHidden, setShowHidden] = useState(false);
  const [detail, setDetail] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const cols = useMemo(() => plugin.columns.map((c) => ({ ...c, hide: c.hide && !showHidden })), [plugin, showHidden]);

  const actions = (
    <>
      <Button startIcon={<FileDownloadIcon />} onClick={() => exportCsv(rows, plugin.key + ".csv")}>Export</Button>
      {plugin.permissions?.create && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add</Button>
      )}
    </>
  );

  const onSubmit = async (payload) => {
    try {
      await upsertRow(plugin.table, editing ? { ...editing, ...payload } : payload);
      toast.push("success", editing ? "Updated" : "Created");
      setFormOpen(false); setEditing(null); refresh();
    } catch (e) {
      console.error(e); toast.push("error", e.message || "Save failed");
    }
  };

  const onDelete = async (row) => setConfirm({ row });
  const confirmDelete = async () => {
    try {
      await deleteRow(plugin.table, confirm.row.id);
      toast.push("success", "Deleted");
      setConfirm(null); refresh();
    } catch (e) { toast.push("error", e.message || "Delete failed"); }
  };

  return (
    <AdminConsoleLayout title={plugin.title} subtitle={plugin.description} actions={actions}>
      <ConsoleToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        filters={plugin.search?.filters?.map((f) => ({ ...f, value: filters[f.name], options: f.options || f.options }))}
        onFiltersChange={(name, val) => setFilterValue(name, val)}
        showHidden={showHidden}
        onToggleHidden={setShowHidden}
        onRefresh={refresh}
      />

      <ConsoleTable
        columns={[...cols, {
          field: "_actions", headerName: "Actions", width: 160, sortable: false, renderCell: (p) => (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Details"><IconButton onClick={() => setDetail(p.row)}><OpenInNewIcon /></IconButton></Tooltip>
              {plugin.permissions?.update && <Tooltip title="Edit"><IconButton onClick={() => { setEditing(p.row); setFormOpen(true); }}><EditIcon /></IconButton></Tooltip>}
              {plugin.permissions?.delete && <Tooltip title="Delete"><IconButton color="error" onClick={() => onDelete(p.row)}><DeleteIcon /></IconButton></Tooltip>}
            </Stack>
          )
        }]}
        rows={rows}
        total={total}
        page={page}
        onPageChange={(v) => setPage(v)}
        pageSize={pageSize}
        onPageSizeChange={(v) => { setPage(0); setPageSize(v); }}
        sortModel={sortModel}
        onSortModelChange={(m) => setSortModel(m)}
        onRowClick={(row) => setDetail(row)}
        loading={loading}
      />

      <EntityDetailDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title || `${plugin.title} #${detail?.id}`}
        content={() => plugin.detail ? plugin.detail(detail) : (<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(detail, null, 2)}</pre>)}
        onDuplicate={() => { const { id, ...rest } = detail || {}; setEditing(rest); setFormOpen(true); }}
      />

      <EntityFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={(editing ? "Edit " : "Add ") + plugin.title}
        fields={plugin.form.fields}
        validation={plugin.form.validation}
        initial={editing || {}}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={!!confirm}
        title={`Delete ${plugin.title}`}
        message={`Delete ID ${confirm?.row?.id}? This cannot be undone.`}
        onCancel={() => setConfirm(null)}
        onConfirm={confirmDelete}
      />
    </AdminConsoleLayout>
  );
}
