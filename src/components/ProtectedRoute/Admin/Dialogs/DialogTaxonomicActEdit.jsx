import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Autocomplete, Stack, RadioGroup,
  FormControlLabel, Radio, Typography, IconButton, InputAdornment,
  Tooltip, Alert, Popper // Popperをインポート
} from "@mui/material";
// --- MUI Icons ---
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ScienceIcon from '@mui/icons-material/Science'; // Scientific Name
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Publication
import CategoryIcon from '@mui/icons-material/Category'; // Act Type
import LinkIcon from '@mui/icons-material/Link'; // Related Name
import NotesIcon from '@mui/icons-material/Notes'; // Remarks
import FingerprintIcon from '@mui/icons-material/Fingerprint'; // ID
import PageviewIcon from '@mui/icons-material/Pageview'; // Page
import RuleIcon from '@mui/icons-material/Rule'; // Validity
import LooksOneIcon from '@mui/icons-material/LooksOne'; // Rank
import GroupWorkIcon from '@mui/icons-material/GroupWork'; // Parent Taxon
import FindReplaceIcon from '@mui/icons-material/FindReplace'; // Replacement Name
import BiotechIcon from '@mui/icons-material/Biotech'; // Type Specimen/Taxon
// --- React Hooks ---
import { useEffect, useState, useMemo } from "react";
// --- Supabase ---
import supabase from "../../../../utils/supabase"; // パスは環境に合わせてください
// --- Custom Components ---
import LoadingScreen from "../../../LoadingScreen"; // パスは環境に合わせてください
import DialogPublicationAdd from "./DialogPublicationAdd"; // パスは環境に合わせてください
import DialogScientificNameAdd from "./DialogScientificNameAdd";
import DialogSpecimen from "./DialogSpecimen"; // ★ Specimen 追加用ダイアログをインポート
import AuditLogUpdater from "../../AuditLogUpdater/AuditLogUpdater"; // パスは環境に合わせてください
import fetchSupabaseAll from "../../../../utils/fetchSupabaseAll";

// Autocompleteのドロップダウンリストのスタイル調整用Popper
const AutocompletePopper = (props) => (
  <Popper {...props} style={{ width: 'fit-content', minWidth: '300px' }} placement="bottom-start" />
);

