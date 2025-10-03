// src/components/ProtectedRoute/Admin/Consoles/Plugins/taxonomicActs.plugin.js
import { Button, Typography } from "@mui/material";

const LOG_TAG = "[taxonomicActs.plugin]";
const S = (v) => (v ?? "") + "";

/** テキストセルの共通レンダラ */
const textCell = (get) => (p) => (
  <Typography
    variant="body2"
    sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}
  >
    {S(get(p))}
  </Typography>
);

const taxonomicActsPlugin = {
  table: "taxonomic_acts",
  select: `*`,
  defaultSort: { field: "created_at", sort: "desc" },

  /** フリーテキスト検索（.or() に渡す “中身だけ” を返す） */
  or(search) {
    if (!search) return undefined;
    const like = `%${search}%`;
    const fields = [
      "id",
      "scientific_name_id",
      "publication_id",
      "act_type_id",
      "related_name_id",
      "replacement_name_id",
      "rank_change_to",
      "type_specimen_id",
      "type_taxon_id",
      "page",
      "remarks",
    ];
    const expr = fields.map((f) => `${f}.ilike.${like}`).join(",");
    // ⚠ supabase-js の .or() には "or=" を付けない
    return expr;
  },

  /** 行整形（必要なら派生値を追加）。ここで到着キーのログも出す */
  normalize(row) {
    if (row && !row.__logged) {
      // 最初の数件だけキーをログ（スパム回避）
      try {
        console.debug(`${LOG_TAG} row keys`, Object.keys(row));
      } catch {}
      row.__logged = true;
    }
    return row;
  },

  /** DataGrid 列定義（必ず renderCell を使う） */
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
        field: "id",
        headerName: "ID",
        width: 220,
        renderCell: textCell((p) => p?.row?.id),
      },
      {
        field: "scientific_name_id",
        headerName: "Target Name",
        width: 240,
        renderCell: textCell((p) => p?.row?.scientific_name_id),
      },
      {
        field: "publication_id",
        headerName: "Publication",
        width: 220,
        renderCell: textCell((p) => p?.row?.publication_id),
      },
      {
        field: "act_type_id",
        headerName: "Act Type (Code)",
        width: 160,
        renderCell: textCell((p) => p?.row?.act_type_id),
      },
      {
        field: "related_name_id",
        headerName: "Related Name",
        width: 240,
        renderCell: textCell((p) => p?.row?.related_name_id),
      },
      {
        field: "replacement_name_id",
        headerName: "Replacement Name",
        width: 240,
        renderCell: textCell((p) => p?.row?.replacement_name_id),
      },
      {
        field: "rank_change_to",
        headerName: "New Rank",
        width: 140,
        renderCell: textCell((p) => p?.row?.rank_change_to),
      },
      {
        field: "type_specimen_id",
        headerName: "Type Specimen",
        width: 200,
        renderCell: textCell((p) => p?.row?.type_specimen_id),
      },
      {
        field: "type_taxon_id",
        headerName: "Type Taxon",
        width: 200,
        renderCell: textCell((p) => p?.row?.type_taxon_id),
      },
      {
        field: "page",
        headerName: "Page",
        width: 100,
        renderCell: textCell((p) => p?.row?.page),
      },
      {
        field: "remarks",
        headerName: "Remarks",
        minWidth: 260,
        flex: 1,
        renderCell: textCell((p) => p?.row?.remarks),
      },
      {
        field: "created_at",
        headerName: "Created At",
        width: 180,
        renderCell: (p) => {
          const raw = p?.row?.created_at;
          let label = "—";
          if (raw) {
            try {
              label = new Date(raw).toLocaleString("ja-JP");
            } catch {
              label = S(raw);
            }
          }
          return (
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {label}
            </Typography>
          );
        },
      },
    ];
  },
};

export default taxonomicActsPlugin;
