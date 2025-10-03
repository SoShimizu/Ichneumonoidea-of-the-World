// src/components/ProtectedRoute/Admin/Consoles/Plugins/repositories.plugin.js
import { Button, Chip, Typography } from "@mui/material";
import supabase from "../../../../../utils/supabase";

/* ====== debug helpers ====== */
const DBG = true;
const log = (...a) => DBG && console.log(...a);
const group = (title, fn) => {
  if (!DBG) return fn();
  console.groupCollapsed(title);
  try { fn(); } finally { console.groupEnd(); }
};
const table10 = (rows, label = "rows") => {
  if (!DBG) return;
  try { console.table((rows || []).slice(0, 10)); } catch {}
};

/* ====== small helpers ====== */
const nonEmpty = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.trim() ? s : "";
};
const firstText = (...vals) => {
  for (const v of vals) {
    const t = nonEmpty(v);
    if (t) return t;
  }
  return "";
};

const plugin = {
  table: "Repositories",

  // 親の embed は使わず、fallback で別クエリ in 取得する
  select: `
    uuid,
    acronym,
    name_en,
    taxapad_code,
    country,
    city,
    parent_id,
    created_at
  `,

  defaultSort: { field: "acronym", sort: "asc" },

  or(search) {
    if (!search) return undefined;
    const like = `%${search}%`;
    return `or=(acronym.ilike.${like},name_en.ilike.${like},taxapad_code.ilike.${like})`;
  },

  normalize(row) {
    const name = firstText(row?.name_en, row?.acronym);
    const country = firstText(row?.country);
    const city = firstText(row?.city);
    const isSynonym = row?.uuid && row?.parent_id ? row.uuid !== row.parent_id : false;

    const parentAcr = firstText(row?._parent?.acronym);
    const parentName = firstText(row?._parent?.name_en);
    const parentDisp =
      parentAcr || parentName
        ? `${parentAcr}${parentAcr && parentName ? " — " : ""}${parentName}`
        : "";

    return {
      ...row,
      id: row.uuid,                // ✅ DataGrid の必須 id
      _name: name || "—",
      _country: country,
      _city: city,
      is_synonym: isSynonym,
      _parentDisp: parentDisp,
    };
  },

  /**
   * RPC → fallback → 親解決 → 正規化 → クライアント検索/ソート
   * 逐次ログを出力して原因を特定しやすく
   */
  async fetch({ page, pageSize, orderBy, ascending, search }) {
    const TAG = "[repositories.fetch]";
    const from = page * pageSize;
    const to = from + pageSize - 1;

    group(`${TAG} start`, () => {
      log({ page, pageSize, orderBy, ascending, search, from, to, select: this.select });
    });

    // ---------- 1) RPC 経路
    let base = [];
    let rpcOk = false;

    try {
      group(`${TAG} step1: try RPC search_repositories`, () => {
        log({ search_term: search ?? "" });
      });

      const { data, error } = await supabase.rpc("search_repositories", {
        search_term: search ?? "",
      });

      if (error) throw error;

      base = (data || []).map((r) => ({
        // RPC の戻りを汎用キーへ寄せる
        uuid: r.uuid,
        acronym: r.acronym,
        name_en: r.name_en,
        taxapad_code: r.taxapad_code,
        country: r.country,
        city: r.city,
        parent_id: r.parent_uuid ?? r.parent_id ?? r.uuid,
        _parent:
          r.parent_uuid
            ? { uuid: r.parent_uuid, acronym: r.parent_acronym, name_en: r.parent_name_en }
            : (r.is_synonym ? null : { uuid: r.uuid, acronym: r.acronym, name_en: r.name_en }),
      }));

      rpcOk = true;

      group(`${TAG} RPC ok: sample (first 10)`, () => {
        table10(base);
        if (base[0]) log("sample keys:", Object.keys(base[0]));
      });
    } catch (e) {
      console.warn(`${TAG} RPC failed -> fallback`, e);
    }

    // ---------- 2) fallback 経路
    if (!rpcOk) {
      group(`${TAG} step2: fallback select`, () => {
        log({ table: "Repositories", select: this.select });
      });

      const { data, error } = await supabase
        .from("Repositories")
        .select(this.select)
        .order("acronym", { ascending: true });

      if (error) {
        console.error(`${TAG} fallback select error`, error);
        return { rows: [], total: 0 };
      }

      base = data || [];

      // 親を別クエリで解決
      try {
        const parentIds = Array.from(
          new Set(
            base
              .map((r) => r?.parent_id)
              .filter((x) => typeof x === "string" && x.length > 0)
          )
        );

        group(`${TAG} step2b: resolve parents`, () => {
          log({ parentIdsCount: parentIds.length });
        });

        if (parentIds.length) {
          const { data: parents, error: pErr } = await supabase
            .from("Repositories")
            .select("uuid, acronym, name_en")
            .in("uuid", parentIds);

          if (pErr) {
            console.warn(`${TAG} parent fetch error (ignored)`, pErr);
          } else {
            const pMap = new Map((parents || []).map((p) => [p.uuid, p]));
            base = base.map((r) => ({ ...r, _parent: pMap.get(r.parent_id) || null }));
          }
        }
      } catch (e) {
        console.warn(`${TAG} parent resolve failed (ignored)`, e);
      }

      group(`${TAG} fallback after parent resolve (first 10)`, () => table10(base));
    }

    // ---------- 3) 正規化
    let merged = base.map((r) => this.normalize(r));

    group(`${TAG} after normalize (first 10)`, () => {
      table10(merged);
      if (merged[0]) log("normalized keys:", Object.keys(merged[0]));
    });

    // ---------- 4) クライアント検索
    if (search) {
      const q = String(search).toLowerCase();
      merged = merged.filter((r) =>
        [r.acronym, r._name, r.taxapad_code, r._country, r._city, r._parentDisp]
          .map((x) => String(x || "").toLowerCase())
          .some((s) => s.includes(q))
      );
    }

    // ---------- 5) クライアント並び替え
    const keyMap = {
      acronym: "acronym",
      name: "_name",
      taxapad_code: "taxapad_code",
      country: "_country",
      city: "_city",
      id: "uuid",
    };
    const key = keyMap[orderBy] || "acronym";
    const dir = ascending ? 1 : -1;
    merged.sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || "")) * dir);

    const total = merged.length;
    const rows = merged.slice(from, to + 1);

    group(`${TAG} done`, () => {
      log({ page, pageSize, orderBy, ascending, search, returned: rows.length, total });
      table10(rows, "rows (paged)");
    });

    return { rows, total };
  },

  columns({ onEdit }) {
    return [
      {
        field: "__actions",
        headerName: "Actions",
        width: 96,
        sortable: false,
        filterable: false,
        renderCell: (p) =>
          p?.row ? (
            <Button size="small" variant="outlined" onClick={() => onEdit?.(p.row)}>
              Edit
            </Button>
          ) : null,
        headerClassName: "col-actions",
        cellClassName: "col-actions",
      },
      {
        field: "uuid",
        headerName: "ID",
        width: 260,
        renderCell: (p) => <span style={{ fontWeight: 600 }}>{p?.row?.uuid || ""}</span>,
        headerClassName: "col-id",
        cellClassName: "col-id",
      },

      // ← valueGetter ではなく renderCell で直接描画して “空表示” を回避
      {
        field: "acronym",
        headerName: "Acronym",
        width: 160,
        renderCell: (p) => <Typography variant="body2">{p?.row?.acronym || "—"}</Typography>,
      },
      {
        field: "name",
        headerName: "Official Name (English)",
        minWidth: 260,
        flex: 1,
        renderCell: (p) => <Typography variant="body2">{p?.row?._name || "—"}</Typography>,
      },
      {
        field: "taxapad_code",
        headerName: "Taxapad Code",
        width: 140,
        renderCell: (p) => <Typography variant="body2">{p?.row?.taxapad_code || ""}</Typography>,
      },
      {
        field: "country",
        headerName: "Country",
        width: 140,
        renderCell: (p) => <Typography variant="body2">{p?.row?._country || ""}</Typography>,
      },
      {
        field: "city",
        headerName: "City",
        width: 140,
        renderCell: (p) => <Typography variant="body2">{p?.row?._city || ""}</Typography>,
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        sortable: false,
        renderCell: (p) => {
          const syn = !!p?.row?.is_synonym;
          return <Chip size="small" color={syn ? "warning" : "success"} label={syn ? "Synonym" : "Valid Name"} />;
        },
      },
      {
        field: "valid_name",
        headerName: "Valid Name",
        minWidth: 240,
        flex: 1,
        renderCell: (p) =>
          !p?.row?.is_synonym ? (
            <Typography variant="body2" color="text.secondary">—</Typography>
          ) : (
            <Typography variant="body2">{p?.row?._parentDisp || "—"}</Typography>
          ),
      },
    ];
  },
};

export default plugin;
