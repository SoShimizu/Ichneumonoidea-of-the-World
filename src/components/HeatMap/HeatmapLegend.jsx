// components/HeatmapLegend.js
import React from "react";
import { Box } from "@mui/material";

export default function HeatmapLegend({ gradientCSS, maxCount }) {
  return (
    <>
      <Box
        sx={{
          position: "absolute",
          right: 20,
          bottom: 60,
          width: 200,
          height: 15,
          background: gradientCSS,
          border: "1px solid black",
          borderRadius: "4px",
          zIndex: 1000,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: 20,
          bottom: 35,
          width: 200,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "black",
          zIndex: 1000,
        }}
      >
        <div>0</div>
        <div>{maxCount}</div>
      </Box>
    </>
  );
}
