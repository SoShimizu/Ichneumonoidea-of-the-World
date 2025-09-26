import React, { useState, useEffect, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, TextField, IconButton, Button,
  createTheme, ThemeProvider, Stack, TableSortLabel,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

// ダイアログをインポート (パスは実プロジェクトに合わせて！)
import DialogScientificNameEdit from "../Dialogs/DialogScientificNameEdit";
import DialogScientificNameAdd from "../Dialogs/DialogScientificNameAdd/DialogScientificNameAdd";
import fetchSupabaseAllWithOrdering from "../../../../utils/fetchSupabaseAllWithOrdering";

// ダークテーマとスタイル調整
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#000000', paper: '#121212' },
    primary: { main: '#7FFFD4' }, // Aquamarine
    secondary: { main: '#FF6347' }, // Tomato
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
        // ★★★ Stickyカラム用のスタイル ★★★
        stickyHeader: { // ヘッダーの固定セル用 (MUIデフォルトで適用されることが多い)
            backgroundColor: '#1E1E1E', // ヘッダー背景色と同じに
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { color: '#7FFFD4' } } },
    MuiTextField: { styleOverrides: { root: { '& label': { color: '#B0B0B0' }, '& label.Mui-focused': { color: '#7FFFD4' }, '& .MuiInputBase-input': { color: '#FFFFFF' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#424242' }, '&:hover fieldset': { borderColor: '#7FFFD4' }, '&.Mui-focused fieldset': { borderColor: '#7FFFD4' } } } } },
    MuiButton: { styleOverrides: { outlinedPrimary: { color: '#7FFFD4', borderColor: '#7FFFD4' } } },
    MuiTableSortLabel: { styleOverrides: { root: { color: '#7FFFD4', '&.Mui-active': { color: '#7FFFD4' }, '&:hover': { color: '#FFFFFF' } }, icon: { color: '#7FFFD4 !important' } } }
  },
});

// ★★★ カラム定義を関連性のある順に並び替え ★★★
const columns = [
  // 基本情報 & 名前
  { id: 'id',                      label: 'ID',                   minWidth: 150, sticky: 'left' }, // 左端固定
  { id: 'name_spell_valid',        label: 'Valid Name',           minWidth: 150 },
  { id: 'name_spell_original',     label: 'Original Spelling',    minWidth: 150 },
  { id: 'authority',               label: 'Authority',            minWidth: 150, sortable: false },
  { id: 'authority_year',          label: 'Auth. Year',           minWidth: 100 },
  // ランク & 親子関係
  { id: 'current_rank',            label: 'Current Rank',         minWidth: 120 },
  { id: 'current_parent',          label: 'Current Parent',       minWidth: 150 },
  { id: 'original_rank',           label: 'Original Rank',        minWidth: 120 },
  { id: 'original_parent',         label: 'Original Parent',      minWidth: 150 },
  // ステータス & 関係性
  { id: 'valid_name_id',           label: 'Valid Name ID',        minWidth: 150 },
  { id: 'type_taxa_id',            label: 'Type Taxa ID',         minWidth: 150 },
  { id: 'extant_fossil',           label: 'Extant/Fossil',        minWidth: 120 },
  // タイプ情報
  { id: 'type_category', label: 'Type Category', minWidth: 140 },
  { id: 'type_locality',           label: 'Type Locality',        minWidth: 140 },
  { id: 'type_sex',                label: 'Type Sex',             minWidth: 100 },
  { id: 'type_repository',         label: 'Type Repository',      minWidth: 140 },
  { id: 'type_host',               label: 'Type Host',            minWidth: 140 },
  // 出典情報 & その他
  { id: 'source_of_original_description', label: 'Source',        minWidth: 150 },
  { id: 'page',                    label: 'Page',                 minWidth: 80  },
  { id: 'remark',                  label: 'Remark',               minWidth: 200 },
  { id: 'last_update',             label: 'Last Update',          minWidth: 160 },
  // アクション
  { id: 'actions',                 label: 'Actions',              minWidth: 80, sortable: false, sticky: 'right' }, // 右端固定
];

// ▼ ソート用関数 (変更なし)
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

// ▼ Authority文字列生成関数 (変更なし)
const generateAuthorityString = (authorsData) => {
    if (!authorsData || authorsData.length === 0) return "—";
    const authors = authorsData.map(item => item.authors).filter(author => author && author.last_name_eng);
    if (authors.length === 0) return "—";
    const authorNames = authors.map(a => a.last_name_eng);
    if (authorNames.length <= 3) { return authorNames.join(", "); }
    return `${authorNames.slice(0, 3).join(", ")} et al.`;
};


export default function ConsoleScientificName() {
  const [scientificNames, setScientificNames] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name_spell_valid');

  // ▼ scientific_names一覧を取得（Authority情報も含む）(変更なし)
  const fetchScientificNames = async () => {
    console.log("Fetching scientific names..."); // 実行確認用ログ
    const data = await fetchSupabaseAllWithOrdering({
      tableName: "scientific_names",
        selectQuery: `
          *,
          scientific_name_and_author(
            author_order,
            authors:author_id (
              id,
              last_name_eng,
              first_name_eng
            )
          )
        `,
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
        console.log(`Workspaceed ${data.length} scientific names.`); // 件数ログ
      setScientificNames(data);
    }
  };

  useEffect(() => {
    fetchScientificNames();
  }, []);

  const handleSearch = (e) => { setKeyword(e.target.value); };

  const handleRequestSort = (colId) => {
    const columnDefinition = columns.find(c => c.id === colId);
    if (!columnDefinition || columnDefinition.sortable === false || columnDefinition.sticky) { // 固定列もソート不可にする
        return;
    }
    const isAsc = orderBy === colId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(colId);
  };

  // ▼ 検索 (変更なし)
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

  // ▼ ソート (変更なし)
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort(getComparator(order, orderBy));
  }, [filtered, order, orderBy]);

  // ★★★ 編集ダイアログの onClose ハンドラ ★★★
  const handleEditDialogClose = (refreshNeeded, updatedData) => {
    setEditTarget(null); // ダイアログを閉じる
    if (refreshNeeded) {
        if (updatedData) {
            // ★ オプション: State を直接更新して即時反映 (データ再取得より高速)
            console.log("Updating state with edited data:", updatedData);
            // Authority情報を付与する必要があるため、updatedDataに必要な情報が含まれているか確認
            // もしupdatedDataにAuthority情報がなければ、fetchの方が安全
             const updatedItem = {
                 ...updatedData,
                 // generateAuthorityStringに必要なデータ構造を再現 or fetchを呼ぶ
                 // DialogEdit側でAuthority情報を返せるように修正するのがベスト
                 scientific_name_and_author: editTarget?.scientific_name_and_author // 古いデータで一旦代用 (要改善)
             };
            setScientificNames(prev =>
                prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            );
             // 代わりに fetchScientificNames() を呼ぶ場合:
             // console.log("Changes detected, refreshing data...");
             // fetchScientificNames();
        } else {
             // updatedData がない場合は安全に fetch
             console.log("Changes detected (no specific data passed), refreshing data...");
            fetchScientificNames();
        }
    } else {
        console.log("Edit dialog closed without changes.");
    }
  };

   // ★★★ 追加ダイアログの onClose ハンドラ ★★★
   const handleAddDialogClose = (refreshNeeded) => {
     setOpenAdd(false);
     if (refreshNeeded) {
       console.log("New item added, refreshing data...");
       fetchScientificNames(); // 追加後はデータ全体を再取得するのが確実
     } else {
       console.log("Add dialog closed without adding.");
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

        {/* ★★★ TableContainer でコンテナのスタイルを指定 ★★★ */}
        <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}> {/* 横スクロール可能に */}
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    style={{ minWidth: col.minWidth, whiteSpace: 'nowrap' }}
                    sortDirection={orderBy === col.id ? order : false}
                    // ★★★ Sticky カラムのスタイル適用 ★★★
                    sx={{
                        ...(col.sticky === 'left' && {
                            position: 'sticky',
                            left: 0,
                            zIndex: theme.zIndex.appBar + 2, // ヘッダーより手前に
                            // backgroundColor: theme.palette.background.paper, // テーブル背景と同じ色
                            // ↓ Head用に濃い色を指定
                            backgroundColor: '#1E1E1E',
                            borderRight: `1px solid ${theme.palette.divider}`, // 区切り線
                        }),
                        ...(col.sticky === 'right' && {
                            position: 'sticky',
                            right: 0,
                            zIndex: theme.zIndex.appBar + 2,
                            // backgroundColor: theme.palette.background.paper,
                             backgroundColor: '#1E1E1E',
                             borderLeft: `1px solid ${theme.palette.divider}`, // 区切り線
                        }),
                    }}
                  >
                    {col.sticky || col.sortable === false ? ( // 固定列もソートラベルなし
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
                     // ★★★ Sticky カラムのスタイル適用 (Body) ★★★
                     const stickyStyles = {
                        ...(col.sticky === 'left' && {
                            position: 'sticky',
                            left: 0,
                            zIndex: theme.zIndex.appBar + 1, // 通常セルより手前
                            backgroundColor: theme.palette.background.paper, // テーブル背景と同じ
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
                        <TableCell key="actions" sx={stickyStyles}> {/* Sticky スタイル適用 */}
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

                    // その他の通常のカラム
                    const cellValue = sn[col.id] ?? "";
                    return (
                      <TableCell key={col.id} sx={{ ...stickyStyles, fontFamily: 'monospace' }}> {/* Sticky スタイル適用 */}
                        {cellValue === null || cellValue === "" ? "—" : String(cellValue)}
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
          <DialogScientificNameEdit
            scientificName={editTarget}
            // ★★★ 修正した onClose ハンドラを渡す ★★★
            onClose={handleEditDialogClose}
          />
        )}

        {/* --- 新規追加ダイアログ --- */}
        {openAdd && (
          <DialogScientificNameAdd
             // ★★★ 修正した onClose ハンドラを渡す ★★★
            onClose={handleAddDialogClose}
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}