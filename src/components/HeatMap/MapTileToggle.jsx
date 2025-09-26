import React from "react";
import { TileLayer } from "react-leaflet";
import { ToggleButtonGroup, ToggleButton, Box } from "@mui/material";

const tileOptions = {
  normal: {
    label: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Earthstar Geographics',
  },
};

export default function MapTileToggle({ mode, setMode }) {
  const current = tileOptions[mode];

  return (
    <>
      <TileLayer url={current.url} attribution={current.attribution} />
      <Box
  sx={{
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 2,
    zIndex: 1000,
    p: 0.5,
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  }}
>
  <ToggleButtonGroup
    size="small"
    value={mode}
    exclusive
    onChange={(e, val) => val && setMode(val)}
    sx={{
      '& .MuiToggleButton-root': {
        color: 'white',
        border: '1px solid rgba(255,255,255,0.5)',
        '&.Mui-selected': {
          backgroundColor: 'rgba(255,255,255,0.15)',
        },
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.2)',
        },
      },
    }}
  >
    <ToggleButton value="normal">Standard</ToggleButton>
    <ToggleButton value="satellite">Satellite</ToggleButton>
  </ToggleButtonGroup>
</Box>

    </>
  );
}
