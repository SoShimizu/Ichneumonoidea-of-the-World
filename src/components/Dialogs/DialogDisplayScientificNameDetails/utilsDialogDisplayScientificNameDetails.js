// utilsDialogDisplayScientificNameDetails.js

import dayjs from "dayjs";

/**
 * 分布Mapでの塗りつぶし色 (国ごとのレコード数に応じたグラデーション)
 */
export function interpolateColor(value) {
  const colors = [
    [255, 255, 255],
    [0, 212, 255],
    [255, 255, 0],
    [255, 165, 0],
    [255, 0, 0],
    [139, 69, 19],
  ];
  const steps = colors.length - 1;
  const step = Math.min(Math.floor(value * steps), steps - 1);
  const ratio = value * steps - step;
  const start = colors[step];
  const end = colors[step + 1];
  const interpolated = start.map((s, i) => Math.round(s + (end[i] - s) * ratio));
  return `rgb(${interpolated.join(",")})`;
}

/**
 * reliability_id => 星評価の例 ("low","medium","high")
 */
export function getStarRating(reliabilityId) {
  switch (reliabilityId) {
    case "low":
      return "★☆☆ (Low)";
    case "medium":
      return "★★☆ (Medium)";
    case "high":
      return "★★★ (High)";
    default:
      return "-";
  }
}

/**
 * 文献を簡易的にまとめた文字列として返す
 */
export function shortRef(pub) {
  if (!pub) return "No reference provided";

  const authors = pub.publications_authors
    ? pub.publications_authors
        .sort((a, b) => a.author_order - b.author_order)
        .map((rel) => rel.author?.last_name_eng)
        .filter(Boolean)
    : [];
  const year = pub.publication_date ? dayjs(pub.publication_date).format("YYYY") : "n.d.";
  const authorsStr =
    authors.length === 0
      ? `Unknown authors ${year}`
      : authors.length === 1
      ? `${authors[0]} ${year}`
      : `${authors[0]} et al. ${year}`;

  const journalName = pub.journal?.name_english || "";
  const volStr = pub.volume ? ` Vol. ${pub.volume}` : "";
  const numStr = pub.number ? ` (No. ${pub.number})` : "";
  const pageStr = pub.page ? `: ${pub.page}` : "";

  return `${authorsStr}${journalName ? ` — ${journalName}` : ""}${volStr}${numStr}${pageStr}${
    pub.doi ? `  DOI: ${pub.doi}` : ""
  }`;
}
