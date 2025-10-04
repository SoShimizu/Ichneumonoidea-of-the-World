// src/components/ProtectedRoute/Admin/Dialogs/parts/PublicationSelector.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Autocomplete, TextField, Stack, Button, Box, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useDebounce } from "use-debounce";
import supabase from "../../../../../utils/supabase";
import DialogPublicationAdd from "../DialogPublicationAdd";

const TAG = "[PublicationSelector]";

/* ---------------------- utils ---------------------- */
const isUuid = (s) =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

const isIntLike = (v) =>
  (typeof v === "number" && Number.isInteger(v)) ||
  (typeof v === "string" && /^\d+$/.test(v));

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

/** HTMLタグ除去 + エンティティ復号（安全にプレーンテキスト化） */
function stripHtmlAndDecode(input) {
  if (!input) return "";
  const noTags = String(input).replace(/<[^>]*>/g, " ");
  const el = document.createElement("textarea");
  el.innerHTML = noTags;
  return el.value.replace(/\s+/g, " ").trim();
}

/** 著者配列を "A", "A & B", "A, B & C" 形式に */
function formatAuthors(authors = []) {
  const a = authors.filter(Boolean);
  if (a.length <= 1) return a[0] || "";
  if (a.length === 2) return `${a[0]} & ${a[1]}`;
  return `${a.slice(0, -1).join(", ")} & ${a[a.length - 1]}`;
}

/** デフォルトのラベル文字列（必ず string を返す） */
function defaultLabel(p) {
  if (!p) return "";
  const authors = Array.isArray(p._authors) ? p._authors : [];
  const authorStr = formatAuthors(authors);
  const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
  const title = stripHtmlAndDecode(p.title_english || "[No Title]");
  const journal = stripHtmlAndDecode(p._journal_name || "");
  const volume = p.volume ? ` ${p.volume}` : "";
  const number = p.number ? `(${p.number})` : "";
  const pageInfo = p.page ? `: ${p.page}` : "";
  const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";
  return `${authorStr ? authorStr + " " : ""}(${year}). ${title}${journalInfo}`;
}

/* ---------- 安全な付加情報ハイドレーション ---------- */

/** 1 publication の著者名一覧（中間テーブル差異にも対応） */
async function fetchAuthorsForPublication(pubId) {
  // ★ 重要：publication_id が UUID/数値でない場合は問い合わせない（400 の原因）
  if (!(isUuid(pubId) || isIntLike(pubId))) return [];

  const middleCandidates = ["publications_authors", "publication_authors"];

  for (const table of middleCandidates) {
    try {
      const { data: rel, error } = await supabase
        .from(table)
        .select("author_order, researcher_id, author_id")
        .eq("publication_id", pubId)
        .order("author_order", { ascending: true });

      if (error || !rel) continue;
      if (!rel.length) return [];

      const researcherIds = [...new Set(rel.map((r) => r.researcher_id).filter(Boolean))];
      const authorIds = [...new Set(rel.map((r) => r.author_id).filter(Boolean))];

      let researcherNameById = new Map();
      if (researcherIds.length) {
        const { data } = await supabase
          .from("researchers")
          .select("id, last_name_eng, last_name")
          .in("id", researcherIds);
        if (data) researcherNameById = new Map(data.map((r) => [r.id, r.last_name_eng || r.last_name || ""]));
      }

      let authorNameById = new Map();
      if (!researcherIds.length && authorIds.length) {
        const { data } = await supabase
          .from("authors")
          .select("id, last_name_eng, last_name")
          .in("id", authorIds);
        if (data) authorNameById = new Map(data.map((a) => [a.id, a.last_name_eng || a.last_name || ""]));
      }

      return rel
        .map((r) => ({
          order: r.author_order ?? 0,
          name:
            (r.researcher_id && researcherNameById.get(r.researcher_id)) ||
            (r.author_id && authorNameById.get(r.author_id)) ||
            "",
        }))
        .sort((a, b) => a.order - b.order)
        .map((x) => x.name)
        .filter(Boolean);
    } catch {
      // 次の候補を試す
    }
  }

  return [];
}