// --- Component ---
export default function DialogTaxonomicActEdit({ taxonomicAct, onClose }) {
  // --- State ---
  const [form, setForm] = useState({
    id: taxonomicAct?.id || "",
    scientific_name_id: taxonomicAct?.scientific_name_id || "",
    publication_id: taxonomicAct?.publication_id || "",
    act_type_id: taxonomicAct?.act_type_id || "", // code を格納
    related_name_id: taxonomicAct?.related_name_id || "",
    replacement_name_id: taxonomicAct?.replacement_name_id || null,
    rank_change_to: taxonomicAct?.rank_change_to || "",
    type_specimen_id: taxonomicAct?.type_specimen_id || "",
    type_taxon_id: taxonomicAct?.type_taxon_id || "",
    page: taxonomicAct?.page || "",
    validity: taxonomicAct?.validity === false ? "false" : "true",
    remarks: taxonomicAct?.remarks || "",
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [scientificNames, setScientificNames] = useState([]);
  const [publications, setPublications] = useState([]);
  const [actTypes, setActTypes] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [specimens, setSpecimens] = useState([]); // 初期値は空配列
  const [specimensAvailable, setSpecimensAvailable] = useState(false); // ★ specimensが利用可能かを示すフラグ
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [showAddScientificName, setShowAddScientificName] = useState(false);
  const [showAddSpecimen, setShowAddSpecimen] = useState(false);
  const [auditLogProps, setAuditLogProps] = useState(null);

  // --- Data Fetching (Promise.allSettled 使用) ---
  const fetchOptions = async () => {
    setLoading(true);
    setFetchError(null);
    setSpecimensAvailable(false); // 初期化
    setSpecimens([]); // 初期化

    try {
      const sciData = await fetchSupabaseAll("scientific_names", "id, name_spell_valid, current_rank");
      if (sciData) {
        setScientificNames(sciData || []);
      } else {
        console.error("Failed to fetch scientific names.");
        setScientificNames([]);
      }

      // ★★★ Promise.allSettled を使用して各取得を試行 ★★★
      const results = await Promise.allSettled([
        supabase.from("publications").select(`
          id, title_english, publication_date, volume, number, page,
          journal:journal_id(name_english),
          publications_authors(author_order, authors(last_name_eng))
        `),
        supabase.from("taxonomic_act_types").select("id, name, code"),
        supabase.from("rank").select("id"),
        supabase.from("specimens").select("id, specimen_code") // ★ specimensも試行
      ]);

      const [snResult, pubResult, actResult, rkResult, spmResult] = results;
      let firstError = null;

      if (pubResult.status === 'fulfilled' && !pubResult.value.error) {
        setPublications(pubResult.value.data || []);
      } else {
        console.error("Failed to fetch publications:", pubResult.reason || pubResult.value?.error);
         if (!firstError) firstError = pubResult.reason?.message || pubResult.value?.error?.message || 'Failed to fetch publications.';
        setPublications([]);
      }

      if (actResult.status === 'fulfilled' && !actResult.value.error) {
        setActTypes(actResult.value.data || []);
      } else {
        console.error("Failed to fetch act types:", actResult.reason || actResult.value?.error);
         if (!firstError) firstError = actResult.reason?.message || actResult.value?.error?.message || 'Failed to fetch act types.';
        setActTypes([]);
      }

      if (rkResult.status === 'fulfilled' && !rkResult.value.error) {
        setRanks(rkResult.value.data?.map(r => r.id) || []);
      } else {
        console.error("Failed to fetch ranks:", rkResult.reason || rkResult.value?.error);
        if (!firstError) firstError = rkResult.reason?.message || rkResult.value?.error?.message || 'Failed to fetch ranks.';
        setRanks([]);
      }

      // ★★★ Specimens の結果を処理 ★★★
      if (spmResult.status === 'fulfilled' && !spmResult.value.error) {
        setSpecimens(spmResult.value.data || []);
        setSpecimensAvailable(true); // 取得成功フラグを立てる
        console.log("Specimens data loaded successfully.");
      } else {
        // specimens テーブルが存在しないなどの理由で失敗した場合
        console.warn("Failed to fetch specimens (table might not exist):", spmResult.reason || spmResult.value?.error);
        setSpecimens([]); // 空配列のまま
        setSpecimensAvailable(false); // 利用不可フラグ
        // specimens のエラーは fetchError には設定しない（オプション扱いのため）
        // if (!firstError) firstError = spmResult.reason?.message || spmResult.value?.error?.message || 'Failed to fetch specimens.';
      }

      // 他の必須データでエラーがあれば設定
      if (firstError) {
          setFetchError(firstError);
      }

    } catch (error) // Promise.allSettled 自体のエラー (通常発生しにくい)
    {
      console.error("[DialogTaxonomicActEdit] Unexpected error during fetchOptions:", error);
      setFetchError('An unexpected error occurred while fetching data.');
      setScientificNames([]);
      setPublications([]);
      setActTypes([]);
      setRanks([]);
      setSpecimens([]);
      setSpecimensAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchOptions();
    // taxonomicAct が変更された場合、フォームを再初期化
    setForm({
        id: taxonomicAct?.id || "",
        scientific_name_id: taxonomicAct?.scientific_name_id || "",
        publication_id: taxonomicAct?.publication_id || "",
        act_type_id: taxonomicAct?.act_type_id || "", // code
        related_name_id: taxonomicAct?.related_name_id || "",
        replacement_name_id: taxonomicAct?.replacement_name_id || null,
        rank_change_to: taxonomicAct?.rank_change_to || "",
        type_specimen_id: taxonomicAct?.type_specimen_id || "",
        type_taxon_id: taxonomicAct?.type_taxon_id || "",
        page: taxonomicAct?.page || "",
        validity: taxonomicAct?.validity === false ? "false" : "true",
        remarks: taxonomicAct?.remarks || "",
    });
  }, [taxonomicAct]);

  // --- Handlers ---
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!form.scientific_name_id || !form.publication_id || !form.act_type_id) {
      alert("Required fields are missing (Scientific Name, Publication, Act Type).");
      return;
    }
    const updateData = {
      scientific_name_id: form.scientific_name_id,
      publication_id: form.publication_id,
      act_type_id: form.act_type_id, // code
      related_name_id: form.related_name_id || null,
      replacement_name_id: form.replacement_name_id || null,
      rank_change_to: form.rank_change_to || null,
      type_specimen_id: form.type_specimen_id || null,
      type_taxon_id: form.type_taxon_id || null,
      page: form.page || null,
      validity: form.validity === "true",
      remarks: form.remarks || null,
    };
    console.log("Updating taxonomic_acts with data:", updateData);
    const { error } = await supabase.from("taxonomic_acts").update(updateData).eq("id", form.id);
    if (error) {
      alert("Update failed: " + error.message);
      console.error("Update error:", error);
      return;
    }
    setAuditLogProps({
      tableName: "taxonomic_acts",
      rowId: form.id,
      action: "UPDATE",
      beforeData: taxonomicAct,
      afterData: { ...form, validity: form.validity === "true" },
      onComplete: () => { alert("Taxonomic Act updated successfully!"); onClose(); }
    });
  };

  // --- Formatters ---
  const formatPublicationOption = (p) => {
    if (!p) return "";
    try {
      const authors = (p.publications_authors || [])
            .sort((a, b) => (a?.author_order ?? 0) - (b?.author_order ?? 0))
            .map(pa => pa?.authors?.last_name_eng || '').filter(Boolean);
      let authorStr = authors.join(", ");
      if (authors.length > 3) authorStr = authors.slice(0, 3).join(", ") + ", et al.";
      const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
      const journalInfo = p.journal?.name_english ? ` — ${p.journal.name_english}` : "";
      const vol = p.volume ? ` ${p.volume}` : "";
      const num = p.number ? `(${p.number})` : "";
      const pageInfo = p.page ? `: ${p.page}` : "";
      const title = p.title_english || "[No Title]";
      return `${authorStr} (${year}) ${title}${journalInfo}${vol}${num}${pageInfo} [ID:${p.id}]`;
    } catch (e) {
      console.error("Error formatting publication:", e, p);
      return `Error formatting ID: ${p.id || 'unknown'}`;
    }
  };

  // --- Memos (Selected Objects) ---
  const selectedActTypeObject = useMemo(() => {
    const currentCode = form.act_type_id;
    if (!actTypes || actTypes.length === 0 || !currentCode) return null;
    return actTypes.find(a => a.code === currentCode) || null;
  }, [actTypes, form.act_type_id]);

  const selectedScientificNameObject = useMemo(() => {
     if (!scientificNames || scientificNames.length === 0 || !form.scientific_name_id) return null;
     return scientificNames.find(n => n.id === form.scientific_name_id) || null;
   }, [scientificNames, form.scientific_name_id]);

   const selectedPublicationObject = useMemo(() => {
     if (!publications || publications.length === 0 || !form.publication_id) return null;
     return publications.find(p => p.id === form.publication_id) || null;
   }, [publications, form.publication_id]);

   const selectedRelatedNameObject = useMemo(() => {
     if (!scientificNames || scientificNames.length === 0 || !form.related_name_id) return null;
     return scientificNames.find(n => n.id === form.related_name_id) || null;
   }, [scientificNames, form.related_name_id]);

   const selectedReplacementNameObject = useMemo(() => {
     if (!scientificNames || scientificNames.length === 0 || !form.replacement_name_id) return null;
     return scientificNames.find(n => n.id === form.replacement_name_id) || null;
   }, [scientificNames, form.replacement_name_id]);

   // ★ type_specimen_id は Autocomplete か TextField か動的に変わるため、
   //   選択オブジェクトの useMemo は Autocomplete 表示時のみ有効。
   //   TextField の場合は form.type_specimen_id を直接使う。
   const selectedTypeSpecimenObject = useMemo(() => {
       if (!specimensAvailable || !specimens || specimens.length === 0 || !form.type_specimen_id) return null;
       return specimens.find(s => s.id === form.type_specimen_id) || null;
   }, [specimens, form.type_specimen_id, specimensAvailable]);

   const selectedTypeTaxonObject = useMemo(() => {
     if (!scientificNames || scientificNames.length === 0 || !form.type_taxon_id) return null;
     return scientificNames.find(n => n.id === form.type_taxon_id) || null;
   }, [scientificNames, form.type_taxon_id]);

  // Rank Check
  const isSpeciesLevel = useMemo(() => {
    const rank = selectedScientificNameObject?.current_rank?.toLowerCase() || "";
    return ["species", "subspecies"].includes(rank);
  }, [selectedScientificNameObject]);

  // --- Live Preview ---
  const renderLivePreview = () => {
    const selectedScientificName = selectedScientificNameObject;
    const selectedActType = selectedActTypeObject;
    if (!selectedScientificName || !selectedActType) {
        const snName = selectedScientificNameObject?.name_spell_valid || form.scientific_name_id || '?';
        const actTypeName = selectedActTypeObject?.name || form.act_type_id || '?';
        const pubInfo = selectedPublicationObject ? formatPublicationOption(selectedPublicationObject).substring(0, 50) + '...' : form.publication_id || '?';
        return <Typography variant="body2" sx={{ color: 'text.secondary' }}>{`Act [${form.id || 'New'}]: ${snName} as ${actTypeName} in ${pubInfo}`} <br/><i>Select required fields for detailed preview.</i></Typography>;
    }
    const target = selectedScientificName?.name_spell_valid || "???";
    const parent = selectedRelatedNameObject?.name_spell_valid || "???";
    const replacement = selectedReplacementNameObject?.name_spell_valid || "???";
    const pubObj = selectedPublicationObject;
    const authors = (pubObj?.publications_authors || []).sort((a, b) => (a?.author_order ?? 0) - (b?.author_order ?? 0)).map(pa => pa.authors?.last_name_eng).filter(Boolean);
    let authorStr = authors.join(", ");
    if (authors.length > 3) authorStr = authors.slice(0, 3).join(", ") + ", et al.";
    const year = pubObj?.publication_date ? new Date(pubObj.publication_date).getFullYear() : "n.d.";
    const publicationStr = `${authorStr} (${year})`;
    const page = form.page || "???";
    const validity = form.validity === "true" ? "valid" : "invalid";
    const newRank = form.rank_change_to || "New Rank";
    switch (selectedActType.code) {
        case "new_taxon": return <Typography variant="body2"><u><b>{target}</b></u> is described as <u><b>{newRank}</b></u> under <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
        case "syn_nov": case "stat_rev": return <Typography variant="body2"><u><b>{target}</b></u> is treated as a synonym of <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
        case "comb_nov": return <Typography variant="body2"><u><b>{target}</b></u> is transferred to <u><b>{parent}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
        case "nomen_nov": return <Typography variant="body2"><u><b>{target}</b></u> is proposed as a replacement name for <u><b>{replacement}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
        case "new_status": return <Typography variant="body2">The status of <u><b>{target}</b></u> is changed to <u><b>{newRank}</b></u> in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
        default: const actName = selectedActType?.name || "Selected Act"; return <Typography variant="body2">Act '<u><b>{actName}</b></u>' regarding <u><b>{target}</b></u> published in <u><b>{publicationStr}</b></u>: page <u><b>{page}</b></u>. This act is regarded as <u><b>{validity}</b></u>.</Typography>;
    }
  };

  // --- ★★★ Dynamic Fields (Specimens 対応を柔軟化) ★★★ ---
  const renderDynamicFields = () => {
    const selectedActType = selectedActTypeObject;
    if (!selectedActType) return null;

    switch (selectedActType.code) {
        case "new_taxon":
        case "new_status":
            return (
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* Rank */}
                    <Autocomplete options={ranks} getOptionLabel={(option) => option || ""} value={form.rank_change_to || null} onChange={(e, val) => handleChange("rank_change_to", val || "")} renderInput={(params) => (<TextField {...params} label="Rank (New Rank / Status)" margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><LooksOneIcon fontSize="small" /></InputAdornment>), }}/> )} PopperComponent={AutocompletePopper} />
                    {/* Parent Taxon */}
                    <Autocomplete options={scientificNames} getOptionLabel={(n) => `${n.name_spell_valid} (${n.id})`} value={selectedRelatedNameObject} onChange={(e, val) => handleChange("related_name_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => ( <TextField {...params} label="Parent Taxon" margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><GroupWorkIcon fontSize="small" /></InputAdornment>), }}/> )} PopperComponent={AutocompletePopper} />

                    {/* ★★★ Type Specimen or Type Taxon (分岐追加) ★★★ */}
                    {isSpeciesLevel ? (
                        // ★★★ specimens データが利用可能な場合のみ Autocomplete を表示 ★★★
                        specimensAvailable && specimens.length > 0 ? (
                            <Box>
                                <Autocomplete
                                    options={specimens}
                                    getOptionLabel={(s) => `${s.specimen_code} (${s.id})`}
                                    value={selectedTypeSpecimenObject} // useMemo利用
                                    onChange={(e, val) => handleChange("type_specimen_id", val?.id || "")}
                                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Primary Type Specimen" margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><BiotechIcon fontSize="small" /></InputAdornment>), }}/>
                                    )}
                                    PopperComponent={AutocompletePopper}
                                />
                                {/* Add Specimen Button (specimensがある場合のみ) */}
                                <Stack direction="row" justifyContent="flex-end" mt={0.5}>
                                    <Tooltip title="Add New Specimen">
                                        <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddSpecimen(true)}>
                                            Add Specimen
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Box>
                        ) : (
                            // ★★★ specimens データが利用できない場合は TextField で直接入力 ★★★
                            <TextField
                                label="Primary Type Specimen ID"
                                value={form.type_specimen_id || ""}
                                onChange={(e) => handleChange("type_specimen_id", e.target.value)}
                                placeholder="Enter Specimen ID"
                                margin="dense"
                                fullWidth
                                // ヘルパーテキストで状況を伝える
                                helperText={loading ? "Loading specimen info..." : "Specimen list unavailable. Enter ID directly."}
                                InputProps={{
                                    startAdornment: ( <InputAdornment position="start"><BiotechIcon fontSize="small" /></InputAdornment>),
                                }}
                            />
                        )
                    ) : (
                        // Type Taxon (変更なし)
                        <Autocomplete options={scientificNames} getOptionLabel={(n) => `${n.name_spell_valid} (${n.id})`} value={selectedTypeTaxonObject} onChange={(e, val) => handleChange("type_taxon_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => ( <TextField {...params} label="Type Taxon" margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><BiotechIcon fontSize="small" /></InputAdornment>), }}/> )} PopperComponent={AutocompletePopper} />
                    )}
                </Stack>
            );

        case "syn_nov": case "stat_rev": case "comb_nov":
            return <Autocomplete options={scientificNames} getOptionLabel={(n) => `${n.name_spell_valid} (${n.id})`} value={selectedRelatedNameObject} onChange={(e, val) => handleChange("related_name_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => ( <TextField {...params} label={selectedActType.code === 'comb_nov' ? "New Parent Taxon" : "Senior Synonym / Related Taxon"} margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment>), }}/> )} sx={{ mt: 1 }} PopperComponent={AutocompletePopper} />;

        case "nomen_nov":
            return <Autocomplete options={scientificNames} getOptionLabel={(n) => `${n.name_spell_valid} (${n.id})`} value={selectedReplacementNameObject} onChange={(e, val) => handleChange("replacement_name_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => ( <TextField {...params} label="Name Replaced by this Act" margin="dense" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><FindReplaceIcon fontSize="small" /></InputAdornment>), }}/> )} sx={{ mt: 1 }} PopperComponent={AutocompletePopper} />;

        default: return null;
    }
  };

  // --- Render ---
  return (
    <>
      {loading && <LoadingScreen message="Loading data..." />}
      {/* データ取得エラー表示 (specimens起因のエラーは除外される可能性あり) */}
      {fetchError && !loading && (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
          <DialogTitle>Error</DialogTitle>
          <DialogContent><Alert severity="error">Failed to load necessary data: {fetchError} <br/> Please try reloading or contact support.</Alert></DialogContent>
          <DialogActions><Button onClick={onClose}>Close</Button><Button onClick={fetchOptions}>Reload Data</Button></DialogActions>
        </Dialog>
      )}
      {/* メインダイアログ */}
      {!loading && !fetchError && (
        <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { overflowY: 'visible' } }}>
          <DialogTitle>Edit Taxonomic Act (ID: {form.id || 'N/A'})</DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto', position: "relative" }}>
            {/* Live Preview Box (Sticky) */}
            <Box sx={{ position: "sticky", top: -16, backgroundColor: "background.paper", p: 1.5, pt: 1, mb: 2, zIndex: 10, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 1 }}>
              <Typography variant="caption" color="textSecondary" gutterBottom>Live Preview:</Typography>
              {renderLivePreview()}
            </Box>

            {/* Form Fields */}
            <Stack spacing={2.5}>
              {/* Target Scientific Name */}
              <Box>
                <Autocomplete options={scientificNames} getOptionLabel={(n) => `${n.name_spell_valid} (${n.id})`} value={selectedScientificNameObject} onChange={(e, val) => handleChange("scientific_name_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => <TextField {...params} required label="Target Scientific Name" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><ScienceIcon fontSize="small" /></InputAdornment>), }}/>} PopperComponent={AutocompletePopper} />
                <Stack direction="row" justifyContent="flex-end" mt={0.5}><Tooltip title="Add New Scientific Name"><Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddScientificName(true)}>Add Name</Button></Tooltip></Stack>
              </Box>

              {/* Publication */}
              <Box>
                <Autocomplete options={publications} getOptionLabel={formatPublicationOption} value={selectedPublicationObject} onChange={(e, val) => handleChange("publication_id", val?.id || "")} isOptionEqualToValue={(option, value) => option.id === value?.id} renderInput={(params) => <TextField {...params} required label="Publication" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><MenuBookIcon fontSize="small" /></InputAdornment>), }}/>} renderOption={(props, option) => ( <li {...props} key={option.id}><Typography variant="body2" sx={{ maxWidth: 'calc(100% - 10px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatPublicationOption(option)}</Typography></li> )} PopperComponent={AutocompletePopper} />
                <Stack direction="row" justifyContent="flex-end" mt={0.5}><Tooltip title="Add New Publication"><Button size="small" startIcon={<AddIcon />} onClick={() => setShowAddPublication(true)}>Add Publication</Button></Tooltip></Stack>
              </Box>

              {/* Act Type (code ベース) */}
              <Autocomplete options={actTypes} getOptionLabel={(a) => `${a.name} (${a.code})`} value={selectedActTypeObject} onChange={(e, val) => handleChange("act_type_id", val?.code || "")} isOptionEqualToValue={(option, value) => option.code === value?.code} renderInput={(params) => <TextField {...params} required label="Act Type" InputProps={{ ...params.InputProps, startAdornment: ( <InputAdornment position="start"><CategoryIcon fontSize="small" /></InputAdornment>), }}/>} PopperComponent={AutocompletePopper} />

              {/* ★★★ Dynamic Fields (柔軟化対応済み) ★★★ */}
              {renderDynamicFields()}

              {/* Page */}
              <TextField label="Page (in publication)" value={form.page || ""} onChange={(e) => handleChange("page", e.target.value)} fullWidth InputProps={{ startAdornment: ( <InputAdornment position="start"><PageviewIcon fontSize="small" /></InputAdornment>), }} />

              {/* Validity */}
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                <RuleIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ mr: 2 }}>Validity:</Typography>
                <RadioGroup row value={form.validity} onChange={(e) => handleChange("validity", e.target.value)}>
                  <FormControlLabel value="true" control={<Radio size="small"/>} label="Valid" />
                  <FormControlLabel value="false" control={<Radio size="small"/>} label="Invalid" />
                </RadioGroup>
              </Box>

              {/* Remarks */}
              <TextField label="Remarks" value={form.remarks || ""} onChange={(e) => handleChange("remarks", e.target.value)} fullWidth multiline rows={3} InputProps={{ startAdornment: ( <InputAdornment position="start" sx={{ alignItems: 'flex-start', mt: 1 }}><NotesIcon fontSize="small" /></InputAdornment> ), }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={onClose} startIcon={<CancelIcon />}>Cancel</Button>
            <Button onClick={handleUpdate} variant="contained" color="primary" startIcon={<SaveIcon />}>Update Act</Button>
          </DialogActions>

          {/* --- Modals for Adding related data --- */}
          {showAddPublication && <DialogPublicationAdd onClose={() => { setShowAddPublication(false); fetchOptions(); }} />}
          {showAddScientificName && <DialogScientificNameAdd onClose={() => { setShowAddScientificName(false); fetchOptions(); }} />}
          {/* ★★★ Add Specimen Modal (表示条件は specimensAvailable に依存しない) ★★★ */}
          {/* ボタンが表示されるのは specimensAvailable が true の時だけ */}
          {showAddSpecimen && <DialogSpecimen onClose={() => { setShowAddSpecimen(false); fetchOptions(); }} />}

          {/* --- Audit Log --- */}
          {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
        </Dialog>
      )}
    </>
  );
}