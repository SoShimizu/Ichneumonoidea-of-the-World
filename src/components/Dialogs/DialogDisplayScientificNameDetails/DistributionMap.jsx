// DistributionMap.jsx
import React, { useMemo, useCallback, useState } from "react";
import { Box, useMediaQuery } from "@mui/material"; // ★ useMediaQueryでスマホ判定
import { MapContainer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import leaflet from "leaflet";

import { getStarRating, interpolateColor } from "./utilsDialogDisplayScientificNameDetails"; 
import worldGeoJson from "../../../data/custom.geo.json"; // ← 自分のプロジェクトに合わせてね
import HeatmapLegend from "../../HeatMap/HeatmapLegend";
import { useHeatmapColor } from "../../HeatMap/useHeatmapColor";
import MapTileToggle from "../../HeatMap/MapTileToggle";

// ---------------------------------------------------
// 地図の再描画コンポーネント
// ---------------------------------------------------
function InvalidateSizeComponent() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ---------------------------------------------------
// Type Locality 用の特別なアイコン
// ---------------------------------------------------
const customIcon = new leaflet.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// ---------------------------------------------------
// 国名から中心座標を取得
// ---------------------------------------------------
function getCountryCenterFromGeoJson(countryName) {
  if (!worldGeoJson?.features || !countryName) return null;
  const feature = worldGeoJson.features.find(
    (f) => f.properties?.admin?.toLowerCase() === countryName.toLowerCase()
  );
  if (!feature || !feature.geometry) return null;

  const coordsArray =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates.flat(2);

  if (!coordsArray.length) return null;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coordsArray.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

// ---------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------
export default function DistributionMap({
  distributionLocalities,
  typeLocalityCountryName,
  isSpeciesOrSubspecies,
}) {
  const isMobile = useMediaQuery('(max-width:600px)'); // ★ スマホ判定

  const [tileMode, setTileMode] = useState("satellite");

  const { interpolateColor, gradientCSS } = useHeatmapColor();

  // 国別件数集計
  const [countryCount, maxCount] = useMemo(() => {
    if (!distributionLocalities?.length) return [{}, 1];
    const counts = {};
    distributionLocalities.forEach((loc) => {
      const cname = loc.country || "Unknown";
      counts[cname] = (counts[cname] || 0) + 1;
    });
    const validCounts = Object.values(counts).filter((c) => c > 0);
    const max = validCounts.length ? Math.max(...validCounts) : 1;
    return [counts, max];
  }, [distributionLocalities]);

  // Type Locality の中心座標
  const typeLocalityCenter = useMemo(() => {
    if (!isSpeciesOrSubspecies || !typeLocalityCountryName) return null;
    return getCountryCenterFromGeoJson(typeLocalityCountryName);
  }, [typeLocalityCountryName, isSpeciesOrSubspecies]);

  // 国別スタイル
  const style = useCallback(
    (feature) => {
      const adminName = feature.properties?.admin;
      if (!adminName) return { fillColor: "grey", weight: 0.5, color: "white", fillOpacity: 0.3 };

      const count = countryCount[adminName] || 0;
      const normalized = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
      let fillColor = interpolateColor(normalized);

      if (
        isSpeciesOrSubspecies &&
        typeLocalityCountryName &&
        adminName.toLowerCase() === typeLocalityCountryName.toLowerCase()
      ) {
        fillColor = "black";
      }
      return { fillColor, weight: 1, color: "white", dashArray: "3", fillOpacity: 0.7 };
    },
    [countryCount, maxCount, typeLocalityCountryName, isSpeciesOrSubspecies]
  );

  // 各国境にポップアップ
  const onEachFeature = useCallback(
    (feature, layer) => {
      const adminName = feature.properties?.admin;
      if (!adminName) return;

      let popupContent = `${adminName}`;
      const count = countryCount[adminName] || 0;
      if (count > 0) popupContent += `: ${count} record(s)`;

      if (
        isSpeciesOrSubspecies &&
        typeLocalityCountryName &&
        adminName.toLowerCase() === typeLocalityCountryName.toLowerCase()
      ) {
        popupContent += count > 0 ? "<br />(Type Locality Country)" : " (Type Locality Country)";
      }

      if (count > 0 || (isSpeciesOrSubspecies && adminName.toLowerCase() === typeLocalityCountryName?.toLowerCase())) {
        layer.bindPopup(popupContent);
      }
    },
    [countryCount, typeLocalityCountryName, isSpeciesOrSubspecies]
  );

  if (!worldGeoJson?.features) {
    return <div style={{ margin: "1em 0", fontStyle: "italic" }}>No world map data.</div>;
  }

  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "2 / 1.5",
        position: "relative",
        border: "1px solid rgba(127,255,212,0.3)",
        borderRadius: 2,
        overflow: "hidden",
        mb: 3,
      }}
    >
      <MapContainer
        center={[20, 0]}
        zoom={isMobile ? 1 : 2}      // ★ スマホならズームアウト
        minZoom={isMobile ? 1 : 2}   // ★ スマホで拡大しすぎない
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ width: "100%", height: "100%" }}
      >
        <MapTileToggle mode={tileMode} setMode={setTileMode} />
        <GeoJSON data={worldGeoJson} style={style} onEachFeature={onEachFeature} />

        {/* 通常の分布ロケーション */}
        {distributionLocalities.map((loc, i) => {
          if (loc.latitude == null || loc.longitude == null) return null;
          return (
            <Marker key={`marker-${i}`} position={[loc.latitude, loc.longitude]}>
              <Popup>
                <strong>{loc.country || "Unknown"}</strong>
                {loc.state ? `, ${loc.state}` : ""}
                {loc.city ? `, ${loc.city}` : ""}
                {loc.detail ? `, ${loc.detail}` : ""}
                <br />
                Reliability: {getStarRating(loc.reliability_id)}
              </Popup>
            </Marker>
          );
        })}

        {/* Type Localityだけ特別なアイコン */}
        {isSpeciesOrSubspecies && typeLocalityCenter && (
          <Marker position={[typeLocalityCenter.lat, typeLocalityCenter.lng]} icon={customIcon}>
            <Popup>
              <b>Type Locality</b>
              <br />
              {typeLocalityCountryName}
            </Popup>
          </Marker>
        )}

        <InvalidateSizeComponent />
      </MapContainer>

      {/* カラーバー */}
      <HeatmapLegend gradientCSS={gradientCSS} maxCount={maxCount} />

    </Box>
  );
}
