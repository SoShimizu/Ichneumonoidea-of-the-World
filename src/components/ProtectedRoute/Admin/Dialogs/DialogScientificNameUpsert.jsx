// src/components/ProtectedRoute/Admin/Dialogs/ScientificName/DialogScientificNameUpsert.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import supabase from "../../../../utils/supabase";
import BaseDialog from "./Framework/BaseDialog";

import SectionIdSource from "./Sections/SectionIdSource";
import SectionNameSpelling from "./Sections/SectionNameSpelling";
import SectionZooBank from "./Sections/SectionZooBank";
import SectionAuthority from "./Sections/SectionAuthority";
import SectionTaxonomy from "./Sections/SectionTaxonomy";
import SectionRelationship from "./Sections/SectionRelationship";
import SectionTypeSpecimen from "./Sections/SectionTypeSpecimen";
import SectionOtherInfo from "./Sections/SectionOtherInfo";
import useFetchScientificNames from "../myHooks/useFetchScientificNames";

const TAG = "[DialogScientificNameUpsert]";
const RanksNoLocalityConst = ["subgenus", "genus", "family", "order", "class", "phylum", "kingdom"];
const urlRegex = /^https?:\/\/[^\s]+$/i;

const toStr = (v) => (v == null ? "" : String(v));
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
function asIdOrNull(v) {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && v.id != null) return String(v.id);
  return null;
}

/* ---------- Audit log helper ----------
   テーブル: public.audit_log
   カラム:
     table_name text, row_id text, action text,
     actor_id uuid, actor_display text,
     created_at timestamptz default now(),
     before_data jsonb, after_data jsonb, diff jsonb
*/
function buildDiff(before, after) {
  const A = before || {};
  const B = after || {};
  const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  const changed = {};
  for (const k of keys) {
    const av = A[k];
    const bv = B[k];
    if (JSON.stringify(av) !== JSON.stringify(bv)) {
      changed[k] = { before: av ?? null, after: bv ?? null };
    }
  }
  return Object.keys(changed).length ? changed : null;
}

async function writeAudit({ action, id, before = null, after = null }) {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    const actor_id = user?.id ?? null;
    const actor_display = user?.user_metadata?.display_name || user?.email || null;

    const payload = {
      table_name: "scientific_names",
      row_id: id,
      action,
      actor_id,
      actor_display,
      created_at: new Date().toISOString(),
      before_data: before,
      after_data: after,
      diff: buildDiff(before, after),
    };

    const { error } = await supabase.from("audit_log").insert([payload]);
    if (error) console.warn(`${TAG} audit log failed`, error);
  } catch (e) {
    console.warn(`${TAG} audit log skipped`, e);
  }
}

