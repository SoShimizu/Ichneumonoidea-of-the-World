// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/DialogScientificNameAdd.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Divider, Typography,
} from "@mui/material";

import supabase from "../../../../../utils/supabase";
import fetchSupabaseAllWithOrdering from "../../../../../utils/fetchSupabaseAllWithOrdering";

import DialogPublicationAdd from "../DialogPublicationAdd";
import AuditLogUpdater from "../../../AuditLogUpdater/AuditLogUpdater";
import LoadingScreen from "../../../../LoadingScreen";
import DialogTypeCategoryAdd from "../DialogTypeCategoryAdd";

import SectionIdSource from "./Sections/SectionIdSource";
import SectionNameSpelling from "./Sections/SectionNameSpelling";
import SectionZooBank from "./Sections/SectionZooBank";
import SectionAuthority from "./Sections/SectionAuthority";
import SectionTaxonomy from "./Sections/SectionTaxonomy";
import SectionRelationship from "./Sections/SectionRelationship";
import SectionTypeSpecimen from "./Sections/SectionTypeSpecimen";
import SectionOtherInfo from "./Sections/SectionOtherInfo";
import useFetchScientificNames from "../../myHooks/useFetchScientificNames";

const TAG = "[DialogScientificNameAdd]";

const RanksNoLocalityConst = [
  "subgenus", "genus", "family", "order", "class", "phylum", "kingdom",
];
const urlRegex = /^https?:\/\/[^\s]+$/i;

/** UUID 正規化（Repository セレクタなどの複合オブジェクト→uuid） */
function asUuidOrNull(v) {
  if (!v) return null;
  if (typeof v === "string") return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
  if (typeof v === "object") {
    if (v.parent_uuid && /^[0-9a-f-]{36}$/i.test(v.parent_uuid)) return v.parent_uuid;
    if (v.uuid && /^[0-9a-f-]{36}$/i.test(v.uuid)) return v.uuid;
    if (v.id && /^[0-9a-f-]{36}$/i.test(v.id)) return v.id;
  }
  return null;
}
/** ID 正規化（Publication など） */
function asIdOrNull(v) {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && v.id) return String(v.id);
  return null;
}

