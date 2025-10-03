// src/components/ProtectedRoute/Admin/Dialogs/parts/PublicationSelector.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Autocomplete, TextField, Stack, Button, Box, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useDebounce } from "use-debounce";
import supabase from "../../../../../utils/supabase";
import DialogPublicationAdd from "../DialogPublicationAdd";

const TAG = "[PublicationSelector]";

/** HTMLタグ除去 + エンティティ復号（安全にプレーンテキスト化） */
function stripHtmlAndDecode(input) {
  if (!input) return "";
  const noTags = String(input).replace(/<[^>]*>/g, " "); // タグは空白化（単語が潰れないように）
  // ブラウザのデコーダでエンティティ復号
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
  const authors = (p.publications_authors || [])
    .sort((a, b) => a.author_order - b.author_order)
    .map(x => x?.researchers?.last_name)
    .filter(Boolean);

  const authorStr = formatAuthors(authors);
  const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
  const title = stripHtmlAndDecode(p.title_english || "[No Title]");
  const journal = stripHtmlAndDecode(p?.journal?.name_english || "");
  const volume = p.volume ? ` ${p.volume}` : "";
  const number = p.number ? `(${p.number})` : "";
  const pageInfo = p.page ? `: ${p.page}` : "";
  const journalInfo = journal ? ` — ${journal}${volume}${number}${pageInfo}` : "";
  return `${authorStr ? authorStr + " " : ""}(${year}). ${title}${journalInfo}`;
}

/**
 * props（両系統のprop名に対応）
 * - label?: string
 * - value?: string | null
 * - onChange?: (selectedId: string|null) => void
 * - publicationsData?: any[]                // 初期オプション（空OK）
 * - renderOptionLabel?: (row)=>string|JSX   // 任意：なければ defaultLabel
 * - required?: boolean | isRequired?: boolean
 * - onRefreshData?: ()=>Promise<void> | onRefreshPublications?: ()=>Promise<void>
 */
export default function PublicationSelector(props) {
  const {
    label = "Publication",
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

  // 初期候補
  useEffect(() => {
    if (Array.isArray(publicationsData)) {
      console.debug(`${TAG} hydrate seedOptions`, publicationsData.length);
      setSeedOptions(publicationsData);
    }
  }, [publicationsData]);

  // value(id) => option復元（optionsに無ければ単独フェッチして補完）
  const selectedOption = useMemo(() => {
    if (!value) return null;
    const found = options.find(o => o?.id === value) || seedOptions.find(o => o?.id === value) || null;
    if (!found) {
      (async () => {
        try {
          setLoading(true);
          console.debug(`${TAG} fetch selected by id`, value);
          const { data, error } = await supabase
            .from("publications")
            .select(`
              id, title_english, publication_date, volume, number, page,
              journal:journal_id(name_english),
              publications_authors(
                author_order,
                researchers:researcher_id(last_name, first_name)
              )
            `)
            .eq("id", value)
            .maybeSingle();
          if (error) {
            console.warn(`${TAG} fetch selected failed`, error);
          } else if (data) {
            setOptions(curr => {
              if (curr.some(p => p.id === data.id)) return curr;
              return [data, ...curr];
            });
          }
        } finally {
          setLoading(false);
        }
      })();
    }
    return found;
  }, [value, options, seedOptions]);

  // ラベル関数（常に string 返却・HTML除去）
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

  // サーバ検索（入力2文字以上で実行）。結果を**置き換え**る（マージしない）。
  const runServerSearch = useCallback(
    async (term) => {
      const t = (term || "").trim();
      if (t.length < 2) {
        console.debug(`${TAG} term < 2, show seedOptions only`);
        setOptions(seedOptions.slice(0, 30));
        return;
      }
      setLoading(true);
      try {
        console.debug(`${TAG} search:start`, t);
        const sel = `
          id, title_english, publication_date, volume, number, page,
          journal:journal_id(name_english),
          publications_authors(
            author_order,
            researchers:researcher_id(last_name, first_name)
          )
        `;
        // サーバ側は id / title で広く拾い、……
        const orExpr = `id.ilike.%${t}%,title_english.ilike.%${t}%`;
        const { data, error } = await supabase
          .from("publications")
          .select(sel)
          .or(orExpr)
          .order("id", { ascending: true })
          .limit(50);

        if (error) {
          console.error(`${TAG} search error`, error);
          setOptions([]);
          return;
        }

        // ……クライアント側で getOptionLabel 文字列に対して追加フィルタ（著者名やジャーナル名も命中）
        const lower = t.toLowerCase();
        const filtered = (data || []).filter((row) => getOptionLabel(row).toLowerCase().includes(lower));

        // 選択中の値が候補に無ければ先頭に足す
        let next = filtered;
        if (value && !filtered.some(r => r.id === value) && selectedOption) {
          next = [selectedOption, ...filtered];
        }

        console.debug(`${TAG} search:done`, { fetched: data?.length ?? 0, shown: next.length });
        setOptions(next);
      } finally {
        setLoading(false);
      }
    },
    [seedOptions, getOptionLabel, value, selectedOption]
  );

  // 入力が変わったら検索
  useEffect(() => { runServerSearch(debouncedInput); }, [debouncedInput, runServerSearch]);

  // 初回はシードだけ出す
  useEffect(() => {
    if (!debouncedInput?.trim()) setOptions(seedOptions.slice(0, 30));
  }, [debouncedInput, seedOptions]);

  // 追加後のリフレッシュ対応（prop名どちらでもOK）
  const handleCloseAdd = async (didAdd) => {
    setOpenedAdd(false);
    const refresher = onRefreshData || onRefreshPublications;
    if (didAdd && refresher) {
      console.debug(`${TAG} refresh after add`);
      await refresher();
      // 最新シードに置き換え
      setOptions((curr) => seedOptions.slice(0, 30));
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Autocomplete
          options={options}
          value={selectedOption}
          onChange={(_, val) => {
            const id = val?.id ?? null;
            console.debug(`${TAG} onChange ->`, id);
            onChange?.(id);
          }}
          inputValue={input}
          onInputChange={(_, v) => setInput(v)}
          isOptionEqualToValue={(opt, val) => !!opt?.id && !!val?.id && opt.id === val.id}
          getOptionLabel={getOptionLabel}
          // ★ クライアントフィルタは有効のまま（getOptionLabelベースで自然に絞られる）
          loading={loading}
          renderOption={(props, option) => (
            <li {...props}>
              <Box component="span" sx={{ display: "block", wordBreak: "break-word", whiteSpace: "normal" }}>
                {getOptionLabel(option)}
              </Box>
            </li>
          )}
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
