// src/components/AdminTeam.jsx
"use client";

import React, { useState } from "react";
import {
  Box, Typography, Stack,
  ToggleButton, ToggleButtonGroup,
  Button
} from "@mui/material";
import TeamMemberCard from "./TeamMemberCard";
import AdminContributionChart from "../../Charts/AdminContributionChart";
import useAuditLogs from "../../../myHooks/useAuditLogs";
import texts from "./adminTeamText.json";
import teamMembers from "./teamMembers.json";

export default function AdminTeam() {
  const [lang, setLang] = useState("en");
  const { logs, loading, error } = useAuditLogs();
  const t = texts[lang];

  if (loading) return <Typography>Loading…</Typography>;
  if (error)   return <Typography color="error">Error loading data</Typography>;

  return (
    <Box sx={{ p: 4 }}>
      {/* --- 言語切替 --- */}
      <Box sx={{ textAlign: "right", mb: 2 }}>
        <ToggleButtonGroup
          value={lang}
          exclusive
          onChange={(_, v) => v && setLang(v)}
          size="small"
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="ja">日本語</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* --- タイトル --- */}
      <Typography variant="h2" align="center" gutterBottom>
        {t.pageTitle}
      </Typography>

      {/* --- About --- */}
      <Box maxWidth="md" mx="auto" sx={{ mb: 6 }}>
        <Typography variant="body1"
                    align="center"
                    sx={{ whiteSpace:"pre-line" }}>
          {t.aboutText}
        </Typography>
      </Box>

      {/* --- メンバーカード --- */}
      <Stack direction={{ xs:"column", md:"row" }}
             spacing={4}
             justifyContent="center"
             flexWrap="wrap"
             sx={{ mb: 6 }}>
        {teamMembers.map(member => (
          <TeamMemberCard key={member.email}
                          member={member}
                          lang={lang} />
        ))}
      </Stack>

      {/* --- 管理者アクティビティチャート --- */}
      <AdminContributionChart logs={logs} lang={lang} />
    </Box>
  );
}
