// Footer.jsx
"use client";

import React, { useState } from 'react';
import { Box, Typography, Link, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { SiCreativecommons } from "react-icons/si";
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

export default function Footer() {
  const [language, setLanguage] = useState('en');

  const texts = {
    en: {
      siteName: "Ichneumonoidea of the World: Database for Exploring the Global Biodiversity of Ichneumonoidea",
      license: "Data freely available with attribution",
      description:
        "This database compiles distribution and taxonomic information on Ichneumonoidea worldwide. You are free to share and adapt the materials, provided proper credit is given.",
      copyright: "All rights reserved.",
      howToCite: "How to cite:",
    },
    ja: {
      siteName:
        "世界のヒメバチ上科：全世界のヒメバチ上科の生物多様性を探索するためのデータベース",
      license: "データはクレジットを付ければ自由に利用できます",
      description:
        "このデータベースは世界中のヒメバチ上科の分布・分類情報をまとめたものです。適切なクレジットを記載すれば自由に共有・改変できます。",
      copyright: "無断転載を禁じます。",
      howToCite: "引用方法：",
    },
  };

  // 今日の日付を "YYYY-MM-DD" 形式で取得
  const today = new Date().toISOString().slice(0, 10);

  // 言語ごとに、今日の日付を埋め込んだ citation 文を生成
  const citationText =
    language === 'en'
      ? `Shimizu, S., Chen, H.-P., Kikuchi, N., Konishi, K. (2025–) Ichneumonoidea of the World: Database for Exploring the Global Biodiversity of Ichneumonoidea. Online: https://ichneumonoidea-world.com/ (accessed on ${today})`
      : `清水　壮，陳　玄樸，菊地波輝，小西和彦（2025–）世界のヒメバチ上科：全世界のヒメバチ上科の生物多様性を探索するためのデータベース．https://ichneumonoidea-world.com/（${today}参照）`;

  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        py: 4,
        px: 2,
        backgroundColor: 'grey.900',
        color: 'grey.300',
        textAlign: 'center',
      }}
    >
      {/* サイト名 */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        {texts[language].siteName}
      </Typography>

      {/* ライセンスアイコン＋説明 */}
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <SiCreativecommons size={24} />
        <Typography variant="body2">
          <Link
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="inherit"
          >
            CC BY 4.0
          </Link>{" "}
          - {texts[language].license}
        </Typography>
      </Stack>

      {/* 説明 */}
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, maxWidth: 600, mx: "auto", opacity: 0.8 }}
      >
        {texts[language].description}
      </Typography>

      {/* How to cite */}
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 3 }}>
        <FormatQuoteIcon fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {texts[language].howToCite}
        </Typography>
      </Stack>

      {/* 動的に生成した引用文 */}
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, maxWidth: 600, mx: "auto", opacity: 0.9 }}
      >
        {citationText}
      </Typography>

      {/* ライセンスバナー */}
      <Box sx={{ mt: 2 }}>
        <Link
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://licensebuttons.net/l/by/4.0/88x31.png"
            alt="Creative Commons License"
            style={{ height: 40 }}
          />
        </Link>
      </Box>

      {/* 言語切り替え */}
      <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2 }}>
        <Typography variant="body2">Language:</Typography>
        <ToggleButtonGroup
          value={language}
          exclusive
          onChange={(e, newLang) => {
            if (newLang) setLanguage(newLang);
          }}
          size="small"
          color="primary"
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="ja">日本語</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* コピーライト */}
      <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.6 }}>
        © {currentYear} {texts[language].siteName}. {texts[language].copyright}
      </Typography>
    </Box>
  );
}
