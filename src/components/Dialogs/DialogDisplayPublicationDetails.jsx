import React from "react";
import { Box, Typography, Link, Stack, Divider } from "@mui/material";
import dayjs from "dayjs";
import BookIcon from "@mui/icons-material/Book";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArticleIcon from "@mui/icons-material/Article";
import LaunchIcon from "@mui/icons-material/Launch";

export default function DialogDisplayPublicationDetails({ publication }) {
  if (!publication) return null;

  // 著者情報を順番に抽出（存在すれば）
  const authors =
    publication.publications_authors?.length > 0
      ? publication.publications_authors
          .sort((a, b) => a.author_order - b.author_order)
          .map((rel) => rel.author)
      : [];

  return (
    <Box sx={{ p: 3 }}>
      <Divider sx={{ mb: 2, borderColor: "aquamarine" }} />

      {/* タイトルとアイコン */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <BookIcon sx={{ fontSize: 32, color: "aquamarine" }} />
        <Typography
          variant="h5"
          component="h1"
          dangerouslySetInnerHTML={{
            __html: publication.title_english || publication.title_original || "No Title",
          }}
          sx={{ fontWeight: "bold" }}
        />
      </Stack>

      {/* 著者 */}
      {authors.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <PersonOutlineIcon sx={{ color: "aquamarine" }} />
          <Typography variant="body1">
            {authors
              .map((a) => `${a?.last_name_eng ?? ""}, ${a?.first_name_eng ?? ""}`)
              .join("; ")}
          </Typography>
        </Stack>
      )}

      {/* 雑誌名と出版日 */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <ArticleIcon sx={{ color: "aquamarine" }} />
        <Typography variant="body2" color="text.secondary">
          <i>{publication.journal?.name_english || "No Journal"}</i>
        </Typography>
        {/* 巻号、号数、ページ、Article ID */}
        <Typography variant="body2" sx={{ mb: 2 }}>
          |&nbsp;
          {publication.volume && `Vol. ${publication.volume} `}
          {publication.number && `(No. ${publication.number}) `}
          |&nbsp;
          {publication.article_id && `Article ID: ${publication.article_id}`} &nbsp; {publication.page && `pp. ${publication.page} `}
        </Typography>
        {publication.publication_date && (
          <Typography variant="body2" color="text.secondary">
            {" | Published: " + dayjs(publication.publication_date).format("YYYY-MM-DD")}
          </Typography>
        )}
      </Stack>


      {/* DOI */}
      {publication.doi && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <LaunchIcon sx={{ color: "aquamarine" }} />
          <Typography variant="body2">
            DOI:{" "}
            <Link
              href={`https://doi.org/${publication.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "aquamarine", textDecoration: "none" }}
            >
              {publication.doi}
            </Link>
          </Typography>
        </Stack>
      )}

      <Divider sx={{ my: 2, borderColor: "aquamarine" }} />

      {/* Abstract (英語) */}
      {publication.abstract_english && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Abstract (EN)
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", textAlign: "justify" }}>
            {publication.abstract_english}
          </Typography>
        </>
      )}

      {/* Abstract (その他) */}
      {publication.abstract_other && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Abstract (Other)
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", textAlign: "justify" }}>
            {publication.abstract_other}
          </Typography>
        </>
      )}

      <Divider sx={{ mt: 3, borderColor: "aquamarine" }} />
    </Box>
  );
}
