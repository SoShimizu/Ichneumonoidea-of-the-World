// src/components/ProtectedRoute/Admin/Consoles/Plugins/researchers.plugin.js
import { Button } from "@mui/material";
import supabase from "../../../../../utils/supabase";

/* ================= Utils & Debug ================= */
const TAG = "[researchers.plugin]";
const isDebug = () => (window.DEBUG_RESEARCHERS ??= true);

const norm = (s) =>
  (s ?? "").toString().normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

const buildName = (row) => {
  if (!row) return "";
  const ln =
    row.last_name ??
    row.lastName ??
    row.family_name ??
    row.familyName ??
    row.surname ??
    "";
  const fn =
    row.first_name ??
    row.firstName ??
    row.given_name ??
    row.givenName ??
    row.forename ??
    "";
  const paired = `${ln}${ln && fn ? ", " : ""}${fn}`.trim();
  if (paired) return paired;
  const single =
    row.name ?? row.full_name ?? row.display_name ?? row.label ?? row.title ?? "";
  return (single || "").toString();
};

const aliasText = (ar) =>
  (
    ar?.alias_name ??
    ar?.name ??
    ar?.full_name ??
    ar?.label ??
    (ar
      ? `${ar?.last_name ?? ""}${ar?.first_name ? ", " : ""}${ar?.first_name ?? ""}`
      : "")
  )?.toString() ?? "";

/** 画面で確実に出せる形に整える（name/aliases フィールドも作る！） */
const normalizeRow = (row) => {
  const _name = buildName(row);
  const _orcid = row?.orcid || "";
  const _aliases = (row?.researcher_aliases || [])
    .map(aliasText)
    .filter(Boolean)
    .join(", ");

  const out = {
    ...row,
    _name: _name || "—",
    _orcid,
    _aliases: _aliases || "—",
    // ▼ DataGrid に直接見せるフィールド
    name: _name || "—",
    aliases: _aliases || "—",
  };
  return out;
};

