// src/components/ProtectedRoute/Admin/Consoles/Dialogs/DialogPublicationAdd.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Autocomplete, Chip, Paper, Divider, Typography,
  IconButton, Popper, Grid, Box
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { ReactSortable } from "react-sortablejs";
import supabase from "../../../../utils/supabase";
import DialogJournalAdd from "./DialogJournalAdd";
import ResearcherSelector from "./parts/ResearcherSelector";
import AuditLogUpdater from "../../AuditLogUpdater/AuditLogUpdater";

export default function DialogPublicationAdd({ onClose }) {
  const [auditLogProps, setAuditLogProps] = useState(null);
  const [form, setForm] = useState({
    publication_type: "journal_article",
    id: "", title_original: "", title_english: "", title_other: "",
    publication_date: "", online_first_date: "",
    journal_id: "", volume: "", number: "", article_id: "", page: "",
    doi: "", abstract_english: "", abstract_other: "", is_open_access: "false",
    total_pages: "", city: "", country: "", parent_book_id: "", degree_name: "",
    remark: "", isbn_hardback: "", isbn_epub: "", isbn_pdf: ""
  });

  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [journals, setJournals] = useState([]);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [parentBooks, setParentBooks] = useState([]);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const journalInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: jData } = await supabase.from("journals").select("*");
      const { data: cityData } = await supabase.from("cities").select("id, name");
      const { data: countryData } = await supabase.from("countries").select("id");
      const { data: parentData } = await supabase
        .from("publications")
        .select("id, title_english")
        .eq("publication_type", "book");

      setJournals((jData || []).sort((a, b) => a.name_english.localeCompare(b.name_english)));
      setCities((cityData || []).sort((a, b) => a.name.localeCompare(b.name)));
      setCountries((countryData || []).map(c => c.id).sort());
      setParentBooks(parentData || []);
    })();
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAuthorRemove = (id) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== id));
  };

  const handleJournalAdd = (newJournal) => {
    setJournals(prev => [...prev, newJournal]);
    setForm(prev => ({ ...prev, journal_id: newJournal.id }));
  };

  const validateForm = () => {
    const required = ["id", "title_english", "title_original", "publication_date"];
    for (const key of required) {
      if (!form[key]?.trim()) {
        alert("Required fields are missing.");
        return false;
      }
    }
    return true;
  };

  const sanitizePayload = (data) => {
    const cleaned = { ...data };
    if (!cleaned.total_pages?.toString().trim()) cleaned.total_pages = null;
    if (!cleaned.city) cleaned.city = null;
    if (!cleaned.journal_id) cleaned.journal_id = null;
    if (!cleaned.parent_book_id) cleaned.parent_book_id = null;
    if (!cleaned.country?.toString().trim()) cleaned.country = null;
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === "") cleaned[key] = null;
    });
    cleaned.is_open_access = cleaned.is_open_access === "true";
    return cleaned;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const { data: dup } = await supabase.from("publications").select("id").eq("id", form.id);
    if (dup?.length > 0) return alert("Duplicate ID exists.");

    const payload = sanitizePayload(form);
    const { error } = await supabase.from("publications").insert([payload]);
    if (error) return alert("Insert failed: " + error.message);

    if (selectedAuthors.length > 0) {
      const authorRelations = selectedAuthors.map((a, i) => ({
        publication_id: form.id,
        researcher_id: a.id,
        author_order: i + 1,
      }));
      const { error: relErr } = await supabase.from("publications_authors").insert(authorRelations);
      if (relErr) return alert("Failed to link authors: " + relErr.message);
    }

    setAuditLogProps({
      tableName: "publications",
      rowId: form.id,
      action: "INSERT",
      beforeData: null,
      afterData: payload,
      onComplete: () => {
        alert("Publication successfully registered and audit logged!");
        onClose(true);
      },
    });
  };

  const CustomPopper = (props) => (
    <Popper {...props} placement="bottom-start">
      <Paper sx={{ p: 1 }}>
        <Stack direction="row" justifyContent="flex-end">
          <IconButton size="small" onClick={() => journalInputRef.current?.blur()}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        {props.children}
      </Paper>
    </Popper>
  );

  // Crossref から DOI で自動入力
  const fetchDOIData = async (rawDoiInput) => {
    const doi = extractDOI(rawDoiInput);
    if (!doi) {
      alert("No DOI inputted!");
      return;
    }
    try {
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      const json = await response.json();
      const work = json.message;
      if (!work) {
        alert("No data available from this DOI.");
        return;
      }

      const publishedDate = work.published?.["date-parts"]?.[0] ? formatDateParts(work.published["date-parts"][0]) : null;
      const createdDate = work.created?.["date-parts"]?.[0] ? formatDateParts(work.created["date-parts"][0]) : null;

      setForm((prev) => {
        const containerTitle = work["container-title"]?.[0] || "";
        const matchedJournal = journals.find(
          (journal) => normalizeStr(journal.name_english) === normalizeStr(containerTitle)
        );
        return {
          ...prev,
          title_english: work.title?.[0] || prev.title_english,
          publication_date: createdDate || prev.publication_date,
          online_first_date: publishedDate || prev.online_first_date,
          abstract_english: work.abstract ? work.abstract.replace(/<[^>]+>/g, "") : prev.abstract_english,
          journal_id: matchedJournal?.id || null,
          volume: work.volume || null,
          number: work.issue || null,
          page: work.page || null,
          doi: doi,
        };
      });
    } catch {
      alert("Failed to get article data using this doi...");
    }
  };

  function formatDateParts(dateParts) {
    if (!Array.isArray(dateParts)) return null;
    const [year, month = 1, day = 1] = dateParts;
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }
  function extractDOI(input) {
    if (!input) return null;
    return String(input).replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();
  }
  function normalizeStr(str) {
    if (typeof str !== "string") return "";
    return str.replace(/_/g, "").replace(/\s/g, "").toLowerCase();
  }

  // 選択著者の表示（番号付与）
  const selectedAuthorChips = useMemo(
    () => (
      <ReactSortable list={selectedAuthors} setList={setSelectedAuthors}>
        {selectedAuthors.map((a, i) => (
          <Chip
            key={a.id}
            label={`${i + 1}. ${a.last_name}, ${a.first_name}`}
            onDelete={() => handleAuthorRemove(a.id)}
            sx={{ m: 0.5, cursor: "grab" }}
            deleteIcon={<CloseIcon />}
          />
        ))}
      </ReactSortable>
    ),
    [selectedAuthors]
  );

  return (
    <>
      <Dialog open onClose={() => onClose(false)} fullWidth maxWidth="lg">
        <DialogTitle>Add Publication</DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            label="Publication Type"
            value={form.publication_type}
            onChange={(e) => handleChange("publication_type", e.target.value)}
            fullWidth
            margin="dense"
          >
            <MenuItem value="journal_article">Journal Article</MenuItem>
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="book_chapter">Book Chapter</MenuItem>
            <MenuItem value="thesis">Thesis</MenuItem>
          </TextField>

          <TextField
            label="ID (Required)"
            value={form.id}
            onChange={(e) => handleChange("id", e.target.value)}
            fullWidth
            margin="dense"
            helperText="Create a unique ID, e.g., 'Author,Author,Author,Year[J:Vol(Num):Page]'."
            error={!form.id?.trim()}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Enter Data By DOI
          </Typography>
          <Typography variant="caption">
            If a DOI is available, part of the input form can be automatically filled in using the DOI.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ my: 1 }}>
            <TextField
              label="DOI (If available)"
              value={form.doi}
              onChange={(e) => handleChange("doi", e.target.value)}
              fullWidth
              margin="dense"
            />
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => fetchDOIData(form.doi)}>
              GET
            </Button>
          </Stack>

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Publication Date
          </Typography>
          <TextField
            label="Publication Date"
            type="date"
            value={form.publication_date}
            onChange={(e) => handleChange("publication_date", e.target.value)}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            error={!form.publication_date?.trim()}
            required
          />
          <TextField
            label="Online First Date"
            type="date"
            value={form.online_first_date}
            onChange={(e) => handleChange("online_first_date", e.target.value)}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Title
          </Typography>
          <TextField
            label="Title (Original) (Require)"
            value={form.title_original}
            onChange={(e) => handleChange("title_original", e.target.value)}
            fullWidth
            margin="dense"
            multiline
            error={!form.title_original?.trim()}
            required
          />
          <TextField
            label="Title (English) (Require)"
            value={form.title_english}
            onChange={(e) => handleChange("title_english", e.target.value)}
            fullWidth
            margin="dense"
            multiline
            error={!form.title_english?.trim()}
            required
          />
          <TextField
            label="Title (Other)"
            value={form.title_other}
            onChange={(e) => handleChange("title_other", e.target.value)}
            fullWidth
            margin="dense"
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Authors
          </Typography>

          <ResearcherSelector
            value={null}
            onChange={(selectedId) => {
              if (selectedId && !selectedAuthors.find((x) => x.id === selectedId)) {
                (async () => {
                  const { data } = await supabase.from("researchers").select("*").eq("id", selectedId).single();
                  if (data) setSelectedAuthors((prev) => [...prev, data]);
                })();
              }
            }}
            label="Search and Add Authors"
          />
          <Box border={1} borderColor="divider" borderRadius={1} p={1} mt={1} minHeight={56}>
            <Typography variant="caption">Selected Authors (Drag to reorder)</Typography>
            {selectedAuthorChips}
          </Box>

          {form.publication_type === "journal_article" && (
            <>
              <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
              <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
                Journal and Article Info
              </Typography>
              <Autocomplete
                options={journals}
                getOptionLabel={(j) => j.name_english}
                value={journals.find((j) => String(j.id) === String(form.journal_id)) || null}
                onChange={(e, val) => handleChange("journal_id", val?.id || null)}
                renderInput={(params) => <TextField {...params} label="Journal" margin="dense" inputRef={journalInputRef} />}
                PopperComponent={CustomPopper}
              />
              <Stack direction="row" justifyContent="flex-end" mt={1}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddJournal(true)}>
                  + Add/Edit Journal
                </Button>
              </Stack>
              <Grid container spacing={1}>
                {["volume", "number", "article_id", "page"].map((field) => (
                  <Grid item xs={12} sm={6} md={3} key={field}>
                    <TextField
                      label={field.replace("_", " ").toUpperCase()}
                      value={form[field] || ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      fullWidth
                      margin="dense"
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {form.publication_type === "book" && (
            <>
              <TextField
                label="Total Pages"
                value={form.total_pages || ""}
                onChange={(e) => handleChange("total_pages", e.target.value)}
                fullWidth
                margin="dense"
              />
              <Autocomplete
                options={cities}
                getOptionLabel={(c) => c.name}
                value={cities.find((c) => c.id === form.city) || null}
                onChange={(e, val) => handleChange("city", val?.id || null)}
                renderInput={(params) => <TextField {...params} label="City" margin="dense" />}
              />
              <Autocomplete
                options={countries}
                value={form.country || null}
                onChange={(e, val) => handleChange("country", val)}
                renderInput={(params) => <TextField {...params} label="Country" margin="dense" />}
              />
              <Grid container spacing={2}>
                {["isbn_hardback", "isbn_epub", "isbn_pdf"].map((field) => (
                  <Grid item xs={12} sm={4} key={field}>
                    <TextField
                      label={field.replace("isbn_", "").toUpperCase() + " ISBN"}
                      value={form[field] || ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      fullWidth
                      margin="dense"
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {form.publication_type === "book_chapter" && (
            <Autocomplete
              options={parentBooks}
              getOptionLabel={(b) => `${b.title_english} (${b.id})`}
              value={parentBooks.find((b) => b.id === form.parent_book_id) || null}
              onChange={(e, val) => handleChange("parent_book_id", val?.id || null)}
              renderInput={(params) => <TextField {...params} label="Parent Book" margin="dense" />}
            />
          )}

          {form.publication_type === "thesis" && (
            <TextField
              label="Degree Name"
              value={form.degree_name || ""}
              onChange={(e) => handleChange("degree_name", e.target.value)}
              fullWidth
              margin="dense"
            />
          )}

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Optional Data
          </Typography>
          {["abstract_english", "abstract_other", "remark"].map((field) => (
            <TextField
              key={field}
              label={field.replace("_", " ").toUpperCase()}
              value={form[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              fullWidth
              margin="dense"
              multiline
            />
          ))}

          <TextField
            select
            label="Open Access"
            value={form.is_open_access}
            onChange={(e) => handleChange("is_open_access", e.target.value)}
            fullWidth
            margin="dense"
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleSubmit} variant="contained">
            Register
          </Button>
          <Button onClick={() => onClose(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <DialogJournalAdd
        open={showAddJournal}
        onClose={() => setShowAddJournal(false)}
        onAdd={handleJournalAdd}
      />
      {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
    </>
  );
}