export default function DialogScientificNameAdd({ onClose }) {
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
    source_of_original_description: null, // publication id
    valid_name_id: null,
    type_taxa_id: null,
    type_locality: null,
    type_repository_id: null,             // UUID 必須
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
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [names, setNames] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [publications, setPublications] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [typeCategories, setTypeCategories] = useState([]);
  const [showAddTypeCategory, setShowAddTypeCategory] = useState(false);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const pastYears = Array.from({ length: 150 }, (_, i) => `${currentYear - i}`);
    const futureYears = Array.from({ length: 10 }, (_, i) => `${currentYear + 1 + i}`);
    return [...futureYears.reverse(), ...pastYears];
  }, []);

  const { scientificNames, refresh } = useFetchScientificNames();

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      console.debug(`${TAG} fetchOptions:start`);
      const fetchedNamesArray = await fetchSupabaseAllWithOrdering({
        tableName: "scientific_names",
        selectQuery: "id",
        orderOptions: [{ column: "id" }],
      });
      setNames(Array.isArray(fetchedNamesArray) ? fetchedNamesArray.map((d) => d.id) : []);

      const [ranksRes, statusesRes, pubsRes, countriesRes, typeCatsRes] = await Promise.all([
        supabase.from("rank").select("id").order("id"),
        supabase.from("extant_fossil").select("id").order("id"),
        // ★ researchers に正規化（400 対策）
        supabase
          .from("publications")
          .select(`
            id, title_english, publication_date, volume, number, page,
            journal:journal_id(name_english),
            publications_authors(
              author_order,
              researchers:researcher_id(last_name, first_name)
            )
          `)
          .order("id"),
        supabase.from("countries").select("id").order("id"),
        supabase.from("type_categories").select("*").order("id"),
      ]);

      if (ranksRes.error) console.error(`${TAG} ranks error`, ranksRes.error);
      else setRanks((ranksRes.data || []).map((d) => d.id));

      if (statusesRes.error) console.error(`${TAG} statuses error`, statusesRes.error);
      else setStatuses((statusesRes.data || []).map((d) => d.id));

      if (pubsRes.error) console.warn(`${TAG} publications warning`, pubsRes.error);
      else setPublications(pubsRes.data || []);

      if (countriesRes.error) console.error(`${TAG} countries error`, countriesRes.error);
      else setCountriesList(countriesRes.data || []);

      if (typeCatsRes.error) console.error(`${TAG} typeCats error`, typeCatsRes.error);
      else setTypeCategories(typeCatsRes.data || []);
    } catch (error) {
      console.error(`${TAG} fetchOptions fatal`, error);
      alert(`Failed to load initial data: ${error.message || error}`);
    } finally {
      setLoading(false);
      console.debug(`${TAG} fetchOptions:done`);
    }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  useEffect(() => {
    const trimmedId = form.id?.trim();
    if (trimmedId && !validNameRadio) setValidNameRadio("own");
    if (trimmedId && !typeTaxaRadio) setTypeTaxaRadio("own");
    if (validNameRadio === "own") handleChange("valid_name_id", trimmedId || null);
    if (typeTaxaRadio === "own") handleChange("type_taxa_id", trimmedId || null);
  }, [form.id, validNameRadio, typeTaxaRadio, handleChange]);

  const handleValidNameRadio = (e) => {
    const v = e.target.value;
    const trimmedId = form.id?.trim();
    setValidNameRadio(v);
    if (v === "own") handleChange("valid_name_id", trimmedId || null);
  };

  const handleTypeTaxaRadio = (e) => {
    const v = e.target.value;
    const trimmedId = form.id?.trim();
    setTypeTaxaRadio(v);
    if (v === "own") handleChange("type_taxa_id", trimmedId || null);
  };

  const handleClosePublicationDialog = useCallback((refreshFlag = false) => {
    setShowAddPublication(false);
    if (refreshFlag) fetchOptions();
  }, [fetchOptions]);

  const handleImgRowChange = useCallback((idx, field, val) => {
    setImgRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  }, []);
  const addImgRow = useCallback(() => setImgRows((r) => [...r, { title: "", url: "" }]), []);
  const removeImgRow = useCallback((idx) => setImgRows((r) => r.filter((_, i) => i !== idx)), []);

  const handleTypeCategoryAdd = useCallback((newCategory) => {
    if (newCategory && !typeCategories.some((tc) => tc.id === newCategory.id)) {
      setTypeCategories((prev) => [...prev, newCategory].sort((a, b) => a.id.localeCompare(b.id)));
    }
    setShowAddTypeCategory(false);
  }, [typeCategories]);

  // Publication 表示ラベル（著者は「,」で並べ、最後だけ「 & 」）
  const renderPublicationLabel = (p) => {
    if (!p) return "";
    const authors = (p.publications_authors || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map((pa) => pa.researchers?.last_name)
      .filter(Boolean);

    let authorStr = "";
    if (authors.length === 1) authorStr = authors[0];
    else if (authors.length === 2) authorStr = `${authors[0]} & ${authors[1]}`;
    else if (authors.length >= 3) authorStr = `${authors.slice(0, -1).join(", ")} & ${authors[authors.length - 1]}`;

    const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
    const title = p.title_english || "[No Title]";
    const journal = p.journal?.name_english || "";
    const volume = p.volume ? ` ${p.volume}` : "";
    const number = p.number ? `(${p.number})` : "";
    const pageInfo = p.page ? `: ${p.page}` : "";
    const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";
    return `${authorStr ? authorStr + " " : ""}(${year}). ${title}${journalInfo}`;
  };

  const retryUpdateScientificName = useCallback(async (payload, id, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { error } = await supabase.from("scientific_names").update(payload).eq("id", id);
      if (!error) return true;
      console.warn(`${TAG} Update attempt ${attempt} for ${id} failed: ${error.message}`);
      if (attempt < maxRetries) await new Promise((res) => setTimeout(res, delay * attempt));
      else throw new Error(`Update failed after ${maxRetries} retries: ${error.message}`);
    }
    return false;
  }, []);

  const imgRowsInvalid = useMemo(
    () =>
      imgRows.some((r) => {
        const titleFilled = r.title.trim() !== "";
        const urlFilled = r.url.trim() !== "";
        return (titleFilled !== urlFilled) || (urlFilled && !urlRegex.test(r.url));
      }),
    [imgRows]
  );

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

    // 画像 dict
    const imgObj = imgRows.reduce((acc, { title, url }) => {
      const t = title.trim();
      const u = url.trim();
      if (t && u && urlRegex.test(u)) acc[t] = u;
      return acc;
    }, {});
    const finalTypeImgUrls = Object.keys(imgObj).length > 0 ? imgObj : null;

    // locality の null 化
    let finalTypeLocality = form.type_locality;
    if (form.current_rank && RanksNoLocalityConst.includes(form.current_rank.toLowerCase())) finalTypeLocality = null;
    else if (finalTypeLocality === "") finalTypeLocality = null;

    // 正規化
    const repoUuid = asUuidOrNull(form.type_repository_id);
    const sourcePubId = asIdOrNull(form.source_of_original_description);
    const trimmedId = form.id.trim();

    console.debug(`${TAG} preflight`, {
      raw: {
        type_repository_id: form.type_repository_id,
        source_of_original_description: form.source_of_original_description,
      },
      normalized: {
        type_repository_id: repoUuid,
        source_of_original_description: sourcePubId,
      },
    });

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
      type_repository_id: repoUuid,
      type_host: form.type_host || null,
      page: form.page?.trim() || null,
      type_category: form.type_category || null,
      zoobank_url: form.zoobank_url?.trim() || null,
      type_img_urls: finalTypeImgUrls,
      last_update: new Date().toISOString(),
    };

    try {
      if (form.type_repository_id && !repoUuid) {
        throw new Error(
          `Invalid repository value for 'type_repository_id'. Expect UUID. Raw value: ${JSON.stringify(form.type_repository_id)}`
        );
      }

      // 既存IDチェック
      const { data: dup, error: checkError } = await supabase
        .from("scientific_names")
        .select("id")
        .eq("id", trimmedId)
        .maybeSingle();
      if (checkError) throw new Error(`Failed to check for duplicate ID: ${checkError.message}`);
      if (dup) throw new Error(`Duplicate ID found: ${trimmedId}. Please use a unique ID.`);

      console.debug(`${TAG} insert:payload`, partialPayload);
      const { error: insertError } = await supabase.from("scientific_names").insert([partialPayload]);
      if (insertError) {
        console.error(`${TAG} insert error`, insertError);
        throw new Error(`Insert failed (Step 1): ${insertError.message} (Details: ${insertError.details})`);
      }

      const updatePayload = {
        current_parent: form.current_parent || null,
        original_parent: form.original_parent || null,
        valid_name_id: (validNameRadio === "own" ? trimmedId : form.valid_name_id) || null,
        type_taxa_id: (typeTaxaRadio === "own" ? trimmedId : form.type_taxa_id) || null,
        source_of_original_description: sourcePubId,
        last_update: new Date().toISOString(),
      };
      console.debug(`${TAG} update:payload`, updatePayload);
      await retryUpdateScientificName(updatePayload, trimmedId);

      if (selectedAuthors.length > 0) {
        const authorLinks = selectedAuthors.map((a, i) => ({
          scientific_name_id: trimmedId,
          researcher_id: a.id,
          author_order: i + 1,
        }));
        console.debug(`${TAG} insert authors`, authorLinks);
        const { error: relError } = await supabase.from("scientific_name_and_author").insert(authorLinks);
        if (relError) {
          console.warn(`${TAG} authors link failed`, relError);
          alert(
            `Scientific Name added, but failed to link authors: ${relError.message}. Please check author relationships manually.`
          );
        }
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
          console.error(`${TAG} audit log failed`, logError);
          alert("Scientific Name added successfully, but failed to record audit log. Please report this issue.");
          onClose(true);
        },
      });
    } catch (error) {
      console.error(`${TAG} add failed`, error);
      alert(`Error adding scientific name: ${error.message}.`);
      setLoading(false);
    }
  }, [form, errors, imgRows, selectedAuthors, validNameRadio, typeTaxaRadio, onClose, setAuditLogProps, retryUpdateScientificName]);

  if (loading && !auditLogProps) return <LoadingScreen message="Loading initial data..." />;

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
            form={form}
            handleChange={handleChange}
            errors={errors}
            publications={publications}
            renderPublicationLabel={renderPublicationLabel}
            onShowAddPublication={() => setShowAddPublication(true)}
            // ★ PublicationSelector が再フェッチできるように渡す
            onRefreshPublications={fetchOptions}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionNameSpelling form={form} handleChange={handleChange} errors={errors} />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionZooBank form={form} handleChange={handleChange} errors={errors} />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionAuthority
            form={form}
            handleChange={handleChange}
            errors={errors}
            selectedAuthors={selectedAuthors}
            setSelectedAuthors={setSelectedAuthors}
            yearOptions={yearOptions}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionTaxonomy
            form={form}
            handleChange={handleChange}
            errors={errors}
            ranks={ranks}
            scientificNameData={scientificNames}
            refresh={refresh}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionRelationship
            form={form}
            handleChange={handleChange}
            errors={errors}
            names={names}
            validNameRadio={validNameRadio}
            handleValidNameRadio={handleValidNameRadio}
            typeTaxaRadio={typeTaxaRadio}
            handleTypeTaxaRadio={handleTypeTaxaRadio}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionTypeSpecimen
            form={form}
            handleChange={handleChange}
            errors={errors}
            typeCategories={typeCategories}
            onShowAddTypeCategory={() => setShowAddTypeCategory(true)}
            countriesList={countriesList}
            RanksNoLocalityConst={RanksNoLocalityConst}
            scientificNameData={scientificNames}
            imgRows={imgRows}
            handleImgRowChange={handleImgRowChange}
            addImgRow={addImgRow}
            removeImgRow={removeImgRow}
          />
          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionOtherInfo form={form} handleChange={handleChange} statuses={statuses} />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose(false)} color="secondary" disabled={loading}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" color="primary" disabled={loading || Object.values(errors).some(Boolean)}>
            {loading ? "Saving..." : "Add Scientific Name"}
          </Button>
        </DialogActions>
      </Dialog>

      {showAddPublication && <DialogPublicationAdd open={showAddPublication} onClose={handleClosePublicationDialog} />}

      {showAddTypeCategory && (
        <DialogTypeCategoryAdd
          open={showAddTypeCategory}
          onClose={() => setShowAddTypeCategory(false)}
          onAdd={handleTypeCategoryAdd}
        />
      )}

      {auditLogProps && <AuditLogUpdater {...auditLogProps} />}
    </>
  );
}
