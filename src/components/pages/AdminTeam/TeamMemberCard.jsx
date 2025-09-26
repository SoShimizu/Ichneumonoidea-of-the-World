// src/components/TeamMemberCard.jsx
import React from "react";
import {
  Card,
  CardContent,
  Avatar,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import WorkIcon from "@mui/icons-material/Work";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function TeamMemberCard({ member, lang }) {
  // 表示用テキストを取り出し
  const info = member[lang];

  // スパム対策：*at* → @ → [at] に置換
  const obfuscatedEmail = member.email
    .replace(/\*at\*/g, "@")
    .replace("@", " [at] ");

  return (
    <Card
      elevation={4}
      sx={{
        width: 300,
        borderRadius: 2,
        textAlign: "center",
        bgcolor: "background.paper",
        transition: "transform 0.3s, box-shadow 0.3s",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: theme => `0 8px 24px ${theme.palette.primary.light}33`,
        },
      }}
    >
      <Avatar
        src={member.avatarUrl}
        alt={info.name}
        sx={{
          width: 100,
          height: 100,
          mx: "auto",
          mt: 3,
          border: theme => `2px solid ${theme.palette.primary.main}`,
        }}
      />

      <CardContent>
        {/* 名前 */}
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {info.name}
        </Typography>

        <Stack spacing={1} alignItems="center" mb={2}>
          {/* 役割 */}
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountCircleIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" color="text.primary">
              {info.role}
            </Typography>
          </Stack>

          {/* 所属 */}
          <Stack direction="row" spacing={1} alignItems="center">
            <WorkIcon color="action" fontSize="small" />
            <Typography variant="subtitle2" color="text.secondary">
              {info.affiliation}
            </Typography>
          </Stack>

          {/* メールアドレス（テキスト表示のみ） */}
          <Stack direction="row" spacing={1} alignItems="center">
            <EmailIcon color="action" fontSize="small" />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ userSelect: "all" }}
            >
              {obfuscatedEmail}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 説明文 */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "pre-line" }}
        >
          {info.description}
        </Typography>
      </CardContent>
    </Card>
  );
}