/* ================= Plugin ================= */
const plugin = {
  table: "researchers",
  select: "*",
  defaultSort: { field: "name", sort: "asc" }, // ← DataGrid が直接ソートできるよう name を使う
  or() {
    return undefined; // 検索は fetch 内で完結
  },

  async fetch({ page, pageSize, orderBy, ascending, search }) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let base = [];
    let total = 0;
    let used = "rpc";

    /* ---------- 1) RPC ---------- */
    try {
      const selectStr =
        "id, first_name, last_name, orcid, researcher_aliases(alias_name)";
      isDebug() && console.groupCollapsed(`${TAG} step1 RPC search_researchers`);
      const { data, error } = await supabase
        .rpc("search_researchers", { search_term: search ?? "" })
        .select(selectStr);

      if (error) throw error;
      base = data || [];
      total = base.length;

      if (isDebug()) {
        console.log("RPC count:", base.length);
        console.log("RPC sample keys:", base[0] ? Object.keys(base[0]) : []);
        console.log("RPC sample row:", base[0] ?? null);
        console.groupEnd();
      }
    } catch (e) {
      used = "fallback";
      if (isDebug()) {
        console.groupCollapsed(`${TAG} step1 RPC failed -> fallback`);
        console.log("code:", e?.code, "message:", e?.message, "details:", e?.details);
        console.groupEnd();
      }
    }

    /* ---------- 2) Fallback: table + aliases ---------- */
    if (used === "fallback") {
      try {
        isDebug() && console.groupCollapsed(`${TAG} step2 table fetch`);
        const { data, error, count } = await supabase
          .from("researchers")
          .select("id, first_name, last_name, orcid", { count: "exact" })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        base = data || [];
        total = count ?? base.length;
        isDebug() && console.log("table count:", base.length, "total:", total);

        // aliases 合流
        if (base.length) {
          const ids = base.map((r) => r.id);
          const { data: aData, error: aErr } = await supabase
            .from("researcher_aliases")
            .select("*")
            .in("researcher_id", ids);
          if (aErr) throw aErr;

          const map = new Map();
          (aData || []).forEach((ar) => {
            const rid = ar.researcher_id ?? ar.researcher ?? ar.researcherId;
            if (!rid) return;
            (map.get(rid) || map.set(rid, []).get(rid)).push(ar);
          });
          base = base.map((r) => ({ ...r, researcher_aliases: map.get(r.id) || [] }));
          isDebug() &&
            console.log("aliases merged, first row aliases:", base[0]?.researcher_aliases);
        }
        isDebug() && console.groupEnd();
      } catch (e) {
        console.error(`${TAG} step2 table fetch error`, e);
        return { rows: [], total: 0 };
      }
    }

    /* ---------- 3) ローカル検索 ---------- */
    let filtered = base.slice();
    if (search) {
      const q = norm(search);
      filtered = filtered.filter((r) => {
        const n = buildName(r);
        const o = r?.orcid || "";
        const al = (r?.researcher_aliases || [])
          .map(aliasText)
          .filter(Boolean)
          .join(", ");
        return [n, o, al].some((x) => norm(x).includes(q));
      });
      isDebug() &&
        console.debug(`${TAG} client filter`, { query: search, after: filtered.length });
    }

    /* ---------- 4) 正規化 & ソート ---------- */
    const normalized = filtered.map(normalizeRow);

    // ソートキーは表示フィールドに揃える
    const keyMap = { name: "name", orcid: "_orcid", aliases: "aliases", id: "id" };
    const k = keyMap[orderBy] || "name";
    const dir = ascending ? 1 : -1;
    normalized.sort(
      (a, b) => (String(a[k] || "") || "").localeCompare(String(b[k] || "")) * dir
    );

    // ページング（RPC は全件返る想定が多いので slice）
    const rows = (used === "rpc" ? normalized.slice(from, to + 1) : normalized).map(
      (r) => r
    );

    /* ---------- 5) 可視ログ（“—” の理由が分かる） ---------- */
    if (isDebug()) {
      console.groupCollapsed(`${TAG} diagnostics (first 10 after normalize)`);
      rows.slice(0, 10).forEach((r, i) => {
        const whyName = r.name !== "—"
          ? "ok"
          : (r.first_name || r.last_name)
          ? "fn/ln present but not bound"
          : "no source fields";
        const whyAliases =
          r.aliases !== "—"
            ? "ok"
            : Array.isArray(r.researcher_aliases)
            ? r.researcher_aliases.length
              ? "alias rows exist but empty after map"
              : "no alias rows"
            : "aliases undefined";
        console.log(`#${i}`, {
          id: r.id,
          nameField: r.name,
          _name: r._name,
          hasNameField: Object.prototype.hasOwnProperty.call(r, "name"),
          aliasesField: r.aliases,
          _aliases: r._aliases,
          hasAliasesField: Object.prototype.hasOwnProperty.call(r, "aliases"),
          whyName,
          whyAliases,
          keys: Object.keys(r),
        });
      });
      console.groupEnd();

      console.debug(`${TAG} done`, {
        used,
        page,
        pageSize,
        orderBy,
        ascending,
        returned: rows.length,
        total: used === "rpc" ? normalized.length : total,
        sampleOut: rows[0],
      });
    }

    return { rows, total: used === "rpc" ? normalized.length : total };
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
        field: "id",
        headerName: "ID",
        width: 250,
        renderCell: (p) => <span style={{ fontWeight: 600 }}>{p?.row?.id || ""}</span>,
        headerClassName: "col-id",
        cellClassName: "col-id",
      },
      {
        // ▼ 行データに "name" フィールドを持たせたので valueGetter 不要
        field: "name",
        headerName: "Name",
        minWidth: 220,
        flex: 1,
      },
      {
        field: "orcid",
        headerName: "ORCID",
        width: 200,
        renderCell: (p) =>
          p?.row?._orcid ? (
            <a href={`https://orcid.org/${p.row._orcid}`} target="_blank" rel="noreferrer">
              {p.row._orcid}
            </a>
          ) : (
            "—"
          ),
      },
      {
        // ▼ 同様に "aliases" を直接表示
        field: "aliases",
        headerName: "Aliases",
        minWidth: 260,
        flex: 1,
        sortable: false,
      },
    ];
  },
};

export default plugin;
