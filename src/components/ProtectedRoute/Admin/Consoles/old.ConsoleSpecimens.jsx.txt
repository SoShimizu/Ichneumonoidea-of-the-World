import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Stack,
  IconButton,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  TableSortLabel,
  createTheme,
  ThemeProvider
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import supabase from "../../../../utils/supabase";

// サブダイアログ（それぞれ add/edit/delete 用のダイアログコンポーネント）
import DialogSpecimen from "../Dialogs/DialogSpecimen";

// ダークテーマ設定
const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#000000",
      paper: "#121212"
    },
    primary: {
      main: "#7FFFD4"
    },
    text: {
      primary: "#7FFFD4"
    }
  }
});

// テーブルの各列定義
const columns = [
  { id: "id", label: "ID", minWidth: 140 },
  { id: "publication_title", label: "Publication", minWidth: 200 },
  { id: "original_identification", label: "Original Identification", minWidth: 200 },
  { id: "latest_identification", label: "Latest Identification", minWidth: 200 },
  { id: "country_id", label: "Country", minWidth: 100 },
  { id: "state_province", label: "State/Province", minWidth: 120 },
  { id: "city", label: "City", minWidth: 100 },
  { id: "latitude", label: "Lat", minWidth: 80 },
  { id: "longitude", label: "Lon", minWidth: 80 },
  { id: "specimen_count", label: "Count", minWidth: 80 },
  { id: "original_type_category", label: "Original Type Category", minWidth: 160 },
  { id: "latest_type_category", label: "Latest Type Category", minWidth: 160 },
  { id: "sex", label: "Sex", minWidth: 80 },
  { id: "collector", label: "Collector", minWidth: 140 },
  { id: "collection_date", label: "Date", minWidth: 100 },
  { id: "actions", label: "Actions", minWidth: 80, sortable: false }
];

// ソート用関数
function descendingComparator(a, b, orderBy) {
  const aVal = a[orderBy] ?? "";
  const bVal = b[orderBy] ?? "";
  if (bVal < aVal) return -1;
  if (bVal > aVal) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function BionomicsRecordConsole() {
  // --- テーブル用データ管理 ---
  const [records, setRecords] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("publication_title");

  // --- データ取得 ---
  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("distribution_records")
      .select(`
        *,
        publications ( title_english ),
        original_taxa: scientific_names!original_taxon_id ( name_spell_valid ),
        latest_taxa: scientific_names!latest_taxon_id ( name_spell_valid, type_category  )
      `)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const formatted = data.map((rec) => ({
        ...rec,
        publication_title: rec.publications?.title_english || "",
        original_identification: rec.original_identification_info || (rec.original_taxa ? rec.original_taxa.name_spell_valid : ""),
        latest_identification: rec.latest_identification_info || (rec.latest_taxa ? rec.latest_taxa.name_spell_valid : ""),
        original_type_category: rec.original_taxa?.type_category || "",
        latest_type_category: rec.latest_taxa?.type_category || "",
        specimen_count: `${rec.specimen_count_male || 0}♂ / ${rec.specimen_count_female || 0}♀`,
        collector: rec.collector || ""
      }));
      setRecords(formatted);
    } else {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = (e) => {
    setKeyword(e.target.value);
  };

  const handleRequestSort = (colId) => {
    const isAsc = orderBy === colId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(colId);
  };

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase();
    return records.filter((rec) =>
      (rec.publication_title || "").toLowerCase().includes(kw) ||
      (rec.original_identification || "").toLowerCase().includes(kw) ||
      (rec.latest_identification || "").toLowerCase().includes(kw) ||
      (rec.collector || "").toLowerCase().includes(kw) ||
      (rec.country_id || "").toLowerCase().includes(kw)
    );
  }, [records, keyword]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort(getComparator(order, orderBy));
  }, [filtered, order, orderBy]);

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h2">
          Specimens Data Console
        </Typography>
        <TextField
          label="Search..."
          value={keyword}
          onChange={handleSearch}
          fullWidth
          InputLabelProps={{ style: { color: "#7FFFD4" } }}
          InputProps={{ style: { color: "#7FFFD4" } }}
        />
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
        >
          Add Specimen-Based Record
        </Button>
        {/*
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
        >
          Add Literature-only-Based Record
        </Button>
        */}
        <TableContainer component={Paper} sx={{ maxHeight: 600, backgroundColor: "#121212" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={{ color: "#7FFFD4", minWidth: col.minWidth, whiteSpace: "nowrap" }}
                    sortDirection={orderBy === col.id ? order : false}
                  >
                    {col.sortable === false || col.id === "actions" ? (
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
              {sortedFiltered.map((rec) => (
                <TableRow key={rec.id} hover>
                  {columns.map((col) => {
                    if (col.id === "actions") {
                      return (
                        <TableCell key="actions">
                          <IconButton
                            onClick={() => setEditTarget(rec)}
                            sx={{ color: "#7FFFD4" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      );
                    }
                    const cellValue = rec[col.id] ?? "";
                    return (
                      <TableCell key={col.id} sx={{ color: "#7FFFD4", fontFamily: "monospace" }}>
                        {cellValue || "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>


        {/* 追加ダイアログ (add mode) */}
        {openAdd && (
          <DialogSpecimen
            onClose={() => {
              setOpenAdd(false);
              fetchRecords();
            }}
            mode="add"
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}