/* ---------- Small utils ---------- */
const chunk = (arr, size) =>
  Array.from({ length: Math.ceil((arr?.length || 0) / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

async function detectExistingTable(tables, probeSelect = "id") {
  for (const t of tables) {
    const res = await supabase.from(t).select(probeSelect).limit(1);
    if (!res.error) return t;
  }
  return null;
}

export default function DialogScientificNameUpsert({
  open = true,
  mode = "add",
  scientificName = null,
  onClose,
}) {
  const isEdit = mode === "edit";

  // ---- form ----
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
    type_repository_id: null, // UUID
    type_host: null,
    page: "",
    type_category: "",
    zoobank_url: null,
    type_img_urls: null,
  });

  // ---- helpers ----
  const [imgRows, setImgRows] = useState([{ title: "", url: "" }]);
  const [validNameRadio, setValidNameRadio] = useState("");
  const [typeTaxaRadio, setTypeTaxaRadio] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState([]);

  const [ranks, setRanks] = useState([]);
  const [names, setNames] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [publications, setPublications] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [typeCategories, setTypeCategories] = useState([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [saving, setSaving] = useState(false);

  const { scientificNames, refresh } = useFetchScientificNames();

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const pastYears = Array.from({ length: 150 }, (_, i) => `${currentYear - i}`);
    const futureYears = Array.from({ length: 10 }, (_, i) => `${currentYear + 1 + i}`);
    return [...futureYears.reverse(), ...pastYears];
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ---------- publications: flat + manual join (400回避) ----------
  async function fetchPublicationsSmart() {
    // 1) publications は最小列のみ
    const { data: pubs, error: pErr } = await supabase
      .from("publications")
      .select("id, title_english, publication_date, volume, number, page, journal_id")
      .order("id");
    if (pErr || !pubs) {
      console.debug("[pubs] flat select failed", pErr);
      return [];
    }

    // 2) journal 名：テーブル名を自動検出
    const jids = Array.from(new Set(pubs.map((p) => p.journal_id).filter(Boolean)));
    let journalMap = new Map();
    if (jids.length) {
      const journalTable = await detectExistingTable(["journals", "journal"], "id");
      if (journalTable) {
        for (const part of chunk(jids, 500)) {
          const { data } = await supabase.from(journalTable).select("id, name_english").in("id", part);
          (data || []).forEach((j) => journalMap.set(j.id, j.name_english));
        }
      }
    }

    // 3) 著者リンク：中間テーブル名を自動検出（ネスト禁止）
    const pubIds = pubs.map((p) => p.id);
    let links = [];
    if (pubIds.length) {
      const linkTable = await detectExistingTable(["publications_authors", "publication_authors"], "publication_id");
      if (linkTable) {
        for (const part of chunk(pubIds, 500)) {
          const res = await supabase
            .from(linkTable)
            .select("publication_id, author_order, researcher_id, author_id")
            .in("publication_id", part);
          if (!res.error && res.data) links.push(...res.data);
        }
      }
    }

    // 4) 氏名の解決（researchers 優先 → authors）
    const researcherIds = Array.from(new Set(links.map((r) => r.researcher_id).filter(Boolean)));
    const authorIds = Array.from(new Set(links.map((r) => r.author_id).filter(Boolean)));
    const lastNameMap = new Map();

    if (researcherIds.length) {
      for (const part of chunk(researcherIds, 500)) {
        const { data } = await supabase.from("researchers").select("id, last_name_eng").in("id", part);
        (data || []).forEach((r) => lastNameMap.set(`r:${r.id}`, r.last_name_eng));
      }
    } else if (authorIds.length) {
      for (const part of chunk(authorIds, 500)) {
        const { data } = await supabase.from("authors").select("id, last_name_eng").in("id", part);
        (data || []).forEach((a) => lastNameMap.set(`a:${a.id}`, a.last_name_eng));
      }
    }

    // 5) publication_id → 著者配列のマップ
    const linksMap = links.reduce((m, row) => {
      const arr = m.get(row.publication_id) || [];
      const last =
        (row.researcher_id && lastNameMap.get(`r:${row.researcher_id}`)) ||
        (row.author_id && lastNameMap.get(`a:${row.author_id}`)) ||
        null;
      arr.push({ author_order: row.author_order, last_name_eng: last });
      return m.set(row.publication_id, arr);
    }, new Map());

    // 6) 返却：journal_name と _authorsRel を付与
    return pubs.map((p) => ({
      ...p,
      journal_name: journalMap.get(p.journal_id) || "",
      _authorsRel: (linksMap.get(p.id) || []).sort(
        (a, b) => (a?.author_order || 0) - (b?.author_order || 0)
      ),
    }));
  }

  // ---------- masters ----------
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingMaster(true);
      try {
        // Relationship 用：学名 ID
        const { data: allNames } = await supabase.from("scientific_names").select("id").order("id");
        if (mounted) setNames((allNames || []).map((d) => d.id));

        // マスタ群
        const [ranksRes, statusesRes, countriesRes, typeCatsRes] = await Promise.all([
          supabase.from("rank").select("id").order("id"),
          supabase.from("extant_fossil").select("id").order("id"),
          supabase.from("countries").select("id").order("id"),
          supabase.from("type_categories").select("*").order("id"),
        ]);

        if (!ranksRes?.error && mounted) setRanks((ranksRes?.data || []).map((d) => d.id));
        if (!statusesRes?.error && mounted) setStatuses((statusesRes?.data || []).map((d) => d.id));
        if (!countriesRes?.error && mounted) setCountriesList(countriesRes?.data || []);
        if (!typeCatsRes?.error && mounted) setTypeCategories(typeCatsRes?.data || []);

        // Publications（安全版）
        const pubs = await fetchPublicationsSmart();
        if (mounted) setPublications(pubs);
      } finally {
        if (mounted) setLoadingMaster(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // rank / status 読み込み後、不正値を補正（MUI out-of-range 対策）
  useEffect(() => {
    if (ranks?.length) {
      ["current_rank", "original_rank"].forEach((f) => {
        const v = form[f];
        if (v && !ranks.includes(v)) setForm((p) => ({ ...p, [f]: null }));
      });
    }
    if (statuses?.length) {
      const v = form.extant_fossil;
      if (v && !statuses.includes(v)) setForm((p) => ({ ...p, extant_fossil: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranks, statuses]);

  // ---------- edit init ----------
  useEffect(() => {
    if (!isEdit || !scientificName) return;
    setForm((prev) => ({
      ...prev,
      id: scientificName.id ?? "",
      name_spell_valid: scientificName.name_spell_valid ?? "",
      name_spell_original: scientificName.name_spell_original ?? null,
      current_rank: scientificName.current_rank ?? null,
      original_rank: scientificName.original_rank ?? null,
      current_parent: scientificName.current_parent ?? null,
      original_parent: scientificName.original_parent ?? null,
      extant_fossil: scientificName.extant_fossil ?? null,
      remark: scientificName.remark ?? "",
      authority_year: toStr(scientificName.authority_year),
      type_sex: scientificName.type_sex ?? "",
      source_of_original_description: scientificName.source_of_original_description ?? null,
      valid_name_id: scientificName.valid_name_id ?? null,
      type_taxa_id: scientificName.type_taxa_id ?? null,
      type_locality: scientificName.type_locality ?? null,
      type_repository_id: scientificName.type_repository_id ?? null,
      type_host: scientificName.type_host ?? null,
      page: scientificName.page ?? "",
      type_category: scientificName.type_category ?? "",
      zoobank_url: scientificName.zoobank_url ?? null,
      type_img_urls: scientificName.type_img_urls ?? null,
    }));

    (async () => {
      try {
        const { data: rel } = await supabase
          .from("scientific_name_and_author")
          .select("author_order, researcher_id")
          .eq("scientific_name_id", scientificName.id)
          .order("author_order");

        const ids = (rel || []).map((r) => r.researcher_id);
        if (!ids?.length) {
          setSelectedAuthors([]);
          return;
        }
        const { data: researchers } = await supabase.from("researchers").select("*").in("id", ids);
        const byId = new Map((researchers || []).map((r) => [r.id, r]));
        const sorted = (rel || [])
          .sort((a, b) => a.author_order - b.author_order)
          .map((r) => byId.get(r.researcher_id))
          .filter(Boolean);
        setSelectedAuthors(sorted);
      } catch (e) {
        console.warn(`${TAG} load authors`, e);
      }
    })();
  }, [isEdit, scientificName]);

  // ---------- radio auto ----------
  useEffect(() => {
    const trimmedId = form.id?.trim();
    if (trimmedId && !validNameRadio) setValidNameRadio("own");
    if (trimmedId && !typeTaxaRadio) setTypeTaxaRadio("own");
    if (validNameRadio === "own") handleChange("valid_name_id", trimmedId || null);
    if (typeTaxaRadio === "own") handleChange("type_taxa_id", trimmedId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id, validNameRadio, typeTaxaRadio]);

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

  // ---------- images ----------
  const setImg = (idx, field, val) => {
    setImgRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  };
  const addImgRow = () => setImgRows((r) => [...r, { title: "", url: "" }]);
  const removeImgRow = (idx) => setImgRows((r) => r.filter((_, i) => i !== idx));

  // ---------- publication label ----------
  const renderPublicationLabel = (p) => {
    if (!p) return "";
    try {
      const rel = p._authorsRel || p.publications_authors || p.publication_authors || [];
      const pubAuthors = rel
        .sort((a, b) => (a?.author_order || 0) - (b?.author_order || 0))
        .map((pa) => pa?.last_name_eng || null)
        .filter(Boolean);

      let authorStr = pubAuthors.slice(0, 3).join(", ");
      if (pubAuthors.length > 3) authorStr += ", et al.";

      const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
      const title = p.title_english || "[No Title]";
      const journal = p.journal_name || "";
      const volume = p.volume ? ` ${p.volume}` : "";
      const number = p.number ? `(${p.number})` : "";
      const pageInfo = p.page ? `: ${p.page}` : "";
      const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";

      return (authorStr ? `${authorStr} (${year}). ` : `(${year}). `) + `${title}${journalInfo}`;
    } catch {
      const title = p.title_english || "[No Title]";
      const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
      return `${title} (${year})`;
    }
  };

  // ---------- validation ----------
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
      authorityYear: (() => {
        const y = toStr(form.authority_year).trim();
        return !y || !/^\d{4}$/.test(y);
      })(),
      validNameId: validNameRadio === "other" && !form.valid_name_id,
      typeTaxaId: typeTaxaRadio === "other" && !form.type_taxa_id,
      zoobankUrl: !!form.zoobank_url && !/^https?:\/\/(www\.)?zoobank\.org\/.+$/i.test(form.zoobank_url),
      typeImg: imgRowsInvalid,
    }),
    [form, selectedAuthors, validNameRadio, typeTaxaRadio, imgRowsInvalid]
  );

  // ---------- submit ----------
  const handleSubmit = useCallback(async () => {
    if (Object.values(errors).some(Boolean)) {
      alert("Please fix the errors indicated in the form before submitting.");
      return;
    }

    setSaving(true);
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

    const repoUuid = asUuidOrNull(form.type_repository_id);
    const sourcePubId = asIdOrNull(form.source_of_original_description);

    const basePayload = {
      name_spell_valid: form.name_spell_valid.trim(),
      name_spell_original: form.name_spell_original?.trim() || null,
      current_rank: form.current_rank,
      original_rank: form.original_rank || null,
      extant_fossil: form.extant_fossil || null,
      remark: form.remark?.trim() || null,
      authority_year: toStr(form.authority_year).trim(),
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
      if (!isEdit) {
        // insert
        const { data: dup, error: checkError } = await supabase
          .from("scientific_names")
          .select("id")
          .eq("id", trimmedId)
          .maybeSingle();
        if (checkError) throw new Error(`Failed to check for duplicate ID: ${checkError.message}`);
        if (dup) throw new Error(`Duplicate ID found: ${trimmedId}. Please use a unique ID.`);

        const partialPayload = { id: trimmedId, ...basePayload };
        const { error: insertError } = await supabase.from("scientific_names").insert([partialPayload]);
        if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

        // 2nd update（親や関係）
        const updatePayload = {
          current_parent: form.current_parent || null,
          original_parent: form.original_parent || null,
          valid_name_id: (validNameRadio === "own" ? trimmedId : form.valid_name_id) || null,
          type_taxa_id: (typeTaxaRadio === "own" ? trimmedId : form.type_taxa_id) || null,
          source_of_original_description: sourcePubId,
          last_update: new Date().toISOString(),
        };
        const { error: upErr } = await supabase.from("scientific_names").update(updatePayload).eq("id", trimmedId);
        if (upErr) throw new Error(`Update after insert failed: ${upErr.message}`);

        // authors
        if (selectedAuthors.length > 0) {
          const authorLinks = selectedAuthors.map((author, index) => ({
            scientific_name_id: trimmedId,
            researcher_id: author.id,
            author_order: index + 1,
          }));
          await supabase.from("scientific_name_and_author").insert(authorLinks);
        }

        // Audit（Add）
        await writeAudit({
          action: "insert",
          id: trimmedId,
          before: null,
          after: { id: trimmedId, ...basePayload, ...updatePayload },
        });
      } else {
        // update
        const idForEdit = scientificName?.id;
        if (!idForEdit) throw new Error("Invalid edit target: id is missing.");

        // 旧値を取得（diff 用）
        const { data: beforeRow } = await supabase
          .from("scientific_names")
          .select("*")
          .eq("id", idForEdit)
          .maybeSingle();

        const updatePayload = {
          ...basePayload,
          current_parent: form.current_parent || null,
          original_parent: form.original_parent || null,
          valid_name_id: form.valid_name_id || null,
          type_taxa_id: form.type_taxa_id || null,
          source_of_original_description: sourcePubId,
        };
        const { error: updateErr } = await supabase.from("scientific_names").update(updatePayload).eq("id", idForEdit);
        if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

        await supabase.from("scientific_name_and_author").delete().eq("scientific_name_id", idForEdit);
        if (selectedAuthors.length > 0) {
          const authorLinks = selectedAuthors.map((author, index) => ({
            scientific_name_id: idForEdit,
            researcher_id: author.id,
            author_order: index + 1,
          }));
          await supabase.from("scientific_name_and_author").insert(authorLinks);
        }

        // Audit（Edit）
        await writeAudit({
          action: "update",
          id: idForEdit,
          before: beforeRow || null,
          after: { ...(beforeRow || {}), ...updatePayload },
        });
      }

      alert(isEdit ? "Updated successfully." : "Added successfully.");
      onClose?.(true);
    } catch (e) {
      console.error(`${TAG} submit failed`, e);
      alert(`Error: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }, [
    isEdit,
    form,
    errors,
    imgRows,
    validNameRadio,
    typeTaxaRadio,
    selectedAuthors,
    scientificName,
    onClose,
  ]);

  // ---------- delete ----------
  const handleDelete = useCallback(async () => {
    if (!isEdit || !scientificName?.id) return;
    try {
      // 旧値 for audit
      const { data: beforeRow } = await supabase
        .from("scientific_names")
        .select("*")
        .eq("id", scientificName.id)
        .maybeSingle();

      const { error } = await supabase.from("scientific_names").delete().eq("id", scientificName.id);
      if (error) throw new Error(error.message);

      // Audit（Delete）
      await writeAudit({
        action: "delete",
        id: scientificName.id,
        before: beforeRow || null,
        after: null,
      });

      alert("Deleted.");
      onClose?.(true);
    } catch (e) {
      console.error(`${TAG} delete failed`, e);
      alert(`Delete failed: ${e.message || e}`);
    }
  }, [isEdit, scientificName, onClose]);

  const safeScientificNameData = useMemo(() => scientificNames || [], [scientificNames]);

  // 固定表示ヘッダー（Current ID）
  const headerAddon = form.id?.trim() ? (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Current ID:
      </Typography>
      <Typography variant="h6" sx={{ color: "primary.main", wordBreak: "break-all" }}>
        {form.id}
      </Typography>
    </Box>
  ) : null;

  return (
    <BaseDialog
      open={open}
      title={isEdit ? "Edit Scientific Name" : "Add New Scientific Name"}
      onClose={() => onClose?.(false)}
      onSubmit={handleSubmit}
      submitText={isEdit ? "Update" : "Add"}
      loading={loadingMaster || saving}
      onDelete={isEdit ? handleDelete : undefined}
      maxWidth="md"
      headerAddon={headerAddon}
    >
      {/* ← ロード完了まで Section 群を描画しない（タイミング問題回避） */}
      {loadingMaster ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2">Loading master data…</Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          <SectionIdSource
            form={form}
            handleChange={handleChange}
            errors={{ id: !form.id?.trim() }}
            publications={publications}
            renderPublicationLabel={renderPublicationLabel}
            disableId={isEdit}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionNameSpelling
            form={form}
            handleChange={handleChange}
            errors={{ nameSpell: !form.name_spell_valid?.trim() }}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionZooBank
            form={form}
            handleChange={handleChange}
            errors={{
              zoobankUrl:
                !!form.zoobank_url && !/^https?:\/\/(www\.)?zoobank\.org\/.+$/i.test(form.zoobank_url),
            }}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionAuthority
            form={form}
            handleChange={handleChange}
            errors={{
              authority: selectedAuthors.length === 0,
              authorityYear: (() => {
                const y = toStr(form.authority_year).trim();
                return !y || !/^\d{4}$/.test(y);
              })(),
            }}
            selectedAuthors={selectedAuthors}
            setSelectedAuthors={setSelectedAuthors}
            yearOptions={yearOptions}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionTaxonomy
            form={form}
            handleChange={handleChange}
            errors={{ currentRank: !form.current_rank, current_parent: !form.current_parent }}
            ranks={ranks}
            scientificNameData={safeScientificNameData}
            refresh={refresh}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionRelationship
            form={form}
            handleChange={handleChange}
            errors={{
              validNameId: validNameRadio === "other" && !form.valid_name_id,
              typeTaxaId: typeTaxaRadio === "other" && !form.type_taxa_id,
            }}
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
            errors={{ typeImg: imgRowsInvalid }}
            typeCategories={typeCategories}
            onShowAddTypeCategory={undefined}
            countriesList={countriesList}
            RanksNoLocalityConst={RanksNoLocalityConst}
            scientificNameData={safeScientificNameData}
            imgRows={imgRows}
            handleImgRowChange={setImg}
            addImgRow={addImgRow}
            removeImgRow={removeImgRow}
          />

          <Divider sx={{ my: 3, borderWidth: 1.5, borderColor: "primary.light" }} />
          <SectionOtherInfo form={form} handleChange={handleChange} statuses={statuses} />
        </Box>
      )}
    </BaseDialog>
  );
}
