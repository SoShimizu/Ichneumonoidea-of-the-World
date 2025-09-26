import React, { useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import { Box, useMediaQuery, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton, Alert } from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';
import "leaflet/dist/leaflet.css";
import { useHeatmapColor } from "../HeatMap/useHeatmapColor";
import HeatmapLegend from "../HeatMap/HeatmapLegend";
import MapTileToggle from "../HeatMap/MapTileToggle";

// グラデーション補間関数
function interpolateColor(value) {
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
  const interpolated = start.map((s, i) =>
    Math.round(s + (end[i] - s) * ratio)
  );
  return `rgb(${interpolated.join(",")})`;
}

export default function BiodiversityRichnessHeatmap({
  scientificNames,
  countries,
  worldGeoJson,
  openDialog,
}) {
  const isMobile = useMediaQuery('(max-width:600px)'); // ★ スマホ判定

  const { interpolateColor, gradientCSS } = useHeatmapColor();

  const [tileMode, setTileMode] = useState("satellite");

  const [mode, setMode] = useState("species");

  // 国名マッピング
  const countryMap = Object.fromEntries(
    countries
      .filter((c) => c.geojson_name)
      .map((c) => [c.id, c.geojson_name])
  );

  // 有効種のフィルタリング
  const validSpecies = scientificNames.filter((item) => {
    return (
      item.current_rank?.toLowerCase() === "species" &&
      item.valid_name_id === item.id
    );
  });

  // 国ごとのカウント
  const countryCount = validSpecies.reduce((acc, cur) => {
    const mapped = countryMap[cur.type_locality];
    if (mapped) {
      acc[mapped] = (acc[mapped] || 0) + 1;
    }
    return acc;
  }, {});

  const counts = Object.values(countryCount);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

  // GeoJSONスタイル
  const style = (feature) => {
    const adminName = feature.properties.admin;
    const count = countryCount[adminName] || 0;
    const normalized = Math.min(count / maxCount, 1);
    return {
      fillColor: interpolateColor(normalized),
      weight: 1,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 0.7,
    };
  };

  // ポップアップ
  const onEachFeature = (feature, layer) => {
    const adminName = feature.properties.admin;
    const count = countryCount[adminName] || 0;
    if (count > 0) {
      layer.bindPopup(`${adminName}: ${count} species`);
    }
  };

  const handleModeChange = (_, newMode) => {
    if (newMode !== null) setMode(newMode);
  };

  return (
    <Grid item xs={12} sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: 4 }}>
        {/* ヘッダー */}
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>
          Biodiversity Richness Heatmap
        </Typography>

        {/* 説明の下に注釈を表示 */}
        <Box sx={{ mt: 2 }}>
          <Alert
            severity="warning"
            variant="outlined"
            icon={<InfoIcon />}
            sx={{
              backgroundColor: "warning.light",
              color: "warning.contrastText",
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            Currently only type data is available. Counts based on distribution records will be updated at a later date.
          </Alert>
        </Box>

        {/* トグルボタン */}
        <Box sx={{ textAlign: "center", my: 3 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="subfamily" disabled>Subfamily</ToggleButton>
            <ToggleButton value="genus" disabled>Genus</ToggleButton>
            <ToggleButton value="species">Species</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* 地図 */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: "50vh", md: "500px" },
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <MapContainer
            center={[20, 0]}                         // 中心はそのまま世界地図真ん中
            zoom={isMobile ? 1 : 2}                // ★ スマホなら少し引き気味
            minZoom={isMobile ? 1 : 2}               // ★ スマホならもっと引きやすく
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            style={{ width: "100%", height: "100%" }}
          >
            <MapTileToggle mode={tileMode} setMode={setTileMode} />
            <GeoJSON data={worldGeoJson} style={style} onEachFeature={onEachFeature} />
          </MapContainer>

          {/* カラーバー */}
          <HeatmapLegend gradientCSS={gradientCSS} maxCount={maxCount} />

        </Box>
      </Paper>
    </Grid>
  );
}
