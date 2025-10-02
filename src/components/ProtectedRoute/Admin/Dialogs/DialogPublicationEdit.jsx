import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Chip, Box, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import supabase from "../../../../utils/supabase";
import DialogJournalAdd from "./DialogJournalAdd";
import { ReactSortable } from "react-sortablejs";
// ▼▼▼ 修正点 1: ResearcherSelectorをインポートし、古いDialogAuthorAddを削除 ▼▼▼
import ResearcherSelector from "./parts/ResearcherSelector";
// ▲▲▲ 修正点 1 ▲▲▲

export default function DialogPublicationEdit({ publication, onClose }) {
  const {
    journal, authors, publications_authors, scientific_name_status_obj,
    taxonomic_act_status_obj, distribution_status_obj, ecological_data_status_obj,
    ...cleanedPublication
  } = publication;

  const [form, setForm] = useState(cleanedPublication);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [journals, setJournals] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [showAddJournal, setShowAddJournal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: statusData, error: statusError } = await supabase
        .from("registration_status")
        .select("*");
      if (!statusError && statusData) {
        setStatuses(statusData.sort((a, b) => a.label.localeCompare(b.label)));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // ▼▼▼ 修正点 2: `authorsList`の取得を削除し、データ取得クエリを修正 ▼▼▼
      const { data: journalData } = await supabase
        .from("journals")
        .select("*");
      setJournals(journalData.sort((a, b) => a.name_english.localeCompare(b.name_english)));

      const { data: authRel } = await supabase
        .from("publications_authors")
        .select("researcher_id, author:researcher_id (id, first_name, last_name)") // `*_eng` を削除
        .eq("publication_id", publication.id)
        .order("author_order");
      // ▲▲▲ 修正点 2 ▲▲▲

      setSelectedAuthors((authRel || []).map(r => r.author).filter(Boolean));
    })();
  }, [publication.id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthorRemove = (id) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== id));
  };
  
  const handleJournalAdd = (newJournal) => {
    const updated = [...journals, newJournal].sort((a, b) =>
      a.name_english.localeCompare(b.name_english)
    );
    setJournals(updated);
    setForm(prev => ({ ...prev, journal_id: newJournal.id }));
  };

  const handleUpdate = async () => {
    const confirmed = window.confirm("Are you sure you want to update?");
    if (!confirmed) return;

    const updateData = { ...form };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) updateData[key] = null;
    });

    const { error: updateError } = await supabase
      .from("publications")
      .update(updateData)
      .eq("id", form.id);

    if (updateError) return alert("Update failed: " + updateError.message);

    await supabase.from("publications_authors").delete().eq("publication_id", form.id);

    if (selectedAuthors.length > 0) {
      const relations = selectedAuthors.map((a, i) => ({
        publication_id: form.id,
        researcher_id: a.id,
        author_order: i + 1
      }));
      const { error: relErr } = await supabase.from("publications_authors").insert(relations);
      if (relErr) return alert("Failed to update author relations: " + relErr.message);
    }

    alert("Update successful.");
    onClose(true); // リフレッシュを要求
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete?");
    if (!confirmed) return;

    await supabase.from("publications_authors").delete().eq("publication_id", form.id);
    const { error } = await supabase.from("publications").delete().eq("id", form.id);

    if (error) alert("Delete failed: " + error.message);
    else {
      alert("Deleted successfully");
      onClose(true); //リフレッシュを要求
    }
  };

  return (
    <>
      <Dialog open onClose={() => onClose(false)} fullWidth maxWidth="lg">
        <DialogTitle>Edit Publication</DialogTitle>
        <DialogContent dividers>
          <TextField label="ID" value={form.id} fullWidth margin="dense" disabled />
          <TextField
            label="Publication Date"
            type="date"
            value={form.publication_date?.slice(0, 10) || ""}
            onChange={(e) => handleChange("publication_date", e.target.value)}
            fullWidth margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Online First Date"
            type="date"
            value={form.online_first_date?.slice(0, 10) || ""}
            onChange={(e) => handleChange("online_first_date", e.target.value)}
            fullWidth margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Title (Original)"
            value={form.title_original || ""}
            onChange={(e) => handleChange("title_original", e.target.value)}
            fullWidth margin="dense"
            multiline
          />
          <TextField
            label="Title (English)"
            value={form.title_english || ""}
            onChange={(e) => handleChange("title_english", e.target.value)}
            fullWidth margin="dense"
            multiline
          />

          <TextField select label="Sci. Name?" value={form.scientific_name_status || "not_yet"} onChange={(e) => handleChange("scientific_name_status", e.target.value)} fullWidth margin="dense">
            {statuses.map(s => (<MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>))}
          </TextField>
          <TextField select label="Tax. Act?" value={form.taxonomic_act_status || "not_yet"} onChange={(e) => handleChange("taxonomic_act_status", e.target.value)} fullWidth margin="dense">
            {statuses.map(s => (<MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>))}
          </TextField>
          <TextField select label="Dist.?" value={form.distribution_status || "not_yet"} onChange={(e) => handleChange("distribution_status", e.target.value)} fullWidth margin="dense">
            {statuses.map(s => (<MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>))}
          </TextField>
          <TextField select label="Ecol.?" value={form.ecological_data_status || "not_yet"} onChange={(e) => handleChange("ecological_data_status", e.target.value)} fullWidth margin="dense">
            {statuses.map(s => (<MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>))}
          </TextField>
          
          {/* ▼▼▼ 修正点 3: 著者選択UIをResearcherSelectorに置き換え ▼▼▼ */}
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2">Authors</Typography>
            <ResearcherSelector
              value={null}
              onChange={(selectedId) => {
                if (selectedId && !selectedAuthors.find((x) => x.id === selectedId)) {
                  const fetchAuthor = async () => {
                    const { data } = await supabase.from('researchers').select('*').eq('id', selectedId).single();
                    if (data) {
                      setSelectedAuthors((prev) => [...prev, data]);
                    }
                  };
                  fetchAuthor();
                }
              }}
              label="Search and Add Authors"
            />
            <Box border={1} borderColor="divider" borderRadius={1} p={1} mt={1} minHeight={56}>
              <Typography variant="caption">Selected Authors (Drag to reorder)</Typography>
              <ReactSortable list={selectedAuthors} setList={setSelectedAuthors}>
                {selectedAuthors.map((a, i) => (
                  <Chip
                    key={a.id}
                    label={`${i + 1}. ${a.last_name}, ${a.first_name}`}
                    onDelete={() => handleAuthorRemove(a.id)}
                    sx={{ m: 0.5, cursor: "grab" }}
                  />
                ))}
              </ReactSortable>
            </Box>
          </Box>
          {/* ▲▲▲ 修正点 3 ▲▲▲ */}

          <TextField select label="Journal" value={form.journal_id || ""} onChange={(e) => handleChange("journal_id", e.target.value)} fullWidth margin="dense">
            {journals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                {j.name_english === j.name_original ? j.name_english : `${j.name_english} (${j.name_original})`}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" justifyContent="flex-end" mt={1}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddJournal(true)}>
              + Add Journal
            </Button>
          </Stack>

          {["volume", "number", "article_id", "page", "doi", "abstract_english", "abstract_other"].map(field => (
            <TextField
              key={field}
              label={field.replace("_", " ").toUpperCase()}
              value={form[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              fullWidth margin="dense"
              multiline={field.includes("abstract")}
            />
          ))}

          <TextField select label="Open Access" value={form.is_open_access ? "true" : "false"} onChange={(e) => handleChange("is_open_access", e.target.value === "true")} fullWidth margin="dense">
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleUpdate} variant="contained" color="primary">Save</Button>
          <Button onClick={handleDelete} variant="outlined" color="error">Delete</Button>
          <Button onClick={() => onClose(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* ▼▼▼ 修正点 4: DialogAuthorAddの呼び出しを削除 ▼▼▼ */}
      {/* <DialogAuthorAdd open={showAddAuthor} onClose={() => setShowAddAuthor(false)} onAdd={handleAuthorAdd} /> */}
      {/* ▲▲▲ 修正点 4 ▲▲▲ */}

      <DialogJournalAdd open={showAddJournal} onClose={(refresh) => { setShowAddJournal(false); if (refresh) { /* 再取得 */ } }} onAdd={handleJournalAdd} />
    </>
  );
}