import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Container,
  Autocomplete,
  TextField,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Alert,
  AlertTitle,
  InputAdornment,
  CssBaseline,
  ThemeProvider,
  createTheme
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScienceIcon from '@mui/icons-material/Science';

import supabase from "../../utils/supabase";
import TaxonomicTree from "../Dialogs/TaxonomicTree";
import DialogDisplayScientificNameDetails from "../Dialogs/DialogDisplayScientificNameDetails/DialogDisplayScientificNameDetails";
import fetchSupabaseAll from "../../utils/fetchSupabaseAll";

// --- ダークテーマ定義 ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7fffd4' },
    background: { default: '#000000', paper: '#1a1a1a' },
    text: { primary: '#e0e0e0', secondary: '#b0bec5' },
    action: { active: '#7fffd4' },
  },
  typography: {
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    h3: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(127,255,212,0.3)',
          borderRadius: '12px',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          border: '1px solid rgba(127,255,212,0.5)',
          borderRadius: '8px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(127,255,212,0.5)',
          color: '#7fffd4',
          '&:hover': {
            backgroundColor: 'rgba(127,255,212,0.1)',
            borderColor: '#7fffd4',
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '16px',
          border: '1px solid rgba(127,255,212,0.4)',
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(127,255,212,0.2)',
        }
      }
    }
  },
});

export default function Taxonomy() {
  const [allScientificNames, setAllScientificNames] = useState([]);
  const [scientificNameAuthors, setScientificNameAuthors] = useState([]);
  const [allTaxonomicActs, setAllTaxonomicActs] = useState([]);
  const [allReferences, setAllReferences] = useState({ data: [] });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState(null);
  const [selectedScientificName, setSelectedScientificName] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const resultsContainerRef = useRef(null);

  // Autocomplete 用
  const nameOptions = useMemo(() => {
    if (!allScientificNames.length) return [];
    const uniqueNames = [...new Set(
      allScientificNames
        .map(sn => sn?.name_spell_valid)
        .filter(Boolean)
    )];
    return uniqueNames.sort((a, b) => a.localeCompare(b));
  }, [allScientificNames]);

  // 初期データ取得
  useEffect(() => {
    (async () => {
      setLoading(true);
      setInitialLoadError(null);

      try {
        const namesRes = await fetchSupabaseAll("scientific_names", "*");

        // ▼▼▼ ここから修正 ▼▼▼
        // `first_name_eng`, `last_name_eng` を `first_name`, `last_name` に修正
        const authorsRes = await fetchSupabaseAll("scientific_name_and_author", `
            *, researchers:researcher_id (id, first_name, last_name)
          `);
        
        const [actsRes, pubsRes] = await Promise.all([
          supabase.from("taxonomic_acts").select("*"),
          supabase.from("publications").select(`
            *, journal:journal_id(*),
            publications_authors(author_order, author:researcher_id(id, first_name, last_name))
          `),
        ]);
        // ▲▲▲ ここまで修正 ▲▲▲

        const errors = [
          namesRes.error,
          authorsRes.error,
          actsRes.error,
          pubsRes.error
        ].filter(Boolean);
        if (errors.length) throw new Error(errors.map(e => e.message).join("; "));

        setAllScientificNames(namesRes);
        setScientificNameAuthors(authorsRes);
        setAllTaxonomicActs(actsRes.data);
        setAllReferences({ data: pubsRes.data });

        if (namesRes.length) {
          const def = namesRes.find(n =>
            n.name_spell_valid?.includes("Ichneumonoidea")
          ) || namesRes[0];
          setSelectedScientificName(def);
        }
      } catch (err) {
        setInitialLoadError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // サーチ選択
  const handleSearchChange = useCallback((_, newValue) => {
    if (typeof newValue === "string") {
      const found = allScientificNames.find(
        sn => sn.name_spell_valid === newValue
      );
      if (found) {
        setSelectedScientificName(found);
        setIsInitialLoad(false);
      }
    }
  }, [allScientificNames]);

  // ノードクリック
  const handleOpenDialog = useCallback(node => {
    setDialogData(node);
    setDialogOpen(true);
  }, []);
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogData(null);
  }, []);

  // 自動スクロール
  useEffect(() => {
    if (
      !loading &&
      !isInitialLoad &&
      selectedScientificName &&
      resultsContainerRef.current
    ) {
      resultsContainerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedScientificName, loading, isInitialLoad]);

  // ローディング or エラー
  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
          }}
        >
          <CircularProgress color="primary" size={60} />
          <Typography sx={{ mt: 2, color: "text.secondary" }}>
            Loading Taxonomic Data...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
  if (initialLoadError) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ py: 5, textAlign: "center" }}>
          <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />}>
            <AlertTitle>Error Loading Data</AlertTitle>
            {initialLoadError}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  // 本体レンダリング
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* ヘッダー */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1}
          sx={{ mb: 5 }}
        >
          <ScienceIcon sx={{ fontSize: "2.5rem", color: "primary.main" }} />
          <Typography variant="h3">Taxonomy Explorer</Typography>
        </Stack>

        {/* 検索バー */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 4,
            position: "sticky",
            top: 10,
            zIndex: 1100,
            backgroundColor: "rgba(26,26,26,0.9)",
          }}
        >
          <Stack direction="row" justifyContent="center">
            <Autocomplete
              sx={{ width: { xs: "100%", sm: 500, md: 600 } }}
              options={nameOptions}
              value={selectedScientificName?.name_spell_valid || null}
              onChange={handleSearchChange}
              getOptionLabel={(opt) => opt || ""}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search or Select Taxon"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: "primary.main", mr: 0.5 }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Stack>
        </Paper>

        {/* 分類ツリー */}
        <Box ref={resultsContainerRef} sx={{ pt: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <AccountTreeIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6">Taxonomic Tree</Typography>
          </Stack>
          <Divider sx={{ mb: 3 }} />

          {selectedScientificName ? (
            <Paper
              elevation={2}
              sx={{
                p: { xs: 1, sm: 2 },
                overflow: "auto",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              <TaxonomicTree
                rootScientificName={selectedScientificName}
                allScientificNames={allScientificNames}
                scientificNameAuthors={scientificNameAuthors}
                highlightId={selectedScientificName.id}
                onSelectScientificName={handleOpenDialog}
              />
            </Paper>
          ) : (
            <Typography
              color="text.secondary"
              textAlign="center"
              sx={{ my: 5 }}
            >
              No taxon selected. Please use the search bar above.
            </Typography>
          )}
        </Box>
      </Container>

      {/* 詳細ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle
          sx={{
            bgcolor: "background.paper",
            borderBottom: "1px solid rgba(127,255,212,0.2)",
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Scientific Name Details</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {dialogData ? (
            <DialogDisplayScientificNameDetails
              initialScientificName={dialogData}
              allScientificNames={allScientificNames}
              scientificNameAuthors={scientificNameAuthors}
              allTaxonomicActs={allTaxonomicActs}
              allReferences={allReferences}
            />
          ) : (
            <Typography color="text.secondary" align="center">
              No data to display.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            bgcolor: "background.paper",
            borderTop: "1px solid rgba(127,255,212,0.2)",
          }}
        >
          <Button onClick={handleCloseDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}