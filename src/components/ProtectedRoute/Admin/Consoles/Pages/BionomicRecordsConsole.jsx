// src/components/ProtectedRoute/Admin/Consoles/Pages/BionomicRecordsConsole.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import ConsoleTable from "../Framework/ConsoleTable";
import useConsoleData from "../Data/useConsoleData";
import bionomicRecordsPlugin from "../Plugins/bionomicRecords.plugin";

// 既存のダイアログを流用
import DialogBionomicRecordAdd from "../../Dialogs/DialogBionomicRecordAdd";
import DialogBionomicRecordEdit from "../../Dialogs/DialogBionomicRecordEdit";

import supabase from "../../../../../utils/supabase";

const LOG_TAG = "[BionomicRecordsConsole]";

export default function BionomicRecordsConsole() {
  // DataGrid ベースの状態
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortModel, setSortModel] = useState([
    {
      field: bionomicRecordsPlugin.defaultSort.field,
      sort: bionomicRecordsPlugin.defaultSort.sort,
    },
  ]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Add/Edit
  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Edit ダイアログに渡す publications（元実装と同じ振る舞い）
  const [allPublications, setAllPublications] = useState([]);

  // 一覧の取得（useConsoleData）
  const { rows, total, loading } = useConsoleData({
    plugin: bionomicRecordsPlugin,
    page,
    pageSize,
    sortModel,
    search,
    refreshKey,
  });

  // テーブル列（プラグインから）
  const columns = useMemo(
    () =>
      bionomicRecordsPlugin.columns({
        onEdit: (row) => {
          console.debug(`${LOG_TAG} onEdit`, row?.id);
          setEditRow(row);
        },
      }),
    []
  );

  // publications を別途取得（ダイアログでの表示用）
  const fetchAllPublications = useCallback(async () => {
    console.debug(`${LOG_TAG} fetchAllPublications:start`);
    const { data, error } = await supabase
      .from("publications")
      .select("id, title_english")
      .order("id");
    if (error) {
      console.error(`${LOG_TAG} fetchAllPublications:error`, error);
      return;
    }
    console.debug(`${LOG_TAG} fetchAllPublications:ok`, data?.length || 0);
    setAllPublications(data || []);
  }, []);

  // ✅ 正しい依存関係で一度だけ実行（関数は useCallback で安定化）
  useEffect(() => {
    fetchAllPublications();
  }, [fetchAllPublications]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Bionomic Records
        </Typography>

        <TextField
          size="small"
          placeholder="Search by any field (id / taxa / country / remark …)"
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
        <DialogBionomicRecordAdd
          open={openAdd}
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
        <DialogBionomicRecordEdit
          open
          recordData={editRow}
          allPublications={allPublications}
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
