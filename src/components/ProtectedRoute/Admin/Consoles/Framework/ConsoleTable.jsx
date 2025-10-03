// Consoles/Framework/ConsoleTable.jsx
import React from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function ConsoleTable({
  columns, rows, total,
  page, onPageChange,
  pageSize, onPageSizeChange,
  sortModel, onSortModelChange,
  onRowClick,
  loading
}) {
  return (
    <Box sx={{ height: 640, width: "100%" }}>
      <DataGrid
        disableRowSelectionOnClick
        rows={rows}
        columns={columns}
        pagination
        paginationMode="server"
        rowCount={total}
        page={page}
        onPageChange={onPageChange}
        pageSizeOptions={[10, 25, 50, 100]}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        onRowDoubleClick={(p) => onRowClick?.(p.row)}
        loading={loading}
        getRowId={(r) => r.id}
        sx={{
          // 左固定（ヘッダ & セル）
          "& .col-actions, & .col-id": {
            position: "sticky",
            left: 0,
            backgroundColor: "background.paper",
            zIndex: 2,
          },
          "& .col-id": { left: 96 }, // actions 幅ぶん右へ
          "& .MuiDataGrid-columnHeaders .col-actions, & .MuiDataGrid-columnHeaders .col-id": {
            zIndex: 3,
          },
        }}
      />
    </Box>
  );
}
