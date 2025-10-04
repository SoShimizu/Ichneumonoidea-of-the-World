import { Button, Chip, Typography } from "@mui/material";
import supabase from "../../../../../utils/supabase";
import fetchSupabaseAllWithOrdering from "../../../../../utils/fetchSupabaseAllWithOrdering";

const TAG = "[scientificNames.plugin]";

/* ========== helpers ========== */
const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const pickFirst = (obj, keys = []) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
};

// Author 表示: 2名なら「A & B」、3名以上は「A, B & C」
const formatAuthors = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return "—";
  const names = [...rows]
    .sort((a, b) => (a?.author_order ?? 0) - (b?.author_order ?? 0))
    .map((r) => r?.researchers)
    .filter(Boolean)
    .map((a) => a?.last_name || a?.lastName)
    .filter(Boolean);

  if (names.length === 0) return "—";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
};

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/* ========== plugin ========== */
const plugin = {
  table: "scientific_names",
  defaultSort: { field: "name_spell_valid", sort: "asc" },

  // *FK に頼らず* 必要なものは自前で合成できるよう、最低限の列を取得
  select: `
    id,
    name_spell_valid,
    name_spell_original,
    authority_year,
    current_rank,
    current_parent,
    original_rank,
    original_parent,
    valid_name_id,
    type_taxa_id,
    extant_fossil,
    type_category,
    type_locality,
    type_sex,
    type_repository,
    type_repository_id,
    type_host,
    source_of_original_description,
    page,
    remark,
    last_update,
    scientific_name_and_author (
      author_order,
      researchers:researcher_id (
        id,
        last_name,
        first_name
      )
    )
  `,

  normalize(row) {
    return {
      ...row,
      _authors: formatAuthors(row?.scientific_name_and_author),
      _lastUpdateDisp: fmtDate(row?.last_update),
    };
  },

  /**
   * 取得 → 合成 → 検索/ソート/ページング
   */
  async fetch({ page, pageSize, orderBy, ascending, search }) {
    console.debug(`${TAG} ► fetch start`, { page, pageSize, orderBy, ascending, search });

    // 1) 1000件超も回収
    let all = [];
    try {
      all = await fetchSupabaseAllWithOrdering({
        tableName: this.table,
        selectQuery: this.select,
        orderOptions: [
          { column: "id", ascending: true },
          { column: "author_order", ascending: true, referencedTable: "scientific_name_and_author" },
        ],
        limit: 1000,
      });
      console.debug(`${TAG} ✓ fetched total: ${all.length}`);
    } catch (e) {
      console.error(`${TAG} ✗ fetch error`, e);
      return { rows: [], total: 0 };
    }

    // 2) valid_name 解決用マップ
    const id2validName = new Map(all.map((r) => [r.id, r.name_spell_valid]));

    // 3) Repository 詳細取得
    const needRepoIds = Array.from(
      new Set(
        all
          .filter((r) => !r.type_repository && r.type_repository_id)
          .map((r) => r.type_repository_id)
      )
    );
    const repoMap = new Map();
    if (needRepoIds.length) {
      try {
        console.debug(`${TAG} ► fetch repositories`, { count: needRepoIds.length });
        const { data, error } = await supabase
          .from("Repositories")
          .select("uuid, acronym, name_en, city, country")
          .in("uuid", needRepoIds);
        if (error) throw error;
        (data || []).forEach((r) => {
          const parts = [r?.acronym, r?.name_en].filter(Boolean).join(" — ");
          const loc = [r?.city, r?.country].filter(Boolean).join(", ");
          repoMap.set(r.uuid, loc ? `${parts} (${loc})` : parts);
        });
      } catch (e) {
        console.warn(`${TAG} (repo fetch failed, fallback to uuid)`, e);
      }
    }

    // 4) 表示用フィールド合成（Status 判定のロバスト化）
    const synonymKeywords = ["synonym", "junior synonym", "objective synonym", "subjective synonym"];
    let merged = all.map((r) => {
      const _nameValidDisp = pickFirst(r, ["name_spell_valid", "valid_name", "name_valid", "name"]);
      const _nameOrigDisp = pickFirst(r, ["name_spell_original", "name_original", "original_name"]);

      const rankLower = (r.current_rank || "").toString().toLowerCase();
      const isSynonymByRank = synonymKeywords.some((kw) => rankLower === kw);
      const isSynonymByLink = !!(r.valid_name_id && r.valid_name_id !== r.id);
      const _is_synonym = isSynonymByRank || isSynonymByLink;

      const _validName = isSynonymByLink
        ? id2validName.get(r.valid_name_id) || ""
        : ""; // リンクが無い synonym は空表示のまま

      const _typeRepo =
        r.type_repository ||
        (r.type_repository_id ? repoMap.get(r.type_repository_id) || r.type_repository_id : "");

      return this.normalize({
        ...r,
        _nameValidDisp,
        _nameOrigDisp,
        _is_synonym,
        _validName,
        _typeRepo,
        _remark: r?.remark ?? r?.Remark ?? "",
      });
    });

    // 5) 検索
    if (search) {
      const q = norm(search);
      merged = merged.filter((r) =>
        [
          r.id,
          r._nameValidDisp,
          r._nameOrigDisp,
          r._authors,
          r.authority_year,
          r.current_rank,
          r.current_parent,
          r.original_rank,
          r.original_parent,
          r._validName,
          r.type_taxa_id,
          r.extant_fossil,
          r.type_category,
          r.type_locality,
          r.type_sex,
          r._typeRepo,
          r.type_host,
          r.source_of_original_description,
          r.page,
          r._remark,
          r._lastUpdateDisp,
        ]
          .map((x) => norm(x))
          .some((x) => x.includes(q))
      );
    }

    // 6) 並べ替え
    const keyMap = {
      id: "id",
      name_spell_valid: "_nameValidDisp",
      name_spell_original: "_nameOrigDisp",
      authority: "_authors",
      authority_year: "authority_year",
      current_rank: "current_rank",
      current_parent: "current_parent",
      original_rank: "original_rank",
      original_parent: "original_parent",
      valid_name_id: "_validName",
      type_taxa_id: "type_taxa_id",
      extant_fossil: "extant_fossil",
      type_category: "type_category",
      type_locality: "type_locality",
      type_sex: "type_sex",
      type_repository: "_typeRepo",
      type_host: "type_host",
      source_of_original_description: "source_of_original_description",
      page: "page",
      remark: "_remark",
      last_update: "_lastUpdateDisp",
      status: "_is_synonym",
    };
    const k = keyMap[orderBy] || "_nameValidDisp";
    const dir = ascending ? 1 : -1;
    merged.sort((a, b) => {
      const av = a?.[k];
      const bv = b?.[k];
      if (typeof av === "boolean" || typeof bv === "boolean") {
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
      }
      return (av ?? "").toString().localeCompare((bv ?? "").toString()) * dir;
    });

    // 7) ページング
    const total = merged.length;
    const from = page * pageSize;
    const to = from + pageSize;
    const rows = merged.slice(from, to);

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
      },
      {
        field: "id",
        headerName: "ID",
        width: 220,
        renderCell: (p) => <span style={{ fontWeight: 600 }}>{p?.row?.id || ""}</span>,
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        sortable: false,
        renderCell: (p) => {
          const syn = !!p?.row?._is_synonym;
          return <Chip size="small" color={syn ? "warning" : "success"} label={syn ? "Synonym" : "Valid Name"} />;
        },
      },
      {
        field: "valid_name_id",
        headerName: "Valid Name",
        minWidth: 220,
        flex: 1,
        renderCell: (p) =>
          !p?.row?._is_synonym ? (
            <Typography variant="body2" color="text.secondary">—</Typography>
          ) : (
            <Typography variant="body2">{p?.row?._validName || "—"}</Typography>
          ),
      },
      {
        field: "name_spell_valid",
        headerName: "Name (valid)",
        minWidth: 220,
        flex: 1,
        renderCell: (p) => <Typography variant="body2">{p?.row?._nameValidDisp || "—"}</Typography>,
      },
      {
        field: "name_spell_original",
        headerName: "Original Spelling",
        minWidth: 200,
        flex: 1,
        renderCell: (p) => <Typography variant="body2">{p?.row?._nameOrigDisp || "—"}</Typography>,
      },
      {
        field: "authority",
        headerName: "Authority",
        minWidth: 200,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {p?.row?._authors || "—"}
          </Typography>
        ),
        sortable: false,
      },
      { field: "authority_year", headerName: "Year", width: 90 },
      { field: "current_rank", headerName: "Current Rank", width: 120 },
      { field: "current_parent", headerName: "Current Parent", width: 160 },
      { field: "original_rank", headerName: "Original Rank", width: 120 },
      { field: "original_parent", headerName: "Original Parent", width: 160 },
      { field: "type_taxa_id", headerName: "Type Taxa ID", width: 150 },
      { field: "extant_fossil", headerName: "Extant/Fossil", width: 120 },
      { field: "type_category", headerName: "Type Category", width: 140 },
      { field: "type_locality", headerName: "Type Locality", width: 160 },
      { field: "type_sex", headerName: "Type Sex", width: 100 },
      {
        field: "type_repository",
        headerName: "Type Repository",
        minWidth: 240,
        flex: 1,
        renderCell: (p) => <Typography variant="body2">{p?.row?._typeRepo || "—"}</Typography>,
      },
      { field: "type_host", headerName: "Type Host", width: 160 },
      { field: "source_of_original_description", headerName: "Source", width: 180 },
      { field: "page", headerName: "Page", width: 80 },
      {
        field: "remark",
        headerName: "Remark",
        minWidth: 220,
        flex: 1,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {p?.row?._remark || "—"}
          </Typography>
        ),
      },
      {
        field: "last_update",
        headerName: "Last Update",
        width: 160,
        renderCell: (p) => <Typography variant="body2">{p?.row?._lastUpdateDisp || ""}</Typography>,
      },
    ];
  },
};

export default plugin;
