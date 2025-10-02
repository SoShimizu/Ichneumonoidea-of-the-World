import React, { useState, useEffect, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, TextField, IconButton, Button,
  createTheme, ThemeProvider, Stack, TableSortLabel,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

import DialogScientificNameEdit from "../Dialogs/DialogScientificNameEdit";
import DialogScientificNameAdd from "../Dialogs/DialogScientificNameAdd/DialogScientificNameAdd";
import fetchSupabaseAllWithOrdering from "../../../../utils/fetchSupabaseAllWithOrdering";

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#000000', paper: '#121212' },
    primary: { main: '#7FFFD4' },
    secondary: { main: '#FF6347' },
    text: { primary: '#FFFFFF', secondary: '#B0B0B0' },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#424242',
          color: '#FFFFFF',
        },
        head: {
          backgroundColor: '#1E1E1E',
          color: '#7FFFD4',
          fontWeight: 'bold',
        },
        stickyHeader: {
          backgroundColor: '#1E1E1E',
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { color: '#7FFFD4' } } },
    MuiTextField: { styleOverrides: { root: { '& label': { color: '#B0B0B0' }, '& label.Mui-focused': { color: '#7FFFD4' }, '& .MuiInputBase-input': { color: '#FFFFFF' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#424242' }, '&:hover fieldset': { borderColor: '#7FFFD4' }, '&.Mui-focused fieldset': { borderColor: '#7FFFD4' } } } } },
    MuiButton: { styleOverrides: { outlinedPrimary: { color: '#7FFFD4', borderColor: '#7FFFD4' } } },
    MuiTableSortLabel: { styleOverrides: { root: { color: '#7FFFD4', '&.Mui-active': { color: '#7FFFD4' }, '&:hover': { color: '#FFFFFF' } }, icon: { color: '#7FFFD4 !important' } } }
  },
});

const columns = [
  { id: 'id', label: 'ID', minWidth: 150, sticky: 'left' },
  { id: 'name_spell_valid', label: 'Valid Name', minWidth: 150 },
  { id: 'name_spell_original', label: 'Original Spelling', minWidth: 150 },
  { id: 'authority', label: 'Authority', minWidth: 150, sortable: false },
  { id: 'authority_year', label: 'Auth. Year', minWidth: 100 },
  { id: 'current_rank', label: 'Current Rank', minWidth: 120 },
  { id: 'current_parent', label: 'Current Parent', minWidth: 150 },
  { id: 'original_rank', label: 'Original Rank', minWidth: 120 },
  { id: 'original_parent', label: 'Original Parent', minWidth: 150 },
  { id: 'valid_name_id', label: 'Valid Name ID', minWidth: 150 },
  { id: 'type_taxa_id', label: 'Type Taxa ID', minWidth: 150 },
  { id: 'extant_fossil', label: 'Extant/Fossil', minWidth: 120 },
  { id: 'type_category', label: 'Type Category', minWidth: 140 },
  { id: 'type_locality', label: 'Type Locality', minWidth: 140 },
  { id: 'type_sex', label: 'Type Sex', minWidth: 100 },
  { id: 'type_repository', label: 'Type Repository', minWidth: 140 },
  { id: 'type_host', label: 'Type Host', minWidth: 140 },
  { id: 'source_of_original_description', label: 'Source', minWidth: 150 },
  { id: 'page', label: 'Page', minWidth: 80 },
  { id: 'remark', label: 'Remark', minWidth: 200 },
  { id: 'last_update', label: 'Last Update', minWidth: 160 },
  { id: 'actions', label: 'Actions', minWidth: 80, sortable: false, sticky: 'right' },
];

function descendingComparator(a, b, orderBy) {
  const aVal = a[orderBy] === null || a[orderBy] === undefined ? '' : String(a[orderBy]);
  const bVal = b[orderBy] === null || b[orderBy] === undefined ? '' : String(b[orderBy]);
  return bVal.localeCompare(aVal);
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ▼▼▼ 修正点 1: Authority文字列生成関数を修正 ▼▼▼
const generateAuthorityString = (authorsData) => {
    if (!authorsData || authorsData.length === 0) return "—";
    // `item.authors`を`item.researchers`に、`author.last_name_eng`を`author.last_name`に変更
    const authors = authorsData.map(item => item.researchers).filter(author => author && author.last_name);
    if (authors.length === 0) return "—";
    const authorNames = authors.map(a => a.last_name);
    if (authorNames.length <= 3) { return authorNames.join(", "); }
    return `${authorNames.slice(0, 3).join(", ")} et al.`;
};
// ▲▲▲ 修正点 1 ▲▲▲


export default function ConsoleScientificName() {
  const [scientificNames, setScientificNames] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name_spell_valid');

  const fetchScientificNames = async () => {
    // ▼▼▼ 修正点 2: データ取得クエリを修正 ▼▼▼
    const data = await fetchSupabaseAllWithOrdering({
      tableName: "scientific_names",
        selectQuery: `
          *,
          scientific_name_and_author(
            author_order,
            researchers:researcher_id (
              id,
              last_name,
              first_name
            )
          )
        `,
    // ▲▲▲ 修正点 2 ▲▲▲
        orderOptions: [
          {
            column: "author_order",
            referencedTable: "scientific_name_and_author",
            ascending: true,
          }
        ]
      });

    if (!data) {
        console.error("Error fetching scientific names with authors");
    } else if (data) {
      setScientificNames(data);
    }
  };

  useEffect(() => {
    fetchScientificNames();
  }, []);

  const handleSearch = (e) => { setKeyword(e.target.value); };

  const handleRequestSort = (colId) => {
    const columnDefinition = columns.find(c => c.id === colId);
    if (!columnDefinition || columnDefinition.sortable === false || columnDefinition.sticky) {
        return;
    }
    const isAsc = orderBy === colId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(colId);
  };

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase();
    if (!kw) return scientificNames;
    return scientificNames.filter(sn => {
        const authorityStr = generateAuthorityString(sn.scientific_name_and_author).toLowerCase();
        const remarkValue = (sn.remark || sn.Remark || "").toLowerCase();
        return (
            (sn.name_spell_valid || "").toLowerCase().includes(kw) ||
            (sn.id || "").toLowerCase().includes(kw) ||
            authorityStr.includes(kw) ||
            remarkValue.includes(kw) ||
          (sn.name_spell_original || "").toLowerCase().includes(kw) ||
          (sn.type_category || "").toLowerCase().includes(kw) ||
            (sn.type_host || "").toLowerCase().includes(kw) ||
            (sn.type_locality || "").toLowerCase().includes(kw) ||
            (sn.current_rank || "").toLowerCase().includes(kw) ||
            (sn.current_parent || "").toLowerCase().includes(kw)
        );
    });
  }, [scientificNames, keyword]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort(getComparator(order, orderBy));
  }, [filtered, order, orderBy]);

  const handleEditDialogClose = (refreshNeeded, updatedData) => {
    setEditTarget(null);
    if (refreshNeeded) {
        if (updatedData) {
            const updatedItem = {
                ...updatedData,
                scientific_name_and_author: editTarget?.scientific_name_and_author
            };
            setScientificNames(prev =>
                prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            );
        } else {
          fetchScientificNames();
        }
    }
  };

   const handleAddDialogClose = (refreshNeeded) => {
     setOpenAdd(false);
     if (refreshNeeded) {
       fetchScientificNames();
     }
   };

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h2" sx={{ color: theme.palette.primary.main, mb: 2 }}>
          Scientific Name Data Console
        </Typography>

        <TextField label="Search by any field..." value={keyword} onChange={handleSearch} fullWidth variant="outlined" />

        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)} sx={{ alignSelf: 'flex-start' }}>
          Add Scientific Name
        </Button>

        <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    style={{ minWidth: col.minWidth, whiteSpace: 'nowrap' }}
                    sortDirection={orderBy === col.id ? order : false}
                    sx={{
                        ...(col.sticky === 'left' && {
                            position: 'sticky',
                            left: 0,
                            zIndex: theme.zIndex.appBar + 2,
                            backgroundColor: '#1E1E1E',
                            borderRight: `1px solid ${theme.palette.divider}`,
                        }),
                        ...(col.sticky === 'right' && {
                            position: 'sticky',
                            right: 0,
                            zIndex: theme.zIndex.appBar + 2,
                            backgroundColor: '#1E1E1E',
                             borderLeft: `1px solid ${theme.palette.divider}`,
                        }),
                    }}
                  >
                    {col.sticky || col.sortable === false ? (
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
              {sortedFiltered.map((sn) => (
                <TableRow key={sn.id} hover>
                  {columns.map((col) => {
                      const stickyStyles = {
                          ...(col.sticky === 'left' && {
                              position: 'sticky',
                              left: 0,
                              zIndex: theme.zIndex.appBar + 1,
                              backgroundColor: theme.palette.background.paper,
                              borderRight: `1px solid ${theme.palette.divider}`,
                          }),
                          ...(col.sticky === 'right' && {
                              position: 'sticky',
                              right: 0,
                              zIndex: theme.zIndex.appBar + 1,
                              backgroundColor: theme.palette.background.paper,
                              borderLeft: `1px solid ${theme.palette.divider}`,
                          }),
                      };

                    if (col.id === 'actions') {
                      return (
                        <TableCell key="actions" sx={stickyStyles}>
                          <IconButton onClick={() => setEditTarget(sn)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      );
                    }
                    if (col.id === 'authority') {
                      const authorityStr = generateAuthorityString(sn.scientific_name_and_author);
                      return ( <TableCell key={col.id} sx={{ ...stickyStyles, fontFamily: 'monospace' }}>{authorityStr}</TableCell> );
                    }
                    if (col.id === 'remark') {
                        const remarkValue = sn.remark || sn.Remark || "";
                        return ( <TableCell key={col.id} sx={{ ...stickyStyles, fontFamily: 'monospace' }}>{remarkValue || "—"}</TableCell> );
                    }
                    if (col.id === 'last_update' && sn.last_update) {
                        try {
                            const date = new Date(sn.last_update);
                            const formattedDate = date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                             return ( <TableCell key={col.id} sx={{ ...stickyStyles, fontFamily: 'monospace' }}>{formattedDate}</TableCell> );
                        } catch (e) { /* fallback */ }
                    }

                    const cellValue = sn[col.id] ?? "";
                    return (
                      <TableCell key={col.id} sx={{ ...stickyStyles, fontFamily: 'monospace' }}>
                        {cellValue === null || cellValue === "" ? "—" : String(cellValue)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {editTarget && (
          <DialogScientificNameEdit
            scientificName={editTarget}
            onClose={handleEditDialogClose}
          />
        )}

        {openAdd && (
          <DialogScientificNameAdd
            onClose={handleAddDialogClose}
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}