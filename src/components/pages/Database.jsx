// Database.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../../utils/supabase"; // パス確認
import {
  Container,
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Stack, TextField, Select, MenuItem, Button, Dialog, DialogTitle, DialogContent,
  Typography, IconButton, TableSortLabel, CircularProgress, Alert, AlertTitle,
  InputAdornment
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from '@mui/icons-material/Search';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// ★ Dialogs (詳細表示コンポーネント) をインポート
import DialogDisplayPublicationDetails from "../Dialogs/DialogDisplayPublicationDetails";
import DialogDisplayScientificNameDetails from "../Dialogs/DialogDisplayScientificNameDetails/DialogDisplayScientificNameDetails";
import fetchSupabaseAll from "../../utils/fetchSupabaseAll";

// ダークテーマの定義
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7fffd4' },
    background: { default: '#000000', paper: '#1a1a1a' },
    text: { primary: '#e0e0e0', secondary: '#b0bec5' },
    action: { active: '#7fffd4' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 700 },
    h4: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(127, 255, 212, 0.3)',
          borderRadius: '12px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& label.Mui-focused': { color: theme.palette.primary.main },
          '& .MuiInputLabel-root': { color: theme.palette.text.secondary },
          '& .MuiOutlinedInput-root': {
            color: theme.palette.text.primary,
            '& fieldset': {
              borderColor: 'rgba(127, 255, 212, 0.5)',
            },
            '&:hover fieldset': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
          '& .MuiSvgIcon-root': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(127, 255, 212, 0.5)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '& .MuiSvgIcon-root': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.hover,
          },
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          borderColor: 'rgba(127, 255, 212, 0.2)',
        }),
        head: ({ theme }) => ({
          color: theme.palette.primary.main,
          fontWeight: 'bold',
        }),
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: `${theme.palette.primary.main} !important`,
          '&:hover': { color: theme.palette.primary.light },
          '&.Mui-active': { color: `${theme.palette.primary.light} !important` },
        }),
        icon: ({ theme }) => ({
          color: `${theme.palette.primary.main} !important`,
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.primary.main}`,
          borderRadius: '12px',
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
            width: '8px',
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
            border: "1px solid #2b2b2b",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
        },
      },
    },
  },
});

// Helper to remove HTML tags
const stripHtml = (html) => html ? String(html).replace(/<\/?[^>]+(>|$)/g, "") : "";

export default function Database() {
  const [searchType, setSearchType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]); // 検索結果
  const [selectedRow, setSelectedRow] = useState(null); // ダイアログ表示用
  const [orderBy, setOrderBy] = useState("display");
  const [order, setOrder] = useState("asc");
  const [loading, setLoading] = useState(true); 
  const [initialLoadError, setInitialLoadError] = useState(null); 
  const [searching, setSearching] = useState(false);

  // ★★ 全件データを保持する State ★★
  const [allScientificNames, setAllScientificNames] = useState([]);
  const [allAuthorsData, setAllAuthorsData] = useState([]); // scientific_name_and_author
  const [allPublications, setAllPublications] = useState([]); // publications + join

  // 初回データロード (学名・著者・文献)
  useEffect(() => {
    const fetchInitialData = async () => {
      console.log("[Database] Fetching initial data...");
      setLoading(true);
      setInitialLoadError(null);
      try {
        const namesRes = await fetchSupabaseAll("scientific_names", `*`);
        const authorsRes = await fetchSupabaseAll("scientific_name_and_author", `
                    *, author:author_id (id, first_name_eng, last_name_eng)
        `);
        const [pubsRes] = await Promise.all([
          supabase
            .from("publications")
            .select(`*, 
              journal:journal_id(*),
              publications_authors(
                author_order,
                author:author_id(*)
              )
            `),
        ]);

        const errors = [namesRes.error, authorsRes.error, pubsRes.error].filter(Boolean);
        if (errors.length > 0) {
          console.error("Fetch errors:", errors);
          throw new Error(errors.map(e => e.message).join("; "));
        }

        const validNames = (namesRes || []).filter(d => d && d.id);
        const validAuthorsRel = (authorsRes || []).filter(d => d && d.scientific_name_id && d.author);
        const pubsData = pubsRes.data || [];

        setAllScientificNames(validNames);
        setAllAuthorsData(validAuthorsRel);
        setAllPublications({ data: pubsData }); // ★ ここで {data: [...]} の形に合わせる

        console.log(`[Database] Fetched: ${validNames.length} names, ${validAuthorsRel.length} name-authors rel, ${pubsData.length} publications.`);
      } catch (error) {
        console.error("[Database] Failed to load initial data:", error);
        setInitialLoadError(error.message || "Failed to load initial data.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 検索関連
  const fetchData = useCallback(async () => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    if (allScientificNames.length === 0) {
      console.log("[Database] No name data yet to search in local...");
      return;
    }
    console.log(`[Database] Searching for "${keyword}" in "${searchType}"...`);
    setSearching(true);

    let combinedResults = [];
    let fetchError = null;
    const trimmed = keyword.trim().toLowerCase();

    try {
      const searchPromises = [];

      // --- 1) scientific_names: ローカルフィルタ
      if (searchType === "all" || searchType === "scientific_name") {
        const filteredNames = allScientificNames.filter(
          (item) =>
            item.name_spell_valid?.toLowerCase().includes(trimmed) ||
            item.id?.toLowerCase().includes(trimmed) ||
            item.current_parent?.toLowerCase().includes(trimmed)
        );
        if (filteredNames.length > 0) {
          combinedResults.push(
            ...filteredNames.map((d) => ({ ...d, type: "scientific_name" }))
          );
        }
        console.log(`[Database] Found ${filteredNames.length} matching scientific_names.`);
      }

      // --- 2) publications
      if (searchType === "all" || searchType === "publications") {
        searchPromises.push(
          supabase
            .from("publications")
            .select(`*, 
              journal:journal_id(*),
              publications_authors(
                author_order,
                author:author_id(*)
              )
            `)
            .or(`title_english.ilike.%${trimmed}%,title_original.ilike.%${trimmed}%,abstract_english.ilike.%${trimmed}%,abstract_other.ilike.%${trimmed}%`)
            .then(({ data, error }) => {
              if (error) throw error;
              if (data) combinedResults.push(...data.map(d => ({ ...d, type: "publications" })));
              console.log(`[Database] Found ${data?.length ?? 0} matching publications from Supabase search.`);
            })
        );
      }

      // --- 3) authors
      if (searchType === "all" || searchType === "author") {
        searchPromises.push(
          supabase
            .from("authors")
            .select("*")
            .or(`last_name_eng.ilike.%${trimmed}%,first_name_eng.ilike.%${trimmed}%`)
            .then(({ data, error }) => {
              if (error) throw error;
              if (data) combinedResults.push(...data.map(d => ({ ...d, type: "author" })));
              console.log(`[Database] Found ${data?.length ?? 0} matching authors.`);
            })
        );
      }

      // --- 4) distribution
      if (searchType === "all" || searchType === "distribution") {
        searchPromises.push(
          supabase
            .from("distribution")
            .select("*")
            .ilike("region", `%${trimmed}%`)
            .then(({ data, error }) => {
              if (error) throw error;
              if (data) combinedResults.push(...data.map(d => ({ ...d, type: "distribution" })));
              console.log(`[Database] Found ${data?.length ?? 0} matching distributions.`);
            })
        );
      }

      // 実行待ち
      await Promise.all(searchPromises);

    } catch (error) {
      console.error("Search error:", error);
      fetchError = error;
    } finally {
      setResults(combinedResults);
      setSearching(false);
      console.log(`[Database] Search done. total: ${combinedResults.length}`);
      if (fetchError) {
        // 画面にエラー表示するなど
      }
    }
  }, [keyword, searchType, allScientificNames]);

  // 検索トリガー
  useEffect(() => {
    if (!loading && allScientificNames.length > 0) {
      const debounce = setTimeout(() => {
        fetchData();
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [keyword, searchType, fetchData, loading, allScientificNames]);

  // ソート
  const handleSort = useCallback((col) => {
    if (col === orderBy) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(col);
      setOrder("asc");
    }
  }, [orderBy, order]);

  // 表示ラベル
  const typeLabels = {
    scientific_name: "Scientific Name",
    publications: "Publication",
    author: "Author",
    distribution: "Distribution",
  };

  // DisplayName 生成
  const getDisplayName = useCallback((row) => {
    if (row.type === "publications") {
      const title = row.title_english || row.title_original || "No Title";
      const journal = row.journal?.name_english || "No Journal";
      // 著者
      const authors = (row.publications_authors || [])
        .sort((a, b) => (a.author_order ?? 99) - (b.author_order ?? 99))
        .map(rel => rel.author);
      let authorText = "";
      if (authors.length > 0) {
        const shown = authors.slice(0, 3).map(a => a ? `${a.last_name_eng || ''}, ${a.first_name_eng || ''}`.trim() : 'N/A');
        authorText = shown.filter(n => n !== 'N/A').join("; ");
        if (authors.length > 3) authorText += `; et al. (${authors.length})`;
      }
      return `<div style="line-height:1.4;">
        <div style="font-weight:bold; font-size:1.1rem;">${stripHtml(title)}</div>
        <div style="font-style:italic; font-size:0.95rem;">${stripHtml(journal)}</div>
        <div style="font-size:0.9rem;">${stripHtml(authorText)}</div>
      </div>`;
    }

    if (row.type === "scientific_name") {
      const parent = allScientificNames.find(p => p && row && p.id === row.original_parent);
      return `<div style="line-height:1.4;">
        <div style="font-weight:bold; font-size:1.1rem;">${stripHtml(row.name_spell_valid)}</div>
        <div style="font-size:0.9rem;">Current Rank: <b>${stripHtml(row.current_rank)}</b></div>
        <div style="font-size:0.9rem;">Original Parent: <b>${parent ? stripHtml(parent.name_spell_valid) : "N/A"}</b></div>
      </div>`;
    }

    if (row.type === "author") {
      // 例
      return `<div><b>${stripHtml(row.last_name_eng || "no name")}, ${stripHtml(row.first_name_eng || "")}</b></div>`;
    }

    if (row.type === "distribution") {
      return `<div><b>${stripHtml(row.region || "")}</b><div>(${stripHtml(row.country || "")})</div></div>`;
    }

    return stripHtml(row.name || row.region || "No Data");
  }, [allScientificNames]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aVal = stripHtml(getDisplayName(a)) || "";
      const bVal = stripHtml(getDisplayName(b)) || "";
      if (orderBy === "display") {
        return order === "asc"
          ? aVal.localeCompare(bVal, undefined, { sensitivity: "base" })
          : bVal.localeCompare(aVal, undefined, { sensitivity: "base" });
      }
      return 0;
    });
  }, [results, order, orderBy, getDisplayName]);

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: '100vh', bgcolor: 'background.default'
          }}
        >
          <CircularProgress color="primary" />
          <Typography sx={{ ml: 2 }}>Loading Initial Data...</Typography>
        </Box>
      </ThemeProvider>
    );
  }
  if (initialLoadError) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ py: 5 }}>
          <Alert severity="error" icon={<ErrorOutlineIcon/>}>
            <AlertTitle>Error Loading Data</AlertTitle>
            {initialLoadError}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ p: 3, minHeight: "100vh" }}>
        <Typography variant="h2" sx={{ mb: 2, textAlign: "center", color: 'primary.main' }}>
          DATABASE
        </Typography>

        {/* Search UI */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          mb={3}
          justifyContent="center"
          alignItems="center"
        >
          <TextField
            label="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            size="small"
            variant="outlined"
            sx={{ minWidth: { xs: '100%', sm: 200 } }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="scientific_name">Scientific Names</MenuItem>
            <MenuItem value="publications">Publications</MenuItem>
            <MenuItem value="author">Authors</MenuItem>
            <MenuItem value="distribution">Distributions</MenuItem>
          </Select>

          {searching && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Stack>

        {/* 検索結果件数 */}
        {!searching && keyword.trim() && (
          <Typography variant="subtitle1" sx={{ mb: 2, textAlign: "center" }}>
            {results.length} results found for "{keyword.trim()}"
          </Typography>
        )}

        {/* 表データ */}
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '20%' }}>Type</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "display"}
                    direction={order}
                    onClick={() => handleSort("display")}
                  >
                    Data Summary
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 検索結果が0件 */}
              {!searching && results.length === 0 && keyword.trim() && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No results found.</Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* 検索結果 */}
              {sortedResults.map((row, i) => (
                <TableRow
                  key={row.id || `row-${i}`}
                  hover
                  onClick={() => setSelectedRow(row)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <strong>{typeLabels[row.type] || row.type}</strong>
                  </TableCell>
                  <TableCell>
                    <span dangerouslySetInnerHTML={{ __html: getDisplayName(row) }} />
                  </TableCell>
                </TableRow>
              ))}

              {/* 検索中 */}
              {searching && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={30} />
                    <Typography sx={{ mt: 1 }}>Searching...</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 詳細ダイアログ */}
        <Dialog
          open={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h4">Details</Typography>
            <IconButton onClick={() => setSelectedRow(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedRow?.type === "publications" ? (
              <DialogDisplayPublicationDetails publication={selectedRow} />
            ) : selectedRow?.type === "scientific_name" ? (
              <DialogDisplayScientificNameDetails
                initialScientificName={selectedRow}
                allScientificNames={allScientificNames}
                scientificNameAuthors={allAuthorsData}
                allReferences={allPublications}
                                  allTaxonomicActs={[]} 
                // 必要なら全TaxonomicActsを渡す
              />
            ) : (
              // その他タイプ(配列の場合など)
              <Typography
                variant="body2"
                component="pre"
                sx={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                {JSON.stringify(selectedRow, null, 2)}
              </Typography>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
