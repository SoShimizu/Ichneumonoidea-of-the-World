import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Divider, Typography,
} from "@mui/material";

// Supabase & Utils
import supabase from "../../../../../utils/supabase";
import fetchSupabaseAllWithOrdering from "../../../../../utils/fetchSupabaseAllWithOrdering";

// Sub-Dialogs and Components
import DialogAuthorAdd          from "../DialogAuthorAdd";
import DialogRepository         from "../DialogRepository";
import DialogPublicationAdd     from "../DialogPublicationAdd";
import AuditLogUpdater          from "../../../AuditLogUpdater/AuditLogUpdater";
import LoadingScreen            from "../../../../LoadingScreen";
import DialogTypeCategoryAdd    from "../DialogTypeCategoryAdd";

// --- Section Components ---
import SectionIdSource        from "./Sections/SectionIdSource";
import SectionNameSpelling    from "./Sections/SectionNameSpelling";
import SectionZooBank         from "./Sections/SectionZooBank";
import SectionAuthority       from "./Sections/SectionAuthority";
import SectionTaxonomy        from "./Sections/SectionTaxonomy";
import SectionRelationship    from "./Sections/SectionRelationship";
import SectionTypeSpecimen    from "./Sections/SectionTypeSpecimen";
import SectionOtherInfo       from "./Sections/SectionOtherInfo";
import useFetchScientificNames from "../../myHooks/useFetchScientificNames";

/* ――― 定数 ――― */
const RanksNoLocalityConst = [
  "subgenus", "genus", "family", "order", "class", "phylum", "kingdom",
];

const urlRegex = /^https?:\/\/[^\s]+$/i;

