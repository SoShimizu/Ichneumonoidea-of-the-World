import React, { useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import { Box, useMediaQuery, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton } from "@mui/material";
import "leaflet/dist/leaflet.css";
import { useHeatmapColor } from "../HeatMap/useHeatmapColor";
import HeatmapLegend from "../HeatMap/HeatmapLegend";
import MapTileToggle from "../HeatMap/MapTileToggle";

export default function TypeLocalitiesHeatmap({
  scientificNames,
  countries,
  worldGeoJson,
  openDialog,
}) {
  const isMobile = useMediaQuery('(max-width:600px)'); // ★ スマホ判定

  const [tileMode, setTileMode] = useState("satellite");

  const { interpolateColor, gradientCSS } = useHeatmapColor();

  const [mode, setMode] = useState("all"); // ← ★ valid/invalid/all 切り替え

  const countryMap = Object.fromEntries(
    countries
      .filter((c) => c.geojson_name)
      .map((c) => [c.id, c.geojson_name])
  );

  // ★ valid/invalid を判定する関数
  const isValid = (item) => {
    const rank = item.current_rank?.toLowerCase();
    return (
      item.id === item.valid_name_id &&
      rank !== "synonym" &&
      rank !== "homonym"
    );
  };

  // ★ フィルタリング
  const filteredScientificNames = scientificNames.filter((item) => {
    if (mode === "all") return true;
    if (mode === "valid") return isValid(item);
    if (mode === "invalid") return !isValid(item);
    return true;
  });

  // ★ 国ごとのカウント
  const countryCount = filteredScientificNames.reduce((acc, cur) => {
    const mapped = countryMap[cur.type_locality];
    if (mapped) {
      acc[mapped] = (acc[mapped] || 0) + 1;
    }
    return acc;
  }, {});

  const counts = Object.values(countryCount);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

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
      <Paper
        elevation={4}
        sx={{ p: 3, borderRadius: 4 }}
      >
        {/* タイトル */}
        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
        >
          Type Localities Heatmap (by Country)
        </Typography>

        {/* フィルター切替ボタン */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="valid">Valid Only</ToggleButton>
            <ToggleButton value="invalid">Invalid Only</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* 地図表示 */}
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