/** publications の配列に _authors を付ける（小バッチ並列で安全に） */
async function hydrateAuthors(rows, concurrency = 8) {
  const batches = chunk(rows, concurrency);
  const out = [];

  for (const b of batches) {
    const results = await Promise.all(
      b.map(async (row) => {
        const names = await fetchAuthorsForPublication(row.id);
        return { ...row, _authors: names };
      })
    );
    out.push(...results);
  }
  return out;
}

/** journals を安全に解決（journal_id が UUID/数値のときのみ参照） */
async function hydrateJournals(rows) {
  const ids = [...new Set(rows.map((r) => r.journal_id).filter((v) => isUuid(v) || isIntLike(v)))];
  if (!ids.length) {
    return rows.map((r) => ({
      ...r,
      _journal_name: typeof r.journal_id === "string" ? r.journal_id : "",
    }));
  }

  let jmap = new Map();
  for (const t of ["journals", "journal"]) {
    try {
      const { data, error } = await supabase.from(t).select("id, name_english, name").in("id", ids);
      if (!error && data) {
        jmap = new Map(data.map((j) => [String(j.id), j.name_english || j.name || ""]));
        break;
      }
    } catch {
      // 次の候補へ
    }
  }

  return rows.map((r) => {
    const key = String(r.journal_id);
    const resolved = jmap.get(key);
    return {
      ...r,
      _journal_name: resolved ?? (typeof r.journal_id === "string" ? r.journal_id : ""),
    };
  });
}

async function hydrateExtras(rows) {
  const withJ = await hydrateJournals(rows);
  const withA = await hydrateAuthors(withJ);
  return withA;
}

/* ---------------------- component ---------------------- */

/**
 * props（両系統のprop名に対応）
 * - label?: string
 * - value?: string | number | null
 * - onChange?: (selectedId: string|number|null) => void
 * - publicationsData?: any[]                // 初期オプション（空OK）
 * - renderOptionLabel?: (row)=>string|JSX   // 任意：なければ defaultLabel
 * - required?: boolean | isRequired?: boolean
 * - onRefreshData?: ()=>Promise<void> | onRefreshPublications?: ()=>Promise<void>
 */
