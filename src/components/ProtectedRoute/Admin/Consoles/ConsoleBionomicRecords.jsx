import React, { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../../../../utils/supabase"; // パス注意
import {
  Box,
  Typography,
  Stack,
  TextField,
  IconButton,
  Button,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  createTheme,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

// ダイアログ（追加＆編集）をインポート
import DialogBionomicRecordAdd from "../Dialogs/DialogBionomicRecordAdd";
import DialogBionomicRecordEdit from "../Dialogs/DialogBionomicRecordEdit";

// ダークテーマ定義（必要に応じて変更）
const darkTheme = createTheme({
  palette: { mode: "dark", primary: { main: "#7FFFD4" } },
});

// カラム定義
const columns = [
  { id: "id", label: "ID", minWidth: 280 },
  { id: "created_at", label: "Created At", minWidth: 180 },
  { id: "source_publication_id", label: "Source Pub ID", minWidth: 180 },
  { id: "page_start", label: "Page Start", minWidth: 100 },
  { id: "page_end", label: "Page End", minWidth: 100 },
  { id: "target_taxa_id", label: "Target Taxon", minWidth: 180 },
    { id: "data_type", label: "Data Type", minWidth: 120 },
  { id: "distribution", label: "Distribution", minWidth: 180 },
  { id: "country_id", label: "Country", minWidth: 120 },
  //{ id: "state", label: "State", minWidth: 120 },
  //{ id: "county", label: "County", minWidth: 120 },
  //{ id: "city", label: "City", minWidth: 120 },
  { id: "host_taxon_id", label: "Host Taxon", minWidth: 180 },
  { id: "other_related_taxon_id", label: "Other Taxon", minWidth: 180 },
  { id: "latitude", label: "Latitude", minWidth: 100 },
  { id: "longitude", label: "Longitude", minWidth: 100 },
  { id: "ecological_tags", label: "Ecological Tags", minWidth: 200 },
  { id: "remark", label: "Remark", minWidth: 200 },
  { id: "actions", label: "Actions", minWidth: 80, sortable: false },
];

// ▼ ソート関数（例: 文字列昇降順）
function descendingComparator(a, b, orderBy) {
  const aVal = a[orderBy] == null ? "" : String(a[orderBy]);
  const bVal = b[orderBy] == null ? "" : String(b[orderBy]);
  return bVal.localeCompare(aVal);
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function ConsoleBionomicRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("id");
  const [allPublications, setAllPublications] = useState([]);
  // 編集ダイアログのターゲット
  const [editTarget, setEditTarget] = useState(null);
  // 追加ダイアログの開閉
  const [openAdd, setOpenAdd] = useState(false);

  // レコードの取得
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bionomic_records")
        .select("*")
        .order("created_at", { ascending: false }); // 例: 新しい順
      if (error) throw error;
      if (data) {
        console.log("[ConsoleBionomicRecords] fetched count:", data.length);
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching bionomic_records:", err);
      alert("Failed to fetch bionomic_records. Check console.");
    } finally {
      setLoading(false);
    }
  }, []);
// ✅ 追加: publications一覧も取得する
  const fetchAllPublications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title_english")
        .order("id");
      if (error) throw error;
      if (data) {
        console.log("[ConsoleBionomicRecords] fetched publications count:", data.length);
        setAllPublications(data);
      }
    } catch (err) {
      console.error("Error fetching publications:", err);
      alert("Failed to fetch publications. Check console.");
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchAllPublications(); // ✅ 初回に publications も取得
  }, [fetchRecords, fetchAllPublications]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return records;
    const kw = keyword.trim().toLowerCase();
    return records.filter((r) =>
      Object.keys(r).some((col) => {
        if (r[col] == null) return false;
        return String(r[col]).toLowerCase().includes(kw);
      })
    );
  }, [records, keyword]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort(getComparator(order, orderBy));
  }, [filtered, order, orderBy]);

  // ソート要求ハンドラ
  const handleRequestSort = (colId) => {
    const colDef = columns.find((c) => c.id === colId);
    if (colDef && colDef.sortable === false) return;
    const isAsc = orderBy === colId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(colId);
  };

  // 追加ダイアログ onClose
  const handleAddDialogClose = (refreshNeeded) => {
    setOpenAdd(false);
    if (refreshNeeded) fetchRecords();
  };

  // 編集ダイアログ onClose
  const handleEditDialogClose = (refreshNeeded) => {
    setEditTarget(null);
    if (refreshNeeded) fetchRecords();
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ p: 3 }}>
        <Typography variant="h2" sx={{ mb: 2, color: "primary.main" }}>
          Bionomic Records Console
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Search..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ width: 300 }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
            Add Bionomic Record
          </Button>
        </Stack>

        <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.id} style={{ minWidth: col.minWidth }}>
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : "asc"}
                        onClick={() => handleRequestSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sortedFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                sortedFiltered.map((row) => (
                  <TableRow key={row.id} hover>
                    {columns.map((col) => {
                      if (col.id === "actions") {
                        return (
                          <TableCell key="actions">
                            <IconButton onClick={() => setEditTarget(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        );
                      }
                        let val = row[col.id] ?? "";
                        if (col.id === "ecological_tags" && typeof val === "object") {
                            val = JSON.stringify(val);
                        }
                        // Distribution用
                        if (col.id === "distribution" && Array.isArray(val)) {
                            val = (
                            <ul style={{ paddingLeft: 20 }}>
                                {val.map((item, idx) => (
                                <li key={idx}>
                                    {item.country || "Unknown Country"}
                                    {item.state ? `, ${item.state}` : ""}
                                    {item.city ? `, ${item.city}` : ""}
                                    {item.detail ? `, ${item.detail}` : ""}
                                    {item.latitude && item.longitude
                                        ? ` (${item.latitude}, ${item.longitude})`
                                        : ""}
                                    </li>
                                ))}
                            </ul>
                        );
                        }
                      return <TableCell key={col.id}>{val}</TableCell>;
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Add Dialog */}
      {openAdd && <DialogBionomicRecordAdd open={openAdd} onClose={handleAddDialogClose} />}

      {/* Edit Dialog */}
      {editTarget && (
        <DialogBionomicRecordEdit open={Boolean(editTarget)} onClose={handleEditDialogClose} recordData={editTarget} allPublications={allPublications } />
      )}
    </ThemeProvider>
  );
}
