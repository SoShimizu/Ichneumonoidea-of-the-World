// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7FFFD4" }, // アクアマリン色（目に優しい＋アクセント）
    background: {
      default: "#000000",    // 真のブラック背景
      paper: "#121212",      // 少し柔らかいブラック
    },
    text: {
      primary: "#E0F7FA",    // 目に優しいライトブルー
      secondary: "#B0BEC5",  // 補助テキストに使うグレイッシュブルー
    },
  },
  typography: {
    fontFamily: `"Roboto", "Noto Sans JP", "Helvetica", "Arial", sans-serif`,
    fontSize: 16,  // ✅ Baseフォントサイズは 16px (SEO的にも推奨)

    // 見出しはサイズ階層をきれいに整理！
    h1: {
      fontSize: "2.5rem", // 約40px
      fontWeight: 700,
      lineHeight: 1.2,
      textAlign: "center",
    },
    h2: {
      fontSize: "2rem", // 約32px
      fontWeight: 600,
      lineHeight: 1.3,
      textAlign: "center",
    },
    h3: {
      fontSize: "1.75rem", // 約28px
      fontWeight: 600,
      lineHeight: 1.3,
      textAlign: "center",
    },
    h4: {
      fontSize: "1.5rem", // 約24px
      fontWeight: 600,
      lineHeight: 1.4,
      textAlign: "center",
    },
    h5: {
      fontSize: "1.25rem", // 約20px
      fontWeight: 500,
      lineHeight: 1.4,
      textAlign: "center",
    },
    h6: {
      fontSize: "1rem", // 16px
      fontWeight: 500,
      lineHeight: 1.5,
      textAlign: "center",
    },

    // 本文
    body1: {
      fontSize: "1rem", // 16px
      lineHeight: 1.6,
      color: "#E0F7FA",
      //textAlign: "justify",
    },
    body2: {
      fontSize: "0.875rem", // 14px
      lineHeight: 1.6,
      color: "#B0BEC5",
      //textAlign: "justify",
    },

    // ボタンテキスト
    button: {
      fontSize: "0.9rem",
      fontWeight: 500,
      textTransform: "none", // ✅ ボタンはキャピタライズせず自然な文体
    },

    // キャプションや小さい補助文字
    caption: {
      fontSize: "0.75rem", // 12px
      lineHeight: 1.4,
      color: "#90A4AE",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px", // ボタンを少し丸める
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