export default function PublicationSelector(props) {
  const {
    label = "Source of Original Description",
    value = null,
    onChange,
    publicationsData = [],
    renderOptionLabel,
    onRefreshData,
    onRefreshPublications,
  } = props;

  // required は両方のprop名に対応
  const required = Boolean(props.required ?? props.isRequired);

  const [seedOptions, setSeedOptions] = useState([]);   // 初期候補
  const [options, setOptions] = useState([]);           // 表示中の候補
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openedAdd, setOpenedAdd] = useState(false);
  const [debouncedInput] = useDebounce(input, 350);

  /* ---- 初期候補を安全に整形 ---- */
  useEffect(() => {
    (async () => {
      if (!Array.isArray(publicationsData) || publicationsData.length === 0) {
        setSeedOptions([]);
        return;
      }
      const needHydrate = publicationsData.some((p) => !("_authors" in p) || !("_journal_name" in p));
      const seeded = needHydrate ? await hydrateExtras(publicationsData) : publicationsData;
      setSeedOptions(seeded);
    })();
  }, [publicationsData]);

  /* ---- value(id) -> option 復元 ---- */
  const selectedOption = useMemo(() => {
    if (value == null) return null;
    return (
      options.find((o) => String(o?.id) === String(value)) ||
      seedOptions.find((o) => String(o?.id) === String(value)) ||
      null
    );
  }, [value, options, seedOptions]);

  useEffect(() => {
    if (value == null || selectedOption) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("publications")
          .select("id, title_english, publication_date, volume, number, page, journal_id")
          .eq("id", value)
          .maybeSingle();
        if (error || !data) return;
        const hydrated = (await hydrateExtras([data]))[0];
        setOptions((curr) => (curr.some((p) => String(p.id) === String(hydrated.id)) ? curr : [hydrated, ...curr]));
      } finally {
        setLoading(false);
      }
    })();
  }, [value, selectedOption]);

  /* ---- ラベル関数 ---- */
  const getOptionLabel = useCallback(
    (opt) => {
      if (!opt) return "";
      try {
        const lab = renderOptionLabel ? renderOptionLabel(opt) : defaultLabel(opt);
        return typeof lab === "string" ? stripHtmlAndDecode(lab) : stripHtmlAndDecode(String(lab ?? ""));
      } catch (e) {
        console.warn(`${TAG} getOptionLabel fallback`, e);
        return String(opt?.id ?? "");
      }
    },
    [renderOptionLabel]
  );

  /* ---- 検索（サーバは publications だけ、追加情報はローカルで安全に） ---- */
  const runServerSearch = useCallback(
    async (term) => {
      const t = (term || "").trim();
      if (t.length < 2) {
        setOptions(seedOptions.slice(0, 30));
        return;
      }
      setLoading(true);
      try {
        const orExpr = `id.ilike.%${t}%,title_english.ilike.%${t}%`;
        const { data, error } = await supabase
          .from("publications")
          .select("id, title_english, publication_date, volume, number, page, journal_id")
          .or(orExpr)
          .order("id", { ascending: true })
          .limit(40);

        if (error) {
          console.error(`${TAG} search error`, error);
          setOptions([]);
          return;
        }

        const hydrated = await hydrateExtras(data || []);

        // getOptionLabel ベースでもう一段フィルタ（著者名/ジャーナル名でもヒット）
        const lower = t.toLowerCase();
        const filtered = hydrated.filter((row) => getOptionLabel(row).toLowerCase().includes(lower));

        // 選択中の値を先頭に保持
        let next = filtered;
        if (value != null && selectedOption && !filtered.some((r) => String(r.id) === String(value))) {
          next = [selectedOption, ...filtered];
        }
        setOptions(next);
      } finally {
        setLoading(false);
      }
    },
    [seedOptions, getOptionLabel, value, selectedOption]
  );

  useEffect(() => { runServerSearch(debouncedInput); }, [debouncedInput, runServerSearch]);
  useEffect(() => { if (!debouncedInput?.trim()) setOptions(seedOptions.slice(0, 30)); }, [debouncedInput, seedOptions]);

  /* ---- 追加ダイアログ後の再読込 ---- */
  const handleCloseAdd = async (didAdd) => {
    setOpenedAdd(false);
    const refresher = onRefreshData || onRefreshPublications;
    if (didAdd && refresher) {
      await refresher();           // 親から publicationsData が更新される想定
      setOptions([]);              // いったんクリア → seedOptions の effect が反映
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: "100%" }}>
        <Autocomplete
          options={options}
          value={selectedOption}
          onChange={(_, val) => onChange?.(val?.id ?? null)}
          inputValue={input}
          onInputChange={(_, v) => setInput(v)}
          isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)}
          getOptionLabel={getOptionLabel}
          loading={loading}
          renderOption={(props, option) => {
            // ★ key 警告の回避：props.key を取り出して直接渡す
            const { key, ...rest } = props;
            return (
              <li key={key} {...rest}>
                <Box component="span" sx={{ display: "block", wordBreak: "break-word", whiteSpace: "normal" }}>
                  {getOptionLabel(option)}
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={required ? `${label} (Required)` : `${label} (Optional)`}
              required={required}
              margin="dense"
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          sx={{ flexGrow: 1 }}
          ListboxProps={{ style: { maxHeight: 360 } }}
          noOptionsText={debouncedInput?.trim()?.length >= 2 ? "No results" : "Type 2+ characters to search"}
        />

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpenedAdd(true)}
          sx={{ mt: "15px" }}
        >
          + Add
        </Button>
      </Stack>

      {openedAdd && <DialogPublicationAdd open onClose={handleCloseAdd} />}
    </>
  );
}
