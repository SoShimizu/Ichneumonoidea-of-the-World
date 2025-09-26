import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Autocomplete, Chip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import supabase from "../../../../utils/supabase";
import DialogAuthorAdd from "./DialogAuthorAdd";
import DialogJournalAdd from "./DialogJournalAdd";
import { ReactSortable } from "react-sortablejs";

export default function DialogPublicationEdit({ publication, onClose }) {
  // join で取得した不要プロパティを除外する
  const {
    journal,
    authors,
    publications_authors,
    scientific_name_status_obj,
    taxonomic_act_status_obj,
    distribution_status_obj,
    ecological_data_status_obj,
    ...cleanedPublication
  } = publication;

  const [form, setForm] = useState(cleanedPublication);
  const [authorsList, setAuthorsList] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [journals, setJournals] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [showAddJournal, setShowAddJournal] = useState(false);

  // registration_status テーブルから選択肢を取得
  useEffect(() => {
    (async () => {
      const { data: statusData, error: statusError } = await supabase
        .from("registration_status")
        .select("*");
      if (!statusError && statusData) {
        // 必要に応じて表示順を調整してください
        setStatuses(statusData.sort((a, b) => a.label.localeCompare(b.label)));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authorData } = await supabase
        .from("authors")
        .select("id, first_name_eng, last_name_eng");

      setAuthorsList(authorData.sort((a, b) =>
        `${a.last_name_eng} ${a.first_name_eng}`.localeCompare(`${b.last_name_eng} ${b.first_name_eng}`)
      ));

      const { data: journalData } = await supabase
        .from("journals")
        .select("*");

      setJournals(journalData.sort((a, b) =>
        a.name_english.localeCompare(b.name_english)
      ));

      const { data: authRel } = await supabase
        .from("publications_authors")
        .select("author_id, author:author_id (id, first_name_eng, last_name_eng)")
        .eq("publication_id", publication.id)
        .order("author_order");

      setSelectedAuthors((authRel || []).map(r => r.author));
    })();
  }, [publication.id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthorAdd = (newAuthor) => {
    const updated = [...authorsList, newAuthor].sort((a, b) =>
      `${a.last_name_eng} ${a.first_name_eng}`.localeCompare(`${b.last_name_eng} ${b.first_name_eng}`)
    );
    setAuthorsList(updated);
    setSelectedAuthors(prev => [...prev, newAuthor]);
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
        author_id: a.id,
        author_order: i + 1
      }));
      const { error: relErr } = await supabase.from("publications_authors").insert(relations);
      if (relErr) return alert("Failed to update author relations: " + relErr.message);
    }

    alert("Update successful.");
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete?");
    if (!confirmed) return;

    await supabase.from("publications_authors").delete().eq("publication_id", form.id);
    const { error } = await supabase.from("publications").delete().eq("id", form.id);

    if (error) alert("Delete failed: " + error.message);
    else {
      alert("Deleted successfully");
      onClose();
    }
  };

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="lg">
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

          {/* 登録状況（ステータス）用ドロップダウン入力欄 */}
          <TextField
            select
            label="Sci. Name?"
            value={form.scientific_name_status || "not_yet"}
            onChange={(e) => handleChange("scientific_name_status", e.target.value)}
            fullWidth margin="dense"
          >
            {statuses.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tax. Act?"
            value={form.taxonomic_act_status || "not_yet"}
            onChange={(e) => handleChange("taxonomic_act_status", e.target.value)}
            fullWidth margin="dense"
          >
            {statuses.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Dist.?"
            value={form.distribution_status || "not_yet"}
            onChange={(e) => handleChange("distribution_status", e.target.value)}
            fullWidth margin="dense"
          >
            {statuses.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Ecol.?"
            value={form.ecological_data_status || "not_yet"}
            onChange={(e) => handleChange("ecological_data_status", e.target.value)}
            fullWidth margin="dense"
          >
            {statuses.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
            ))}
          </TextField>

          <Autocomplete
            options={authorsList}
            getOptionLabel={(a) => `${a.last_name_eng}, ${a.first_name_eng}`}
            onChange={(e, val) => {
              if (val && !selectedAuthors.find(sa => sa.id === val.id)) {
                setSelectedAuthors(prev => [...prev, val]);
              }
            }}
            renderInput={(params) => <TextField {...params} label="Add Author" margin="dense" />}
          />
          <ReactSortable list={selectedAuthors} setList={setSelectedAuthors}>
            {selectedAuthors.map((a, index) => (
              <Chip
                key={a.id}
                label={`${index + 1}. ${a.last_name_eng}, ${a.first_name_eng}`}
                onDelete={() => setSelectedAuthors(prev => prev.filter(p => p.id !== a.id))}
                sx={{ m: 0.5 }}
              />
            ))}
          </ReactSortable>
          <Stack direction="row" justifyContent="flex-end" mt={1}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddAuthor(true)}>
              + Add Author
            </Button>
          </Stack>

          <TextField
            select
            label="Journal"
            value={form.journal_id || ""}
            onChange={(e) => handleChange("journal_id", e.target.value)}
            fullWidth margin="dense"
          >
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

          <TextField
            select
            label="Open Access"
            value={form.is_open_access ? "true" : "false"}
            onChange={(e) => handleChange("is_open_access", e.target.value === "true")}
            fullWidth margin="dense"
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleUpdate} variant="contained" color="primary">Save</Button>
          <Button onClick={handleDelete} variant="outlined" color="error">Delete</Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <DialogAuthorAdd open={showAddAuthor} onClose={() => setShowAddAuthor(false)} onAdd={handleAuthorAdd} />
      <DialogJournalAdd open={showAddJournal} onClose={() => setShowAddJournal(false)} onAdd={handleJournalAdd} />
    </>
  );
}
