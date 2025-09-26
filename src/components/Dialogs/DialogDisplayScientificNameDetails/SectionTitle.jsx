// SectionTitle.jsx
import React from "react";
import { Stack, Typography } from "@mui/material";

/**
 * セクションタイトル + アイコン
 * @param {React.ReactNode} icon
 * @param {string} title
 */
export default function SectionTitle({ icon, title }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
      {React.cloneElement(icon, { sx: { color: "aquamarine" }, fontSize: "small" })}
      <Typography variant="h6">{title}</Typography>
    </Stack>
  );
}
