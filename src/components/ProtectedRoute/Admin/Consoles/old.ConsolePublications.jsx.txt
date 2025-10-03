import React, { useState, useEffect, useMemo } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, TextField, IconButton, Button,
  Chip, createTheme, ThemeProvider, Stack, TableSortLabel,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import supabase from "../../../../utils/supabase";
import DialogPublicationEdit from "../Dialogs/DialogPublicationEdit";
import DialogPublicationAdd from "../Dialogs/DialogPublicationAdd";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#000000", paper: "#121212" },
    primary: { main: "#7FFFD4" },
    text: { primary: "#FFFFFF", secondary: "#B0B0B0" }, // Text color updated for better contrast
  },
});

// ---------------- columns ----------------
const columns = [
  { id: "id", label: "ID", minWidth: 150, maxWidth: 150 },
  { id: "scientific_name_status", label: "Sci. Name?", minWidth: 180 },
  { id: "taxonomic_act_status", label: "Tax. Act?", minWidth: 180 },
  { id: "distribution_status", label: "Dist.?", minWidth: 180 },
  { id: "ecological_data_status", label: "Ecol.?", minWidth: 180 },
  { id: "authors", label: "Authors", minWidth: 180 },
  { id: "title_english", label: "Title (English)", minWidth: 220 },
  { id: "title_original", label: "Title (Original)", minWidth: 220 },
  { id: "journal", label: "Journal", minWidth: 120 },
  { id: "doi", label: "DOI", minWidth: 120 },
  { id: "volume", label: "Vol.", minWidth: 60 },
  { id: "number", label: "No.", minWidth: 60 },
  { id: "article_id", label: "Article ID", minWidth: 80 },
  { id: "page", label: "Pages", minWidth: 80 },
  { id: "publication_date", label: "Date", minWidth: 100 },
  { id: "is_open_access", label: "Open Access", minWidth: 90 },
  { id: "actions", label: "Actions", minWidth: 80, sortable: false },
];

// ---------- helper : status → colored Chip ----------
const renderStatusChip = (label) => {
  const map = {
    complete: "success",
    in_progress: "warning",
    not_yet: "error",
  };
  const color = map[label] || undefined;
  return label ? <Chip label={label} color={color} size="small" /> : "―";
};

// ---------------- sort helpers ----------------
function descendingComparator(a, b, orderBy) {
  const getVal = (item, key) => {
    if (key === "journal") return item.journal?.name_english || "";
    // ▼▼▼ 修正点 1: ソートロジックを修正 ▼▼▼
    if (key === "authors")
      return (item.authors || []).map((a) => a.last_name).join(", ");
    // ▲▲▲ 修正点 1 ▲▲▲
    if (key === "scientific_name_status")
      return item.scientific_name_status_obj?.name || item.scientific_name_status || "";
    if (key === "taxonomic_act_status")
      return item.taxonomic_act_status_obj?.name || item.taxonomic_act_status || "";
    if (key === "distribution_status")
      return item.distribution_status_obj?.name || item.distribution_status || "";
    if (key === "ecological_data_status")
      return item.ecological_data_status_obj?.name || item.ecological_data_status || "";
    return item[key] || "";
  };
  const av = getVal(a, orderBy);
  const bv = getVal(b, orderBy);
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

const getComparator = (order, orderBy) =>
  order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);