/* ――――――――――――――――――――――――――――――――――――――― */
export default function DialogScientificNameAdd({ onClose }) {
  /* ────────────── state ────────────── */
  const [form, setForm] = useState({
    id: "",
    name_spell_valid: "",
    name_spell_original: null,
    current_rank: null,
    original_rank: null,
    current_parent: null,
    original_parent: null,
    extant_fossil: null,
    remark: "",
    authority_year: "",
    type_sex: "",
    source_of_original_description: null,
    valid_name_id: null,
    type_taxa_id: null,
    type_locality: null,
    // ★★★ データベースのUUIDスキーマに合わせてstate名を修正 ★★★
    type_repository_id: null,
    type_host: null,
    page: "",
    type_category: "",
    zoobank_url: null,
    type_img_urls: null,
  });
  const [imgRows, setImgRows] = useState([{ title: "", url: "" }]);
  const [loading, setLoading] = useState(true);
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [auditLogProps, setAuditLogProps] = useState(null);
  const [validNameRadio, setValidNameRadio] = useState("");
  const [typeTaxaRadio, setTypeTaxaRadio] = useState("");
  const [allAuthors, setAllAuthors] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [authorInputValue, setAuthorInputValue] = useState("");
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [ranks, setRanks] = useState([]);
  const [names, setNames] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [publications, setPublications] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [typeCategories, setTypeCategories] = useState([]);
  const [showAddTypeCategory, setShowAddTypeCategory] = useState(false);

  /* ────────────── memo ────────────── */
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const pastYears = Array.from({ length: 150 }, (_, i) => `${currentYear - i}`);
    const futureYears = Array.from({ length: 10 }, (_, i) => `${currentYear + 1 + i}`);
    return [...futureYears.reverse(), ...pastYears];
  }, []);

  const { scientificNames, refresh } = useFetchScientificNames();
  
  const combinedNames = useMemo(() => {
    const trimmedId = form.id?.trim();
    const validNames = Array.isArray(names) && names.every(item => typeof item === 'string') ? names : [];
    if (trimmedId && !validNames.includes(trimmedId)) {
        return [...validNames, trimmedId].sort();
    }
    return [...validNames].sort();
  }, [names, form.id]);

  /* ────────────── handlers ────────────── */
  // ★★★ 無限ループを解決するための最も重要な修正 ★★★
  // この関数は、親コンポーネントが再描画されても再生成されないようにuseCallbackで安定化させます。
  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []); // 依存配列は空でOK (setFormはReactによって安定性が保証されているため)

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedNamesArray = await fetchSupabaseAllWithOrdering({
        tableName: "scientific_names",
        selectQuery: "id",
        orderOptions: [{ column: "id" }],
      });
      if (Array.isArray(fetchedNamesArray)) {
        setNames(fetchedNamesArray.map(d => d.id));
      } else {
        setNames([]);
      }
      
      // ★★★ RepositorySelectorが自身でデータを取得するため、ここでのrepositories取得は削除 ★★★
      const [authorsRes, ranksRes, statusesRes, pubsRes, countriesRes, typeCatsRes] = await Promise.all([
        supabase.from("researchers").select("id, first_name_eng, last_name_eng").order("last_name_eng"),
        supabase.from("rank").select("id").order("id"),
        supabase.from("extant_fossil").select("id").order("id"),
        supabase.from("publications").select(`id, title_english, publication_date, volume, number, page, journal:journal_id(name_english), publications_authors(author_order, authors(last_name_eng))`).order("id"),
        supabase.from("countries").select("id").order("id"),
        supabase.from("type_categories").select("*").order("id"),
      ]);

      if (authorsRes.error) console.error("Error fetching authors:", authorsRes.error); else setAllAuthors(authorsRes.data || []);
      if (ranksRes.error) console.error("Error fetching ranks:", ranksRes.error); else setRanks((ranksRes.data || []).map(d => d.id));
      if (statusesRes.error) console.error("Error fetching statuses:", statusesRes.error); else setStatuses((statusesRes.data || []).map(d => d.id));
      if (pubsRes.error) console.error("Error fetching publications:", pubsRes.error); else setPublications(pubsRes.data || []);
      if (countriesRes.error) console.error("Error fetching countries:", countriesRes.error); else setCountriesList(countriesRes.data || []);
      if (typeCatsRes.error) console.error("Error fetching type categories:", typeCatsRes.error); else setTypeCategories(typeCatsRes.data || []);

    } catch (error) {
      console.error("Error during fetchOptions:", error);
      alert(`Failed to load initial data: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    const trimmedId = form.id?.trim();
    if (trimmedId && !validNameRadio) setValidNameRadio("own");
    if (trimmedId && !typeTaxaRadio) setTypeTaxaRadio("own");
    if (validNameRadio === "own") handleChange("valid_name_id", trimmedId || null);
    if (typeTaxaRadio === "own") handleChange("type_taxa_id", trimmedId || null);
  }, [form.id, validNameRadio, typeTaxaRadio, handleChange]);

  const handleValidNameRadio = (e) => {
    const newRadioValue = e.target.value;
    const trimmedId = form.id?.trim();
    setValidNameRadio(newRadioValue);
    if (newRadioValue === "own") handleChange("valid_name_id", trimmedId || null);
  };

  const handleTypeTaxaRadio = (e) => {
    const newRadioValue = e.target.value;
    const trimmedId = form.id?.trim();
    setTypeTaxaRadio(newRadioValue);
    if (newRadioValue === "own") handleChange("type_taxa_id", trimmedId || null);
  };

  const handleAuthorAdd = useCallback((newAuthor) => {
    if (newAuthor) {
      if (!allAuthors.some(a => a.id === newAuthor.id)) {
        setAllAuthors(prev => [...prev, newAuthor].sort((a, b) => a.last_name_eng.localeCompare(b.last_name_eng)));
      }
      if (!selectedAuthors.some(a => a.id === newAuthor.id)) {
        setSelectedAuthors(prev => [...prev, newAuthor]);
      }
    }
    setShowAddAuthor(false);
  }, [allAuthors, selectedAuthors]);

  const handleAuthorRemove = useCallback((idToRemove) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== idToRemove));
  }, []);

  const handleClosePublicationDialog = useCallback((refresh = false) => {
    setShowAddPublication(false);
    if (refresh) fetchOptions();
  }, [fetchOptions]);

  const handleImgRowChange = useCallback((idx, field, val) => {
    setImgRows(r => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  }, []);

  const addImgRow = useCallback(() => {
    setImgRows(r => [...r, { title: "", url: "" }]);
  }, []);

  const removeImgRow = useCallback((idx) => {
    setImgRows(r => r.filter((_, i) => i !== idx));
  }, []);

  const handleTypeCategoryAdd = useCallback((newCategory) => {
      if(newCategory && !typeCategories.some(tc => tc.id === newCategory.id)){
        setTypeCategories(prev => [...prev, newCategory].sort((a, b) => a.id.localeCompare(b.id)));
      }
      setShowAddTypeCategory(false);
  }, [typeCategories]);

  const renderPublicationLabel = (p) => {
     if (!p) return "";
     const pubAuthors = (p.publications_authors || []).sort((a, b) => a.author_order - b.author_order).map(pa => pa.authors?.last_name_eng).filter(Boolean);
     let authorStr = pubAuthors.slice(0, 3).join(", ");
     if (pubAuthors.length > 3) authorStr += ", et al.";
     const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
     const title = p.title_english || "[No Title]";
     const journal = p.journal?.name_english || "";
     const volume = p.volume ? ` ${p.volume}` : "";
     const number = p.number ? `(${p.number})` : "";
     const pageInfo = p.page ? `: ${p.page}` : "";
     const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";
     return `${authorStr} (${year}). ${title}${journalInfo}`;
  };

  const retryUpdateScientificName = useCallback(async (payload, id, maxRetries = 3, delay = 1000) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { error } = await supabase.from("scientific_names").update(payload).eq("id", id);
        if (!error) return true;
        console.warn(`Update attempt ${attempt} for ${id} failed: ${error.message}`);
        if (attempt < maxRetries) await new Promise(res => setTimeout(res, delay * attempt));
        else throw new Error(`Update failed after ${maxRetries} retries: ${error.message}`);
      }
      return false;
  }, []);

  const imgRowsInvalid = useMemo(() => imgRows.some(r => {
    const titleFilled = r.title.trim() !== "";
    const urlFilled = r.url.trim() !== "";
    return (titleFilled !== urlFilled) || (urlFilled && !urlRegex.test(r.url));
  }), [imgRows, urlRegex]);

  const errors = useMemo(
    () => ({
      id: !form.id?.trim(),
      nameSpell: !form.name_spell_valid?.trim(),
      currentRank: !form.current_rank,
      current_parent: !form.current_parent,
      authority: selectedAuthors.length === 0,
      authorityYear: !form.authority_year?.trim() || !/^\d{4}$/.test(form.authority_year),
      validNameId: validNameRadio === "other" && !form.valid_name_id,
      typeTaxaId: typeTaxaRadio === "other" && !form.type_taxa_id,
      zoobankUrl: !!form.zoobank_url && !/^https?:\/\/(www\.)?zoobank\.org\/.+$/i.test(form.zoobank_url),
      typeImg: imgRowsInvalid,
    }),
    [form, selectedAuthors, validNameRadio, typeTaxaRadio, imgRowsInvalid]
  );

  const handleAdd = useCallback(async () => {
    if (Object.values(errors).some(Boolean)) {
      alert("Please fix the errors indicated in the form before submitting.");
      return;
    }
    setLoading(true);
    const trimmedId = form.id.trim();
    const imgObj = imgRows.reduce((acc, { title, url }) => {
      const t = title.trim();
      const u = url.trim();
      if (t && u && urlRegex.test(u)) acc[t] = u;
      return acc;
    }, {});
    const finalTypeImgUrls = Object.keys(imgObj).length > 0 ? imgObj : null;
    let finalTypeLocality = form.type_locality;
    if (form.current_rank && RanksNoLocalityConst.includes(form.current_rank.toLowerCase())) {
      finalTypeLocality = null;
    } else if (finalTypeLocality === "") {
      finalTypeLocality = null;
    }
    const partialPayload = {
      id: trimmedId,
      name_spell_valid: form.name_spell_valid.trim(),
      name_spell_original: form.name_spell_original?.trim() || null,
      current_rank: form.current_rank,
      original_rank: form.original_rank || null,
      extant_fossil: form.extant_fossil || null,
      remark: form.remark?.trim() || null,
      authority_year: form.authority_year.trim(),
      type_sex: form.type_sex || null,
      type_locality: finalTypeLocality,
      type_repository_id: form.type_repository_id || null,
      type_host: form.type_host || null,
      page: form.page?.trim() || null,
      type_category: form.type_category || null,
      zoobank_url: form.zoobank_url?.trim() || null,
      type_img_urls: finalTypeImgUrls,
      last_update: new Date().toISOString(),
    };
    try {
      const { data: dup, error: checkError } = await supabase.from("scientific_names").select("id").eq("id", trimmedId).maybeSingle();
      if (checkError) throw new Error(`Failed to check for duplicate ID: ${checkError.message}`);
      if (dup) throw new Error(`Duplicate ID found: ${trimmedId}. Please use a unique ID.`);
      const { error: insertError } = await supabase.from("scientific_names").insert([partialPayload]);
      if (insertError) throw new Error(`Insert failed (Step 1): ${insertError.message} (Details: ${insertError.details})`);
      const updatePayload = {
          current_parent: form.current_parent || null,
          original_parent: form.original_parent || null,
          valid_name_id: (validNameRadio === "own" ? trimmedId : form.valid_name_id) || null,
          type_taxa_id: (typeTaxaRadio === "own" ? trimmedId : form.type_taxa_id) || null,
          source_of_original_description: form.source_of_original_description || null,
          last_update: new Date().toISOString(),
      };
      await retryUpdateScientificName(updatePayload, trimmedId);
      if (selectedAuthors.length > 0) {
        const authorLinks = selectedAuthors.map((author, index) => ({
          scientific_name_id: trimmedId,
          researcher_id: author.id,
          author_order: index + 1,
        }));
        const { error: relError } = await supabase.from("scientific_name_and_author").insert(authorLinks);
        if (relError) alert(`Scientific Name added, but failed to link authors: ${relError.message}. Please check author relationships manually.`);
      }
      const finalFormData = { ...partialPayload, ...updatePayload };
      setAuditLogProps({
        tableName: "scientific_names",
        rowId: trimmedId,
        action: "INSERT",
        beforeData: null,
        afterData: finalFormData,
        onComplete: () => {
          setLoading(false);
          alert("Scientific Name added successfully and audit log recorded!");
          onClose(true);
        },
        onError: (logError) => {
          setLoading(false);
          console.error("Audit log recording failed:", logError);
          alert("Scientific Name added successfully, but failed to record audit log. Please report this issue.");
          onClose(true);
        },
      });
    } catch (error) {
      console.error("Add operation failed:", error);
      alert(`Error adding scientific name: ${error.message}.`);
      setLoading(false);
    }
  }, [form, errors, imgRows, selectedAuthors, validNameRadio, typeTaxaRadio, onClose, setAuditLogProps, retryUpdateScientificName]);

  if (loading && !auditLogProps) {
    return <LoadingScreen message="Loading initial data..." />;
  }

  return (
    <>
      {loading && auditLogProps && <LoadingScreen message="Saving and Recording Audit Log..." />}
      <Dialog open={!loading || !!auditLogProps} onClose={() => !loading && onClose(false)} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>Add New Scientific Name</DialogTitle>
        {form.id?.trim() && (
          <Box sx={{ px: 3, pt: 1, pb: 2, bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Current ID:</Typography>
            <Typography variant="h6" sx={{ color: "primary.main", wordBreak: "break-all" }}>{form.id}</Typography>
          </Box>
        )}
        <DialogContent dividers>
          <SectionIdSource
              form={form} handleChange={handleChange} errors={errors}
              publications={publications} renderPublicationLabel={renderPublicationLabel}
              onShowAddPublication={() => setShowAddPublication(true)}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionNameSpelling form={form} handleChange={handleChange} errors={errors} />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionZooBank form={form} handleChange={handleChange} errors={errors} />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionAuthority
              form={form} handleChange={handleChange} errors={errors}
              allAuthors={allAuthors} selectedAuthors={selectedAuthors} setSelectedAuthors={setSelectedAuthors}
              authorInputValue={authorInputValue} setAuthorInputValue={setAuthorInputValue}
              handleAuthorRemove={handleAuthorRemove} onShowAddAuthor={() => setShowAddAuthor(true)}
              yearOptions={yearOptions}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionTaxonomy form={form} handleChange={handleChange} errors={errors} ranks={ranks} scientificNameData={scientificNames} refresh={refresh} />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionRelationship
              form={form} handleChange={handleChange} errors={errors} names={names}
              validNameRadio={validNameRadio} handleValidNameRadio={handleValidNameRadio}
              typeTaxaRadio={typeTaxaRadio} handleTypeTaxaRadio={handleTypeTaxaRadio}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionTypeSpecimen
              form={form} handleChange={handleChange} errors={errors}
              typeCategories={typeCategories} onShowAddTypeCategory={() => setShowAddTypeCategory(true)}
              countriesList={countriesList} RanksNoLocalityConst={RanksNoLocalityConst}
              scientificNameData={scientificNames} imgRows={imgRows} handleImgRowChange={handleImgRowChange}
              addImgRow={addImgRow} removeImgRow={removeImgRow} urlRegex={urlRegex}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionOtherInfo form={form} handleChange={handleChange} statuses={statuses} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose(false)} color="secondary" disabled={loading}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" color="primary" disabled={ loading || Object.values(errors).some(Boolean) }>
            {loading ? "Saving..." : "Add Scientific Name"}
          </Button>
        </DialogActions>
      </Dialog>
      <DialogAuthorAdd open={showAddAuthor} onClose={() => setShowAddAuthor(false)} onAdd={handleAuthorAdd} />
      {showAddPublication && <DialogPublicationAdd open={showAddPublication} onClose={handleClosePublicationDialog} />}
      {showAddTypeCategory && <DialogTypeCategoryAdd open={showAddTypeCategory} onClose={() => setShowAddTypeCategory(false)} onAdd={handleTypeCategoryAdd} />}
      {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
    </>
  );
}