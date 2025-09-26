import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * 汎用的なローディングコンポーネント
 * @param {string} message - ローディング中に表示するメッセージ
 * @param {string} color - スピナーの色 ("primary" | "secondary" | "success" など)
 * @param {number} size - スピナーのサイズ
 * @param {number} thickness - スピナーの線の太さ
 */
export default function LoadingScreen({
  message = "Loading...",
  color = "primary",
  size = 60,
  thickness = 4,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh", // 💥 画面いっぱい中央にする
        gap: 2,
        bgcolor: "background.default", // オプション：背景色も合わせるとさらに自然
      }}
    >
      <CircularProgress color={color} size={size} thickness={thickness} />
      <Typography variant="subtitle1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