// ================= component =================
export default function ConsolePublications() {
  const [publications, setPublications] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("publication_date");

  const fetchPublications = async () => {
    // ▼▼▼ 修正点 2: データ取得クエリを修正 ▼▼▼
    const { data, error } = await supabase
      .from("publications")
      .select(
        `
        *,
        journal:journal_id(id,name_english),
        scientific_name_status_obj:scientific_name_status(*),
        taxonomic_act_status_obj:taxonomic_act_status(*),
        distribution_status_obj:distribution_status(*),
        ecological_data_status_obj:ecological_data_status(*),
        publications_authors (
          researcher_id,
          author_order,
          author:researcher_id (id, last_name, first_name)
        )
      `
      )
      .order("publication_date", { ascending: false });
    // ▲▲▲ 修正点 2 ▲▲▲

    if (!error && data) {
      setPublications(
        data.map((pub) => ({
          ...pub,
          authors: (pub.publications_authors || [])
            .sort((a, b) => a.author_order - b.author_order)
            .map((pa) => pa.author),
        }))
      );
    }
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const handleSearch = (e) => setKeyword(e.target.value);
  const handleRequestSort = (colId) => {
    const isAsc = orderBy === colId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(colId);
  };

  const renderCellContent = (pub, col) => {
    switch (col.id) {
      case "id": return pub.id;
      case "scientific_name_status": return renderStatusChip(pub.scientific_name_status_obj?.name || pub.scientific_name_status);
      case "taxonomic_act_status": return renderStatusChip(pub.taxonomic_act_status_obj?.name || pub.taxonomic_act_status);
      case "distribution_status": return renderStatusChip(pub.distribution_status_obj?.name || pub.distribution_status);
      case "ecological_data_status": return renderStatusChip(pub.ecological_data_status_obj?.name || pub.ecological_data_status);
      // ▼▼▼ 修正点 3: 著者名表示を修正 ▼▼▼
      case "authors":
        return pub.authors?.length ? (
          <ol style={{ margin: 0, paddingLeft: "1em" }}>
            {pub.authors.map((a, i) => (
              a && <li key={i}>{a.last_name}, {a.first_name}</li>
            ))}
          </ol>
        ) : ("―");
      // ▲▲▲ 修正点 3 ▲▲▲
      case "title_english": return pub.title_english || "―";
      case "title_original": return pub.title_original || "―";
      case "journal": return <i>{pub.journal?.name_english || "―"}</i>;
      case "doi":
        return pub.doi ? (
          <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" style={{ color: "#7FFFD4" }}>{pub.doi}</a>
        ) : ("―");
      case "volume": return pub.volume || "―";
      case "number": return pub.number || "―";
      case "article_id": return pub.article_id || "―";
      case "page": return pub.page || "―";
      case "publication_date": return pub.publication_date?.slice(0, 10) || "―";
      case "is_open_access":
        return pub.is_open_access ? (
          <Chip label="Open" color="success" size="small" />
        ) : (
          <Chip label="Restricted" sx={{ bgcolor: "#555", color: "#7FFFD4" }} size="small" />
        );
      case "actions":
        return (<IconButton onClick={() => setEditTarget(pub)}><EditIcon fontSize="small" /></IconButton>);
      default: return "―";
    }
  };

  const filtered = useMemo(
    () =>
      publications.filter((p) =>
          p.title_english?.toLowerCase().includes(keyword.toLowerCase()) ||
          String(p.id)?.toLowerCase().includes(keyword.toLowerCase()) ||
          // ▼▼▼ 修正点 4: 検索ロジックを修正 ▼▼▼
          p.authors?.some(
            (a) =>
              a?.last_name?.toLowerCase().includes(keyword.toLowerCase()) ||
              a?.first_name?.toLowerCase().includes(keyword.toLowerCase())
          )
          // ▲▲▲ 修正点 4 ▲▲▲
      ),
    [publications, keyword]
  );

  const sortedFiltered = useMemo(
    () => [...filtered].sort(getComparator(order, orderBy)),
    [filtered, order, orderBy]
  );

  const getCellStyles = (col) => {
    const base = {
      color: theme.palette.text.primary,
      minWidth: col.minWidth,
      maxWidth: col.maxWidth,
      whiteSpace: "normal",
      wordBreak: "break-word",
      padding: "12px",
      borderRight: "1px solid #333",
    };
    if (col.id === "id") return { ...base, position: "sticky", left: 0, backgroundColor: "#121212", zIndex: 4, boxShadow: "2px 0 5px rgba(0,0,0,0.5)" };
    if (col.id === "actions") return { ...base, position: "sticky", right: 0, backgroundColor: "#121212", zIndex: 3, boxShadow: "-2px 0 5px rgba(0,0,0,0.5)" };
    return base;
  };

  const headerCellStyles = (col) => ({
    ...getCellStyles(col),
    backgroundColor: "#161616",
    fontWeight: "bold",
    borderBottom: "2px solid #555",
  });

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main }}>Publication Data Console</Typography>

        <TextField
          label="Search by Title, ID or Author"
          value={keyword}
          onChange={handleSearch}
          fullWidth
          variant="outlined"
        />

        <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
          Add Publication
        </Button>

        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={headerCellStyles(col)}
                    sortDirection={orderBy === col.id ? order : false}
                  >
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
              {sortedFiltered.map((pub) => (
                <TableRow key={pub.id} hover sx={{ "&:nth-of-type(even)": { backgroundColor: "#1e1e1e" } }}>
                  {columns.map((col) => (
                    <TableCell key={col.id} sx={getCellStyles(col)}>
                      {renderCellContent(pub, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {editTarget && (
          <DialogPublicationEdit
            publication={editTarget}
            onClose={(refresh) => {
              setEditTarget(null);
              if (refresh) fetchPublications();
            }}
          />
        )}

        {openAdd && (
          <DialogPublicationAdd
            onClose={(refresh) => {
              setOpenAdd(false);
              if (refresh) fetchPublications();
            }}
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}