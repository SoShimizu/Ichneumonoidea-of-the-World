// Consoles/Plugins/publications.plugin.js
import { Chip, Button } from "@mui/material";

const statusChip = (value) => {
  if (!value) return "—";
  const map = { complete: "success", in_progress: "warning", not_yet: "default" };
  return <Chip size="small" color={map[value] ?? "default"} label={value} />;
};

const stripTags = (s) => (s || "").replace(/<[^>]*>/g, " ");
const fmtAuthor = (r) => {
  if (!r) return "";
  const ln = r.last_name_eng || r.last_name || "";
  const fn = r.first_name_eng || r.first_name || "";
  return `${ln}${ln && fn ? ", " : ""}${fn}`;
};
// .or に渡す文字列用：カンマエスケープ
const escCommas = (s) => String(s || "").replace(/,/g, "\\,");

const publicationsPlugin = {
  table: "publications",
  select: `
    id, publication_type, publication_date, online_first_date,
    title_english, title_original,
    journal_id, volume, number, article_id, page, doi, is_open_access,
    scientific_name_status, taxonomic_act_status, distribution_status, ecological_data_status,
    journal:journal_id ( id, name_english, name_original ),
    publications_authors (
      author_order,
      author:researcher_id ( id, last_name, first_name )
    )
  `,
  defaultSort: { field: "publication_date", sort: "desc" },

  // ✅ Supabase JS の .or には 'or=(...)' を渡さない
  or(search) {
    if (!search) return undefined;
    const like = `%${escCommas(search)}%`;
    return [
      `id.ilike.${like}`,
      `title_english.ilike.${like}`,
      `title_original.ilike.${like}`,
      `doi.ilike.${like}`,
    ].join(",");
  },

  normalize(row) {
    const authors =
      (row.publications_authors || [])
        .sort((a, b) => (a?.author_order ?? 0) - (b?.author_order ?? 0))
        .map((x) => x.author)
        .filter(Boolean);

    const authorsText = (authors || []).map(fmtAuthor).filter(Boolean).join("; ");

    return {
      ...row,
      authors,
      authorsText,
      titleEnglishHtml: row.title_english || "",
      titleOriginalHtml: row.title_original || "",
      titleEnglishText: stripTags(row.title_english),
      titleOriginalText: stripTags(row.title_original),
      journalName: row.journal?.name_english || "",
    };
  },

  // HTML 無視でローカル補完検索（著者・誌名も）
  searchLocal(rows, q) {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (r.id || "").toLowerCase().includes(needle) ||
      (r.doi || "").toLowerCase().includes(needle) ||
      (r.titleEnglishText || "").toLowerCase().includes(needle) ||
      (r.titleOriginalText || "").toLowerCase().includes(needle) ||
      (r.journalName || "").toLowerCase().includes(needle) ||
      (r.authorsText || "").toLowerCase().includes(needle)
    );
  },

  columns({ onEdit }) {
    return [
      {
        field: "__actions",
        headerName: "Actions",
        width: 96,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Button size="small" variant="outlined" onClick={() => onEdit?.(p.row)}>
            Edit
          </Button>
        ),
        headerClassName: "col-actions",
        cellClassName: "col-actions",
      },
      {
        field: "id",
        headerName: "ID",
        width: 220,
        renderCell: (p) => <span style={{ fontWeight: 600 }}>{p.row.id}</span>,
        headerClassName: "col-id",
        cellClassName: "col-id",
      },
      {
        field: "authors",
        headerName: "Authors",
        width: 260,
        sortable: false,
        valueGetter: (p) => p.row?.authorsText || "",
        renderCell: (p) =>
          (p.row?.authors || []).length ? (
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
              {p.row.authors.map((a, i) => (
                <li key={a?.id || i}>{fmtAuthor(a)}</li>
              ))}
            </ol>
          ) : "—",
      },
      {
        field: "title_english",
        headerName: "Title (English)",
        flex: 1.2,
        minWidth: 260,
        sortable: false,
        renderCell: (p) => (
          <span dangerouslySetInnerHTML={{ __html: p.row?.titleEnglishHtml || "" }} />
        ),
      },
      {
        field: "title_original",
        headerName: "Title (Original)",
        flex: 1,
        minWidth: 240,
        sortable: false,
        renderCell: (p) => (
          <span dangerouslySetInnerHTML={{ __html: p.row?.titleOriginalHtml || "" }} />
        ),
      },
      {
        field: "journal",
        headerName: "Journal",
        width: 200,
        valueGetter: (p) => p.row?.journal?.name_english || "",
        renderCell: (p) => <i>{p.row?.journal?.name_english || "—"}</i>,
      },
      {
        field: "doi",
        headerName: "DOI",
        width: 180,
        renderCell: (p) =>
          p.row?.doi ? (
            <a href={`https://doi.org/${p.row.doi}`} target="_blank" rel="noreferrer">
              {p.row.doi}
            </a>
          ) : "—",
      },
      { field: "volume", headerName: "Vol.", width: 70 },
      { field: "number", headerName: "No.", width: 70 },
      { field: "article_id", headerName: "Article ID", width: 100 },
      { field: "page", headerName: "Pages", width: 90 },
      {
        field: "publication_date",
        headerName: "Date",
        width: 110,
        valueGetter: (p) => (p.row?.publication_date || "").slice(0, 10),
      },
      {
        field: "is_open_access",
        headerName: "Open",
        width: 72,
        renderCell: (p) =>
          p.row?.is_open_access ? <Chip size="small" color="success" label="Open" /> : "—",
      },
      { field: "scientific_name_status", headerName: "Sci. Name?", width: 140,
        renderCell: (p) => statusChip(p.row?.scientific_name_status) },
      { field: "taxonomic_act_status", headerName: "Tax. Act?", width: 130,
        renderCell: (p) => statusChip(p.row?.taxonomic_act_status) },
      { field: "distribution_status", headerName: "Dist.?", width: 110,
        renderCell: (p) => statusChip(p.row?.distribution_status) },
      { field: "ecological_data_status", headerName: "Ecol.?", width: 110,
        renderCell: (p) => statusChip(p.row?.ecological_data_status) },
    ];
  },
};

export default publicationsPlugin;
export { publicationsPlugin };
