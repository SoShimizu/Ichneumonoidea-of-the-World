import React, { useState, useEffect, useMemo, useCallback } from "react"; // useCallback を追加
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Divider, Typography, // Typography は ID Banner で使用
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
// パスは上記の前提構成に基づいています
import SectionIdSource        from "./Sections/SectionIdSource";
import SectionNameSpelling    from "./Sections/SectionNameSpelling";
import SectionZooBank         from "./Sections/SectionZooBank";
import SectionAuthority       from "./Sections/SectionAuthority";
import SectionTaxonomy        from "./Sections/SectionTaxonomy";
import SectionRelationship    from "./Sections/SectionRelationship";
import SectionTypeSpecimen    from "./Sections/SectionTypeSpecimen";
import SectionOtherInfo       from "./Sections/SectionOtherInfo";
import useFetchScientificNames from "../../myHooks/useFetchScientificNames";
// ---------------------------------------------

/* ――― 定数 ――― */
const RanksNoLocalityConst = [
  "subgenus", "genus", "family", "order", "class", "phylum", "kingdom",
];

// URL Regex (コンポーネント外で定義)
const urlRegex = /^https?:\/\/[^\s]+$/i;

/* ――――――――――――――――――――――――――――――――――――――― */
export default function DialogScientificNameAdd({ onClose }) {
  /* ────────────── state ────────────── */
  const [form, setForm] = useState({
    id: "",
    name_spell_valid: "",
    name_spell_original: null, // Use null for optional empty strings
    current_rank: null,
    original_rank: null,
    current_parent: null,
    original_parent: null,
    extant_fossil: null,
    remark: "", // Use "" for required empty strings if needed, or null
    authority_year: "", // Usually string
    type_sex: "", // Use "" for empty selection
    source_of_original_description: null,
    valid_name_id: null,
    type_taxa_id: null,
    type_locality: null,
    type_repository: null,
    type_host: null,
    page: "",
    type_category: "", // Use "" for empty selection
    zoobank_url: null,
    type_img_urls: null, // Stored as JSON object
    // last_update is set during add
  });
  const [imgRows, setImgRows] = useState([{ title: "", url: "" }]);
  const [loading, setLoading] = useState(true);
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [auditLogProps, setAuditLogProps] = useState(null);
  const [validNameRadio, setValidNameRadio] = useState(""); // "own" or "other"
  const [typeTaxaRadio, setTypeTaxaRadio] = useState("");   // "own" or "other"
  const [allAuthors, setAllAuthors] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [authorInputValue, setAuthorInputValue] = useState("");
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [ranks, setRanks] = useState([]);
  const [names, setNames] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [publications, setPublications] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [typeCategories, setTypeCategories] = useState([]);
  const [showAddTypeCategory, setShowAddTypeCategory] = useState(false);
  const [showRepoDialog, setShowRepoDialog] = useState(false);

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
    // Ensure names is an array of strings before attempting operations
    const validNames = Array.isArray(names) && names.every(item => typeof item === 'string') ? names : [];

    if (trimmedId && !validNames.includes(trimmedId)) {
        return [...validNames, trimmedId].sort();
    }
    return [...validNames].sort(); // Return sorted copy
  }, [names, form.id]);

  /* ────────────── handlers ────────────── */
  // useCallback で handleChange の参照を安定させる (useEffect の依存回避のため)
  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const fetchOptions = useCallback(async () => {
    console.log("fetchOptions called");
    setLoading(true);
    try {
      // --- 名前リスト取得部分の修正 ---
      console.log("Fetching scientific names...");
      // fetchSupabaseAllWithOrdering を呼び出し、戻り値（配列のはず）を直接受け取る
      const fetchedNamesArray = await fetchSupabaseAllWithOrdering({
        tableName: "scientific_names",
        selectQuery: "id", // 'id' カラムを含むオブジェクトの配列が返ると想定
        orderOptions: [{ column: "id" }],
      });

      if (Array.isArray(fetchedNamesArray)) {
        console.log("Debug: Raw data received from utility:", fetchedNamesArray);
        // map を使って id の配列に変換
        const mappedNames = fetchedNamesArray.map(d => d.id);
        console.log("Debug: Mapped names:", mappedNames);
        setNames(mappedNames); // state を更新
      } else {
        // ユーティリティが配列を返さなかった場合のフォールバック
        console.warn("fetchSupabaseAllWithOrdering did not return an array for names. Setting names to empty.", fetchedNamesArray);
        setNames([]); // 安全のため空配列をセット
      }

      console.log("Fetching other parallel data...");
      const [authorsRes, ranksRes, statusesRes, pubsRes, reposRes, countriesRes, typeCatsRes] = await Promise.all([
        supabase.from("authors").select("id, first_name_eng, last_name_eng").order("last_name_eng"),
        supabase.from("rank").select("id").order("id"),
        supabase.from("extant_fossil").select("id").order("id"),
        supabase.from("publications").select(`id, title_english, publication_date, volume, number, page, journal:journal_id(name_english), publications_authors(author_order, authors(last_name_eng))`).order("id"),
        supabase.from("Repositories").select("id, full_name").order("id"),
        supabase.from("countries").select("id").order("id"),
        supabase.from("type_categories").select("*").order("id"),
      ]);

      // 並列取得したデータのエラーハンドリングと state 更新 (この部分も変更なし)
      if (authorsRes.error) console.error("Error fetching authors:", authorsRes.error); else setAllAuthors(authorsRes.data || []);
      if (ranksRes.error) console.error("Error fetching ranks:", ranksRes.error); else setRanks((ranksRes.data || []).map(d => d.id));
      if (statusesRes.error) console.error("Error fetching statuses:", statusesRes.error); else setStatuses((statusesRes.data || []).map(d => d.id));
      if (pubsRes.error) console.error("Error fetching publications:", pubsRes.error); else setPublications(pubsRes.data || []);
      if (reposRes.error) console.error("Error fetching repositories:", reposRes.error); else setRepositories(reposRes.data || []);
      if (countriesRes.error) console.error("Error fetching countries:", countriesRes.error); else setCountriesList(countriesRes.data || []);
      if (typeCatsRes.error) console.error("Error fetching type categories:", typeCatsRes.error); else setTypeCategories(typeCatsRes.data || []);

    } catch (error) {
      // fetchSupabaseAllWithOrdering 内で throw されたエラーや、Promise.all のエラーをここで捕捉
      console.error("Error during fetchOptions:", error);
      alert(`Failed to load initial data: ${error.message || error}`);
      // ★★★ エラー発生時は names state を空にする ★★★
      setNames([]);
      // 必要であれば他の state もリセット
      setAllAuthors([]);
      setRanks([]);
      setStatuses([]);
      setPublications([]);
      setRepositories([]);
      setCountriesList([]);
      setTypeCategories([]);
      // ...など
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // useCallback の依存配列は空のまま

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]); // useEffect dependency

  // Effect to manage relationship radio buttons based on form.id
  useEffect(() => {
    const trimmedId = form.id?.trim();
    // Set default radio button state only if ID exists and state is not yet set
    if (trimmedId && !validNameRadio) {
      setValidNameRadio("own");
    }
    if (trimmedId && !typeTaxaRadio) {
      setTypeTaxaRadio("own");
    }
    // Update corresponding ID field when radio is "own"
    if (validNameRadio === "own") {
      handleChange("valid_name_id", trimmedId || null);
    }
    if (typeTaxaRadio === "own") {
      handleChange("type_taxa_id", trimmedId || null);
    }
  }, [form.id, validNameRadio, typeTaxaRadio, handleChange]); // Include handleChange due to useCallback

  /* ────────────── Handlers (continued) ────────────── */
  const handleValidNameRadio = (e) => {
    const newRadioValue = e.target.value;
    const trimmedId = form.id?.trim();
    setValidNameRadio(newRadioValue);
    if (newRadioValue === "own") {
      handleChange("valid_name_id", trimmedId || null);
    } else {
      // Optionally clear the field when switching to "other" if nothing is selected yet
      // handleChange("valid_name_id", null);
    }
  };

  const handleTypeTaxaRadio = (e) => {
    const newRadioValue = e.target.value;
    const trimmedId = form.id?.trim();
    setTypeTaxaRadio(newRadioValue);
    if (newRadioValue === "own") {
      handleChange("type_taxa_id", trimmedId || null);
    } else {
      // Optionally clear the field
      // handleChange("type_taxa_id", null);
    }
  };

  const handleAuthorAdd = useCallback((newAuthor) => { // useCallback
    if (newAuthor) {
        // Add to master list if new
      if (!allAuthors.some(a => a.id === newAuthor.id)) {
        setAllAuthors(prev => [...prev, newAuthor].sort((a, b) => a.last_name_eng.localeCompare(b.last_name_eng)));
      }
      // Add to selected list if not already present
      if (!selectedAuthors.some(a => a.id === newAuthor.id)) {
        setSelectedAuthors(prev => [...prev, newAuthor]);
      }
    }
    setShowAddAuthor(false); // Close the dialog
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAuthors, selectedAuthors]); // Dependencies: lists being modified

  const handleAuthorRemove = useCallback((idToRemove) => { // useCallback
    setSelectedAuthors(prev => prev.filter(a => a.id !== idToRemove));
  }, []);

  const handleOpenRepoDialog = useCallback(() => setShowRepoDialog(true), []); // useCallback

  const handleCloseRepoDialog = useCallback((refresh = false) => { // useCallback
    setShowRepoDialog(false);
    if (refresh) {
      fetchOptions(); // Re-fetch data if repository list was updated
    }
  }, [fetchOptions]); // Dependency: fetchOptions

  const handleClosePublicationDialog = useCallback((refresh = false) => { // useCallback
    setShowAddPublication(false);
    if (refresh) {
      fetchOptions(); // Re-fetch data if publication list was updated
    }
  }, [fetchOptions]); // Dependency: fetchOptions

  /* ------ type-image rows handlers ------ */
  const handleImgRowChange = useCallback((idx, field, val) => { // useCallback
    setImgRows(r => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  }, []);

  const addImgRow = useCallback(() => { // useCallback
    setImgRows(r => [...r, { title: "", url: "" }]);
  }, []);

  const removeImgRow = useCallback((idx) => { // useCallback
    setImgRows(r => r.filter((_, i) => i !== idx));
  }, []);
  /* ------------------------------------ */

  const handleTypeCategoryAdd = useCallback((newCategory) => { // useCallback
      if(newCategory && !typeCategories.some(tc => tc.id === newCategory.id)){
        setTypeCategories(prev => [...prev, newCategory].sort((a, b) => a.id.localeCompare(b.id)));
      }
      setShowAddTypeCategory(false); // Close the dialog
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeCategories]); // Dependency: list being modified

  /* ────────────── utils ────────────── */
  // renderPublicationLabel can often be pure, no need for useCallback unless complex/expensive
  const renderPublicationLabel = (p) => {
     if (!p) return "";
     // Ensure authors are loaded and sorted correctly
     const pubAuthors = (p.publications_authors || [])
       .sort((a, b) => a.author_order - b.author_order)
       .map(pa => pa.authors?.last_name_eng)
       .filter(Boolean); // Ensure names exist

     let authorStr = pubAuthors.slice(0, 3).join(", ");
     if (pubAuthors.length > 3) authorStr += ", et al.";

     const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
     const title = p.title_english || "[No Title]";
     const journal = p.journal?.name_english || "";
     const volume = p.volume ? ` ${p.volume}` : "";
     const number = p.number ? `(${p.number})` : "";
     const pageInfo = p.page ? `: ${p.page}` : "";
     // Construct journal info only if journal name exists
     const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";

     return `${authorStr} (${year}). ${title}${journalInfo}`;
  };

  // retryUpdateScientificName function using Supabase
  const retryUpdateScientificName = useCallback(async (payload, id, maxRetries = 3, delay = 1000) => {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       console.log(`Attempt ${attempt} to update scientific name ${id}`);
       const { error } = await supabase.from("scientific_names").update(payload).eq("id", id);
       if (!error) {
         console.log(`Update successful for ${id} on attempt ${attempt}`);
         return true; // Success
       }
       console.warn(`Update attempt ${attempt} for ${id} failed: ${error.message}`);
       if (attempt < maxRetries) {
         await new Promise(res => setTimeout(res, delay * attempt)); // Exponential backoff
       } else {
         console.error(`Update failed for ${id} after ${maxRetries} retries.`);
         throw new Error(`Update failed after ${maxRetries} retries: ${error.message}`);
       }
     }
     // Should not be reached if error is thrown, but added for completeness
     return false;
  }, []); // No external dependencies for the function logic itself

  /* ────────────── validation ────────────── */
  // imgRowsInvalid calculation (fixed dependencies)
  const imgRowsInvalid = useMemo(() => imgRows.some(r => {
    const titleFilled = r.title.trim() !== "";
    const urlFilled = r.url.trim() !== "";
    // Row is invalid if only one field is filled, or if URL is filled but invalid
    return (titleFilled !== urlFilled) || (urlFilled && !urlRegex.test(r.url));
  }), [imgRows, urlRegex]); // urlRegex is constant but included per ESLint rule

  // errors calculation memo
  const errors = useMemo(
    () => ({
      id: !form.id?.trim(),
      nameSpell: !form.name_spell_valid?.trim(),
      currentRank: !form.current_rank,
      // Parent is required unless it's a Kingdom? Or should always be required?
      // Assuming required for now. Logic might need adjustment based on rules.
      // The Autocomplete already prevents selecting self.
      current_parent: !form.current_parent,
      authority: selectedAuthors.length === 0,
      authorityYear: !form.authority_year?.trim() || !/^\d{4}$/.test(form.authority_year), // Basic 4-digit check
      validNameId: validNameRadio === "other" && !form.valid_name_id,
      typeTaxaId: typeTaxaRadio === "other" && !form.type_taxa_id,
      zoobankUrl: !!form.zoobank_url && !/^https?:\/\/(www\.)?zoobank\.org\/.+$/i.test(form.zoobank_url),
      typeImg: imgRowsInvalid,
    }),
    [form, selectedAuthors, validNameRadio, typeTaxaRadio, imgRowsInvalid]
  );

  /* ────────────── add handler (DB) ────────────── */
  const handleAdd = useCallback(async () => {
    // Re-check errors just before submission
    if (Object.values(errors).some(Boolean)) {
      alert("Please fix the errors indicated in the form before submitting.");
      return;
    }

    setLoading(true);

    const trimmedId = form.id.trim(); // Already validated not empty by errors.id

    // Process image rows into a valid JSON object or null
    const imgObj = imgRows.reduce((acc, { title, url }) => {
      const t = title.trim();
      const u = url.trim();
      // Only include valid, complete rows
      if (t && u && urlRegex.test(u)) {
        acc[t] = u;
      }
      return acc;
    }, {});
    const finalTypeImgUrls = Object.keys(imgObj).length > 0 ? imgObj : null;

    // Determine final type locality (null if rank doesn't require it)
    let finalTypeLocality = form.type_locality;
    if (form.current_rank && RanksNoLocalityConst.includes(form.current_rank.toLowerCase())) {
      finalTypeLocality = null;
    } else if (finalTypeLocality === "") { // Handle empty string selection
      finalTypeLocality = null;
    }

    // Prepare the initial payload, ensuring empty strings become null where appropriate
    const partialPayload = {
      id: trimmedId,
      name_spell_valid: form.name_spell_valid.trim(),
      name_spell_original: form.name_spell_original?.trim() || null,
      current_rank: form.current_rank, // Required
      original_rank: form.original_rank || null,
      // Parents, Valid/Type IDs, and Source are handled in the update step
      extant_fossil: form.extant_fossil || null,
      remark: form.remark?.trim() || null,
      authority_year: form.authority_year.trim(), // Required
      type_sex: form.type_sex || null,
      type_locality: finalTypeLocality,
      type_repository: form.type_repository || null,
      type_host: form.type_host || null, // Needs to be an existing ID or null
      page: form.page?.trim() || null,
      type_category: form.type_category || null,
      zoobank_url: form.zoobank_url?.trim() || null,
      type_img_urls: finalTypeImgUrls,
      last_update: new Date().toISOString(),
      // Fields to set in the second step (update)
      // current_parent, original_parent, valid_name_id, type_taxa_id, source_of_original_description
    };


    try {
      // 1. Check for duplicate ID
      console.log(`Checking for duplicate ID: ${trimmedId}`);
      const { data: dup, error: checkError } = await supabase
        .from("scientific_names")
        .select("id")
        .eq("id", trimmedId)
        .maybeSingle(); // Use maybeSingle for checking existence

      if (checkError) {
          throw new Error(`Failed to check for duplicate ID: ${checkError.message}`);
      }
      if (dup) {
          throw new Error(`Duplicate ID found: ${trimmedId}. Please use a unique ID.`);
      }
      console.log(`ID ${trimmedId} is unique.`);

      // 2. Insert the base record (without self-referential/dependent fields)
      console.log("Inserting base record:", partialPayload);
      const { error: insertError } = await supabase
        .from("scientific_names")
        .insert([partialPayload]);

      if (insertError) {
        console.error("Insert failed:", insertError);
        // Attempt to provide more specific feedback based on error code/details if possible
        throw new Error(`Insert failed (Step 1): ${insertError.message} (Details: ${insertError.details})`);
      }
      console.log("Base record inserted successfully.");


      // 3. Prepare and execute the update for dependent fields
      const updatePayload = {
          current_parent: form.current_parent || null, // Required, already validated
          original_parent: form.original_parent || null,
          valid_name_id: (validNameRadio === "own" ? trimmedId : form.valid_name_id) || null, // Already validated if 'other'
          type_taxa_id: (typeTaxaRadio === "own" ? trimmedId : form.type_taxa_id) || null, // Already validated if 'other'
          source_of_original_description: form.source_of_original_description || null,
          last_update: new Date().toISOString(), // Update timestamp again
      };

      // Filter out null values that shouldn't overwrite potentially existing data if this were an edit
      // For an insert, we want to set these explicitly, even if null.
      console.log("Updating dependent fields:", updatePayload);
      await retryUpdateScientificName(updatePayload, trimmedId);
      console.log("Dependent fields updated successfully.");


      // 4. Insert author relationships
      if (selectedAuthors.length > 0) {
        const authorLinks = selectedAuthors.map((author, index) => ({
          scientific_name_id: trimmedId,
          author_id: author.id,
          author_order: index + 1,
        }));
        console.log("Inserting author relationships:", authorLinks);
        const { error: relError } = await supabase
          .from("scientific_name_and_author")
          .insert(authorLinks);

        if (relError) {
          // This might happen due to foreign key constraints, etc.
          console.error("Failed to link authors:", relError);
          // Decide if this is critical - maybe alert the user but don't rollback?
          // Or attempt cleanup? For now, just log and alert.
           alert(`Scientific Name added, but failed to link authors: ${relError.message}. Please check author relationships manually.`);
          // throw new Error(`Failed to link authors: ${relError.message}`); // Or make it critical
        } else {
            console.log("Author relationships inserted successfully.");
        }
      }

      // 5. Trigger Audit Log (after all DB operations seem successful)
      const finalFormData = { ...partialPayload, ...updatePayload }; // Combine payloads for logging
      setAuditLogProps({
        tableName: "scientific_names",
        rowId: trimmedId, // Ensure rowId is string if required by AuditLogUpdater
        action: "INSERT",
        beforeData: null,
        afterData: finalFormData,
        onComplete: () => {
          setLoading(false); // Stop loading indicator
          alert("Scientific Name added successfully and audit log recorded!");
          onClose(true); // Close dialog and indicate success/refresh needed
        },
        onError: (logError) => {
          setLoading(false); // Stop loading indicator
          console.error("Audit log recording failed:", logError);
          // Even if logging fails, the data was added. Alert the user.
          alert("Scientific Name added successfully, but failed to record audit log. Please report this issue.");
          onClose(true); // Still close dialog and indicate refresh needed
        },
      });

    } catch (error) {
      console.error("Add operation failed:", error);
      alert(`Error adding scientific name: ${error.message}.`);
      setLoading(false); // Ensure loading is reset on any error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      form, errors, imgRows, selectedAuthors, validNameRadio, typeTaxaRadio, // State values used
      onClose, setAuditLogProps, setLoading, retryUpdateScientificName // Functions/props called
  ]); // Dependencies for the add handler

  /* ────────────── render ────────────── */
  if (loading && !auditLogProps) {
    return <LoadingScreen message="Loading initial data..." />;
  }

  return (
    <>
      {/* Show loading screen specifically during audit logging phase */}
      {loading && auditLogProps && <LoadingScreen message="Saving and Recording Audit Log..." />}

      <Dialog
        open={!loading || !!auditLogProps} // Remain open during audit logging unless loading is finished
        onClose={() => !loading && onClose(false)} // Prevent closing while loading/saving
        fullWidth
        maxWidth="md"
        scroll="paper"
       >
        <DialogTitle>Add New Scientific Name</DialogTitle>

        {/* Current ID banner */}
        {form.id?.trim() && (
          <Box sx={{ px: 3, pt: 1, pb: 2, bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Current ID:</Typography>
            <Typography variant="h6" sx={{ color: "primary.main", wordBreak: "break-all" }}>{form.id}</Typography>
          </Box>
        )}

        <DialogContent dividers>
          {/* --- Section Components --- */}
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
             repositories={repositories} onShowRepoDialog={handleOpenRepoDialog}
             scientificNameData={scientificNames} imgRows={imgRows} handleImgRowChange={handleImgRowChange}
             addImgRow={addImgRow} removeImgRow={removeImgRow} urlRegex={urlRegex}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionOtherInfo form={form} handleChange={handleChange} statuses={statuses} />
          {/* ------------------------ */}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
           <Button onClick={() => onClose(false)} color="secondary" disabled={loading}>
             Cancel
           </Button>
           <Button
             onClick={handleAdd}
             variant="contained"
             color="primary"
             // Disable button if loading OR if there are any validation errors
             disabled={ loading || Object.values(errors).some(Boolean) }
           >
             {loading ? "Saving..." : "Add Scientific Name"}
           </Button>
        </DialogActions>
      </Dialog>

      {/* Sub-Dialogs */}
      {/* Ensure sub-dialogs receive necessary props, especially open state and close handlers */}
      <DialogAuthorAdd open={showAddAuthor} onClose={() => setShowAddAuthor(false)} onAdd={handleAuthorAdd} />
      {showAddPublication && <DialogPublicationAdd open={showAddPublication} onClose={handleClosePublicationDialog} />}
      {showRepoDialog && <DialogRepository open={showRepoDialog} onClose={handleCloseRepoDialog} />}
      {showAddTypeCategory && <DialogTypeCategoryAdd open={showAddTypeCategory} onClose={() => setShowAddTypeCategory(false)} onAdd={handleTypeCategoryAdd} />}

      {/* Audit Log Updater (conditionally rendered) */}
      {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
    </>
  );
}