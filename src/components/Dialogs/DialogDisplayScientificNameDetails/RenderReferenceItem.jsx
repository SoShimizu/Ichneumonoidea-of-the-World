// RenderReferenceItem.jsx
import React from "react";
import { Stack, Chip, Typography, Link } from "@mui/material";
import dayjs from "dayjs";

/**
 * 文献1件を表示 (bionomic_records の references ではなく publications テーブルのデータ想定)
 */
export default function RenderReferenceItem({ pub }) {
  if (!pub) return null;

  // カテゴリごとに色をつける例
  const catColors = {
    "Original description": "warning",
    "Taxonomic acts": "success",
    "Distribution": "info",
    "Ecology": "secondary",
  };

  // 著者
  const authors = pub.publications_authors
    ? pub.publications_authors
        .sort((a, b) => a.author_order - b.author_order)
        .map((r) => r.author)
        .filter(Boolean)
    : [];
  const authorStr = authors.length
    ? authors.map((a) => a.last_name_eng || "N/A").join("; ")
    : "Unknown authors";

  const journalName = pub.journal?.name_english || "No Journal Info";
  const pubYear = pub.publication_date ? dayjs(pub.publication_date).format("YYYY") : "n.d.";
  const titleHtml = pub.title_english || pub.title_original || "No Title Available";

  return (
    <>
      {/* カテゴリ（例: "Distribution" "Ecology"など）があればChip表示 */}
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
        {pub.categories?.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            color={catColors[cat] || "default"}
            size="small"
            variant="outlined"
            sx={{ mb: 0.5 }}
          />
        ))}
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: "medium", lineHeight: 1.3 }} gutterBottom>
        {authorStr} ({pubYear})
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5, lineHeight: 1.3 }}
        dangerouslySetInnerHTML={{ __html: titleHtml }}
      />

      {(journalName !== "No Journal Info" || pub.volume || pub.page) && (
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ fontStyle: "italic", lineHeight: 1.3 }}
        >
          {journalName}
          {pub.volume ? `, Vol. ${pub.volume}` : ""}
          {pub.number ? ` (No. ${pub.number})` : ""}
          {pub.page ? `: ${pub.page}` : ""}
        </Typography>
      )}

      {pub.doi && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.3, mt: 0.5 }}>
          DOI:{" "}
          <Link
            href={`https://doi.org/${pub.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "aquamarine", wordBreak: "break-all" }}
          >
            {pub.doi}
          </Link>
        </Typography>
      )}
    </>
  );
}
