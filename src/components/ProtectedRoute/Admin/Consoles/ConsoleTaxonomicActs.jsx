// /components/ProtectedRoute/Admin/DatabaseEditPages/ConsoleTaxonomicActs/ConsoleTaxonomicActs.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, TextField, IconButton, Button,
  createTheme, ThemeProvider, Stack, TableSortLabel,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import supabase from "../../../../utils/supabase";

import DialogTaxonomicActEdit from "../Dialogs/DialogTaxonomicActEdit";
import DialogTaxonomicActAdd from "../Dialogs/DialogTaxonomicActAdd";

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#121212',
    },
    primary: {
      main: '#7FFFD4',
    },
    text: {
      primary: '#7FFFD4',
    },
  },
});

// テーブルカラム定義
const columns = [
  { id: 'id',                 label: 'ID',                  minWidth: 160 },
  { id: 'scientific_name_id', label: 'Target Name',          minWidth: 140 },
  { id: 'publication_id',     label: 'Publication',          minWidth: 140 },
  { id: 'act_type_id',        label: 'Act Type (Code)',      minWidth: 120 },
  { id: 'related_name_id',    label: 'Related Name',         minWidth: 140 },
  { id: 'replacement_name_id', label: 'Replacement Name',    minWidth: 140 },
  { id: 'rank_change_to',     label: 'New Rank',             minWidth: 120 },
  { id: 'type_specimen_id',   label: 'Type Specimen',        minWidth: 140 },
  { id: 'type_taxon_id',      label: 'Type Taxon',           minWidth: 140 },
  { id: 'page',               label: 'Page',                 minWidth: 80 },
  { id: 'remarks',            label: 'Remarks',              minWidth: 150 },
  { id: 'created_at',         label: 'Created At',           minWidth: 140 },
  { id: 'actions',            label: 'Actions',              minWidth: 80, sortable: false },
];

// ソート
function descendingComparator(a, b, orderBy) {
  const aVal = a[orderBy] ?? '';
  const bVal = b[orderBy] ?? '';
  if (bVal < aVal) return -1;
  if (bVal > aVal) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function ConsoleTaxonomicActs() {
  const [taxonomicActs, setTaxonomicActs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('created_at');

  const fetchTaxonomicActs = async () => {
    const { data, error } = await supabase
      .from("taxonomic_acts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTaxonomicActs(data);
    }
  };

  useEffect(() => {
    fetchTaxonomicActs();
  }, []);

  const handleSearch = (e) => {
    setKeyword(e.target.value);
  };

  const handleRequestSort = (colId) => {
    const isAsc = orderBy === colId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(colId);
  };

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase();
    return taxonomicActs.filter(act =>
      Object.values(act).some(value =>
        (value || "").toString().toLowerCase().includes(kw)
      )
    );
  }, [taxonomicActs, keyword]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort(getComparator(order, orderBy));
  }, [filtered, order, orderBy]);

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h2">
          Taxonomic Acts Console
        </Typography>

        <TextField
          label="Search..."
          value={keyword}
          onChange={handleSearch}
          fullWidth
          InputLabelProps={{ style: { color: '#7FFFD4' } }}
          InputProps={{ style: { color: '#7FFFD4' } }}
        />

        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
        >
          Add Taxonomic Act
        </Button>

        <TableContainer component={Paper} sx={{ maxHeight: 600, backgroundColor: '#121212' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={{ color: '#7FFFD4', minWidth: col.minWidth, whiteSpace: 'nowrap' }}
                    sortDirection={orderBy === col.id ? order : false}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
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
              {sortedFiltered.map((act) => (
                <TableRow key={act.id} hover>
                  {columns.map((col) => {
                    if (col.id === 'actions') {
                      return (
                        <TableCell key="actions">
                          <IconButton
                            onClick={() => setEditTarget(act)}
                            sx={{ color: '#7FFFD4' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      );
                    }
                    const value = act[col.id] ?? "";
                    return (
                      <TableCell
                        key={col.id}
                        sx={{ color: '#7FFFD4', fontFamily: 'monospace' }}
                      >
                        {value || "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* --- 編集ダイアログ --- */}
        {editTarget && (
          <DialogTaxonomicActEdit
            taxonomicAct={editTarget}
            onClose={() => {
              setEditTarget(null);
              fetchTaxonomicActs();
            }}
          />
        )}

        {/* --- 新規追加ダイアログ --- */}
        {openAdd && (
          <DialogTaxonomicActAdd
            onClose={() => {
              setOpenAdd(false);
              fetchTaxonomicActs();
            }}
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}
