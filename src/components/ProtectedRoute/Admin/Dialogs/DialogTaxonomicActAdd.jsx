import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Autocomplete, Stack, RadioGroup,
  FormControlLabel, Radio, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState, useMemo } from "react";
import supabase from "../../../../utils/supabase";
import LoadingScreen from "../../../LoadingScreen";
import DialogPublicationAdd from "./DialogPublicationAdd";
import DialogSpecimen from "./DialogSpecimen"; // ★標本追加用（仮想）
import ScientificNameSelector from "./parts/ScientificNameSelector";

import AuditLogUpdater from "../../AuditLogUpdater/AuditLogUpdater";
import { v4 as uuidv4 } from "uuid";
import useFetchScientificNames from "../myHooks/useFetchScientificNames";

export default function DialogTaxonomicActAdd({ onClose }) {
  const [loading, setLoading] = useState(true);
  const { scientificNames, refresh } = useFetchScientificNames();
  const [publications, setPublications] = useState([]);
  const [actTypes, setActTypes] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [specimens, setSpecimens] = useState([]);
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [showAddSpecimen, setShowAddSpecimen] = useState(false);
  const [auditLogProps, setAuditLogProps] = useState(null);

  const [form, setForm] = useState({
    id: uuidv4(),
    scientific_name_id: "",
    publication_id: "",
    act_type_id: "",
    related_name_id: "",          // 例えば、Parent Taxon のID
    replacement_name_id: null,      // Replacement Name のID（scientific_namesから選択）
    rank_change_to: "",           // 新たなランク（New Taxon, New Statusなど）
    type_specimen_id: "",         // 種の場合のPrimary Type Specimen ID
    type_taxon_id: "",            // 種以外の場合のType Taxon ID
    page: "",
    validity: "true",
    remarks: "",
  });

  const fetchOptions = async () => {
    setLoading(true);
    const [pub, act, rk, spm] = await Promise.all([
      supabase.from("publications").select(`
        id,
        title_english,
        publication_date,
        volume,
        number,
        page,
        journal:journal_id(name_english),
        publications_authors(
          author_order,
          authors(last_name_eng)
        )
      `),
      supabase.from("taxonomic_act_types").select("id, name, code"),
      supabase.from("rank").select("id"),
      supabase.from("specimens").select("id, specimen_code"),
    ]);
    if (!pub.error) setPublications(pub.data);
    if (!act.error) setActTypes(act.data);
    if (!rk.error) setRanks(rk.data.map(r => r.id));
    if (!spm.error) setSpecimens(spm.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOptions();
  }, []);


  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!form.scientific_name_id || !form.publication_id || !form.act_type_id) {
      alert("Required fields are missing (Scientific Name, Publication, Act Type).");
      return;
    }
    const insertForm = { ...form };
    if (!insertForm.replacement_name_id) {
      insertForm.replacement_name_id = null;
    }
    const { error } = await supabase.from("taxonomic_acts").insert([{ ...form }]);
    if (error) {
      alert("Insert failed: " + error.message);
      return;
    }
    setAuditLogProps({
      tableName: "taxonomic_acts",
      rowId: form.id,
      action: "INSERT",
      beforeData: null,
      afterData: form,
      onComplete: () => {
        alert("Taxonomic Act added successfully!");
        // 次を登録しやすいようにフォームを初期化（Publicationは継続利用）
        setForm({
          id: uuidv4(),
          scientific_name_id: "",
          publication_id: form.publication_id,
          act_type_id: "",
          related_name_id: "",
          replacement_name_id: null,
          rank_change_to: "",
          type_specimen_id: "",
          type_taxon_id: "",
          page: "",
          validity: "true",
          remarks: "",
        });
      }
    });
  };

  // 論文表示用のフォーマット
  const formatPublicationOption = (p) => {
    if (!p) return "";
    const authors = (p.publications_authors || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map(pa => pa.authors?.last_name_eng)
      .filter(Boolean);
    let authorStr = authors.join(", ");
    if (authors.length > 3) authorStr = authors.slice(0, 3).join(", ") + ", et al.";
    const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
    const journalInfo = p.journal?.name_english ? ` — ${p.journal.name_english}` : "";
    const vol = p.volume ? ` ${p.volume}` : "";
    const num = p.number ? `(${p.number})` : "";
    const page = p.page ? `: ${p.page}` : "";
    return `${authorStr} (${year}) ${p.title_english}${journalInfo}${vol}${num}${page}`;
  };

  // Act Typeを取得
  const selectedActType = actTypes.find(a => a.id === form.act_type_id);
  const selectedScientificName = scientificNames.find(n => n.id === form.scientific_name_id);
  const isSpeciesLevel = useMemo(() => {
    const rank = selectedScientificName?.current_rank?.toLowerCase() || "";
    return ["species", "subspecies"].includes(rank);
  }, [selectedScientificName]);

  // Live Previewのレンダリング（入力中内容の動的プレビュー）
  const renderLivePreview = () => {
    if (!selectedScientificName || !selectedActType) return "Please select a scientific name and an act type.";
    const target = selectedScientificName?.name_spell_valid || "???";
    const parent = scientificNames.find(n => n.id === form.related_name_id)?.name_spell_valid || "???";
    const pubObj = publications.find(p => p.id === form.publication_id);
    const authors = (pubObj?.publications_authors || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map(pa => pa.authors?.last_name_eng)
      .filter(Boolean);
    let authorStr = authors.join(", ");
    if (authors.length > 3) authorStr = authors.slice(0, 3).join(", ") + ", et al.";
    const year = pubObj?.publication_date ? new Date(pubObj.publication_date).getFullYear() : "n.d.";
    const publicationStr = `${authorStr} (${year})`;
    const page = form.page || "???";
    const validity = form.validity === "true" ? "valid" : "invalid";

    switch (selectedActType.code) {
      case "new_taxon":
        return (
          <Typography variant="body2">
            <u><b>{target}</b></u> is newly described as <u><b>{form.rank_change_to || "New Rank"}</b></u> under <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.
          </Typography>
        );
      case "syn_nov":
      case "stat_rev":
        return (
          <Typography variant="body2">
            <u><b>{target}</b></u> is synonymized to <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.
          </Typography>
        );
      case "comb_nov":
        return (
          <Typography variant="body2">
            <u><b>{target}</b></u> is transferred to <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.
          </Typography>
        );
      case "nomen_nov":
        return (
          <Typography variant="body2">
            <u><b>{target}</b></u> is newly proposed as a replacement name for <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.
          </Typography>
        );
      default:
        return "Select an act type to preview.";
    }
  };

  const renderDynamicFields = () => {
    switch (selectedActType?.code) {
      case "new_taxon":
        return (
          <>
            <Autocomplete
              options={ranks}
              value={form.rank_change_to}
              onChange={(e, val) => handleChange("rank_change_to", val || "")}
              renderInput={(params) => (
                <TextField {...params} label="New Rank (Optional)" margin="dense" fullWidth />
              )}
            />
            <ScientificNameSelector
              label="Parent Taxon"
              isRequired="false"
              scientificNameData={scientificNames}
              onChange={id => handleChange("related_name_id", id)}
              onRefreshData={refresh}
            />
            {isSpeciesLevel ? (
              <Autocomplete
                options={specimens}
                getOptionLabel={(s) => `${s.specimen_code} (${s.id})`}
                value={specimens.find(s => s.id === form.type_specimen_or_taxon_id) || null}
                onChange={(e, val) => handleChange("type_specimen_or_taxon_id", val?.id || "")}
                renderInput={(params) => (
                  <TextField {...params} label="Primary Type Specimen" margin="dense" fullWidth />
                )}
              />
            ) : (
              <ScientificNameSelector
                  label="Type Taxon"
                  scientificNameData={scientificNames}
                  onChange={id => handleChange("type_taxon_id", id)}
                  onRefreshData={refresh}
              />
            )}
            <Stack direction="row" spacing={1} mt={1}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddSpecimen(true)}>
                + Add Specimen
              </Button>
            </Stack>
          </>
        );
      case "syn_nov":
      case "stat_rev":
      case "comb_nov":
        return (
          <ScientificNameSelector
            label="Parent or New Parent Taxon"
            scientificNameData={scientificNames}
            onChange={id => handleChange("related_name_id", id)}
            onRefreshData={refresh}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {loading ? (
        <LoadingScreen message="Loading data..." />
      ) : (
        <Dialog open onClose={onClose} fullWidth maxWidth="md">
          <DialogTitle>Add Taxonomic Act</DialogTitle>
          <DialogContent dividers sx={{ position: "relative", overflow: "auto" }}>
            <Box sx={{ position: "sticky", top: 0, backgroundColor: "background.paper", p: 2, zIndex: 10, borderBottom: 1, borderColor: "divider" }}>
              {renderLivePreview()}
            </Box>

            <ScientificNameSelector
                label="Target Scientific Name"
                isRequired="true"
                scientificNameData={scientificNames}
                onChange={(id) => setForm(f => ({ ...f, scientific_name_id: id }))}
                onRefreshData={refresh}
            />

            <Autocomplete
              options={publications}
              getOptionLabel={(p) => formatPublicationOption(p)}
              value={publications.find(p => p.id === form.publication_id) || null}
              onChange={(e, val) => handleChange("publication_id", val?.id || "")}
              renderInput={(params) => <TextField {...params} label="Publication (Required)" margin="dense" fullWidth />}
            />

            <Stack direction="row" justifyContent="flex-end" mt={1}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddPublication(true)}>
                + Add Publication
              </Button>
            </Stack>

            <Autocomplete
              options={actTypes}
              getOptionLabel={(a) => `${a.name} (${a.code})`}
              value={actTypes.find(a => a.id === form.act_type_id) || null}
              onChange={(e, val) => handleChange("act_type_id", val?.id || "")}
              renderInput={(params) => <TextField {...params} label="Act Type (Required)" margin="dense" fullWidth />}
            />

            {renderDynamicFields()}

            <TextField
              label="Page (in publication)"
              value={form.page}
              onChange={(e) => handleChange("page", e.target.value)}
              fullWidth
              margin="dense"
            />

            <RadioGroup row value={form.validity} onChange={(e) => handleChange("validity", e.target.value)}>
              <FormControlLabel value="true" control={<Radio />} label="Valid" />
              <FormControlLabel value="false" control={<Radio />} label="Invalid" />
            </RadioGroup>

            <TextField
              label="Remarks"
              value={form.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              fullWidth
              margin="dense"
              multiline
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleAdd} variant="contained">
              Add and Continue
            </Button>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>

          {showAddPublication && <DialogPublicationAdd onClose={() => { setShowAddPublication(false); fetchOptions(); }} />}
          {showAddSpecimen && <DialogSpecimen onClose={() => { setShowAddSpecimen(false); fetchOptions(); }} />}
          {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
        </Dialog>
      )}
    </>
  );
}
