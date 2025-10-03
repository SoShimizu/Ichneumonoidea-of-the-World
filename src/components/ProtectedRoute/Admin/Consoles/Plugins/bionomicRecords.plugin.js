// src/components/ProtectedRoute/Admin/Consoles/Plugins/bionomicRecords.plugin.js
import { Button, Typography, Box } from "@mui/material";
import supabase from "../../../../../utils/supabase";

const LOG_TAG = "[bionomicRecords.plugin]";

/** 安全に文字列化 */
const S = (v) => (v ?? "").toString();

/** Publication ラベルをできる範囲で整形 */
function buildPubLabel(pub) {
  if (!pub) return "—";
  const year = pub.publication_date
    ? new Date(pub.publication_date).getFullYear()
    : "";
  const journal = pub.journal?.name_english || "";
  const vol = pub.volume ? ` ${pub.volume}` : "";
  const num = pub.number ? `(${pub.number})` : "";
  const page = pub.page ? `: ${pub.page}` : "";
  const jInfo = journal ? ` — ${journal}${vol}${num}${page}` : "";
  return `[${pub.id}] ${pub.title_english || ""}${year ? ` (${year})` : ""}${jInfo}`;
}

const bionomicRecordsPlugin = {
  table: "bionomic_records",
  // 行本体は素直に * 取得（配列JSONの distribution などもそのまま入る）
  select: `*`,
  defaultSort: { field: "created_at", sort: "desc" },

  /**
   * 検索 or= クエリ
   * ※ 存在が確実なカラムのみを対象に
   */
  or(search) {
    if (!search) return undefined;
    const like = `%${search}%`;
    const fields = [
      "id",
      "source_publication_id",
      "page_start",
      "page_end",
      "target_taxa_id",
      "data_type",
      "country_id",
      "host_taxon_id",
      "other_related_taxon_id",
      "remark",
    ];
    const expr = fields.map((f) => `${f}.ilike.${like}`).join(",");
    return `or=(${expr})`;
  },

  /**
   * カスタム fetch:
   * 1) 本体をページング取得
   * 2) pub / taxa を個別に一括取得
   * 3) 行に派生値 _pub_label / _taxon_label を付与
   */
  async fetch({ page, pageSize, orderBy, ascending, search }) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // 1) 本体
    let query = supabase
      .from(this.table)
      .select(this.select, { count: "exact" })
      .range(from, to);

    const orExpr = this.or(search);
    if (orExpr) query = query.or(orExpr);

    try {
      query = query.order(orderBy, { ascending });
    } catch {
      // フィールド名が不正だった場合に備えて created_at へフェイルバック
      console.warn(`${LOG_TAG} order fallback -> created_at desc`, { orderBy });
      query = query.order("created_at", { ascending: false });
    }

    console.debug(`${LOG_TAG} fetch:list`, {
      from,
      to,
      orderBy,
      ascending,
      search,
      select: this.select,
      or: orExpr,
    });

    const { data: rows, error, count } = await query;
    if (error) {
      console.error(`${LOG_TAG} fetch:list error`, error);
      throw error;
    }
    console.debug(`${LOG_TAG} fetch:list ok`, { count: rows?.length ?? 0, total: count });

    // 2) 参照IDを収集
    const pubIds = new Set();
    const taxaIds = new Set();
    (rows || []).forEach((r) => {
      if (r?.source_publication_id) pubIds.add(r.source_publication_id);
      if (r?.target_taxa_id) taxaIds.add(r.target_taxa_id);
    });

    console.debug(`${LOG_TAG} deps`, {
      pubs: pubIds.size,
      taxa: taxaIds.size,
    });

    // 3) 依存テーブルを一括取得（必要時のみ）
    let pubMap = new Map();
    if (pubIds.size > 0) {
      const { data: pubs, error: pErr } = await supabase
        .from("publications")
        .select(
          `
          id,
          title_english,
          publication_date,
          volume,
          number,
          page,
          journal:journal_id(name_english)
        `
        )
        .in("id", Array.from(pubIds));
      if (pErr) {
        console.warn(`${LOG_TAG} publications fetch warn`, pErr);
      } else {
        pubs.forEach((p) => pubMap.set(p.id, p));
        console.debug(`${LOG_TAG} publications hydrated`, pubs.length);
      }
    }

    let taxaMap = new Map();
    if (taxaIds.size > 0) {
      const { data: taxa, error: tErr } = await supabase
        .from("scientific_names")
        .select("id, name_spell_valid")
        .in("id", Array.from(taxaIds));
      if (tErr) {
        console.warn(`${LOG_TAG} taxa fetch warn`, tErr);
      } else {
        taxa.forEach((t) => taxaMap.set(t.id, t));
        console.debug(`${LOG_TAG} taxa hydrated`, taxa.length);
      }
    }

    // 4) 行に派生表示値を付加
    const hydrated = (rows || []).map((r) => {
      const pub = pubMap.get(r.source_publication_id);
      const tax = taxaMap.get(r.target_taxa_id);
      return {
        ...r,
        _pub_label: buildPubLabel(pub) || S(r.source_publication_id),
        _taxon_label: tax?.name_spell_valid || S(r.target_taxa_id),
      };
    });

    return { rows: hydrated, total: count || hydrated.length };
  },

  /**
   * normalize は今回は不要（fetch で派生値を付けているため）
   * 何か追加したい場合だけ使う
   */
  normalize(row) {
    return row;
  },

  /**
   * DataGrid 列定義
   * - Publication は _pub_label（ラベル）を表示
   * - Target Taxon は _taxon_label を表示
   * - Distribution は箇条書きレンダリング
   */
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
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                console.debug(`${LOG_TAG} Edit click`, p.row?.id);
                onEdit?.(p.row);
              }}
            >
              Edit
            </Button>
          ) : null,
      },
      {
        field: "created_at",
        headerName: "Created At",
        width: 160,
        renderCell: (p) => {
          const raw = p?.row?.created_at;
          if (!raw) return "—";
          try {
            return new Date(raw).toLocaleString("ja-JP");
          } catch {
            return S(raw);
          }
        },
      },
      {
        field: "_pub_label",
        headerName: "Source Publication",
        flex: 1,
        minWidth: 320,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {S(p?.row?._pub_label)}
          </Typography>
        ),
      },
      {
        field: "page_start",
        headerName: "Page Start",
        width: 110,
        valueGetter: (p) => S(p?.row?.page_start),
      },
      {
        field: "page_end",
        headerName: "Page End",
        width: 110,
        valueGetter: (p) => S(p?.row?.page_end),
      },
      {
        field: "_taxon_label",
        headerName: "Target Taxon",
        flex: 0.7,
        minWidth: 240,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {S(p?.row?._taxon_label)}
          </Typography>
        ),
      },
      {
        field: "data_type",
        headerName: "Data Type",
        width: 120,
        valueGetter: (p) => S(p?.row?.data_type),
      },
      {
        field: "distribution",
        headerName: "Distribution",
        flex: 1,
        minWidth: 360,
        renderCell: (p) => {
          const arr = Array.isArray(p?.row?.distribution)
            ? p.row.distribution
            : [];
          if (arr.length === 0) return "—";
          return (
            <Box component="ul" sx={{ pl: 2, my: 0 }}>
              {arr.slice(0, 5).map((d, i) => {
                const bits = [];
                if (d.country) bits.push(d.country);
                if (d.state) bits.push(d.state);
                if (d.city) bits.push(d.city);
                if (d.detail) bits.push(d.detail);
                if (d.latitude && d.longitude)
                  bits.push(`(${d.latitude}, ${d.longitude})`);
                return (
                  <li key={i} style={{ whiteSpace: "nowrap" }}>
                    {bits.join(", ")}
                  </li>
                );
              })}
              {arr.length > 5 ? ` … (+${arr.length - 5})` : ""}
            </Box>
          );
        },
      },
      // 必要なら他の元カラムも追加してください（country_id, remark など）
    ];
  },
};

export default bionomicRecordsPlugin;
