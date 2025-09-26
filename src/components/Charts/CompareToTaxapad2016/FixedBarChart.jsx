// FixedBarChart.jsx
"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  Cell
} from "recharts";
import {
  Box,
  Typography,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

export default function FixedBarChart({
  title,
  data,
  width,
  height,
  expectedKey,
  actualKey,
  percentKey,
  colorExp = "#556cd6",
  colorAct = "#66bb6a",
  totalExpected,
  totalActual,
  barHeight = 32,
  gapHeight = 20,
  mt = 0
}) {
  // 全体達成率
  const overallPct =
    totalExpected > 0
      ? ((totalActual / totalExpected) * 100).toFixed(1)
      : "N/A";

  // ソートキー state
  const [sortKey, setSortKey] = useState("label"); // rate, label, expected, actual

  // ソート済みデータを useMemo で生成
  const sortedData = useMemo(() => {
    const d = [...data];
    switch (sortKey) {
      case "label":
        return d.sort((a, b) =>
          String(a.subfamily).localeCompare(b.subfamily)
        );
      case "expected":
        return d.sort((a, b) => b[expectedKey] - a[expectedKey]);
      case "actual":
        return d.sort((a, b) => b[actualKey] - a[actualKey]);
      case "rate":
      default:
        return d.sort((a, b) => b[percentKey] - a[percentKey]);
    }
  }, [data, sortKey, expectedKey, actualKey, percentKey]);

  return (
    <Box sx={{ mt }}>
      {/* 見出し */}
      <Typography
        variant="h5"
        sx={{ color: "#7fffd4", mb: 1, textAlign: "center" }}
      >
        {title}
      </Typography>

      {/* 全体説明 */}
      <Typography
        variant="body2"
        sx={{ color: "#bbb", mb: 2, textAlign: "center" }}
      >
        Currently, a total of <strong>{totalActual.toLocaleString()}</strong>{" "}
        {title.toLowerCase()} are registered, which corresponds to{" "}
        <strong>{overallPct}%</strong> of those in Taxapad 2016.
      </Typography>

      {/* 合計比較 */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2 }}>
        <Grid item xs={6}>
          <Box
            sx={{
              p: 1,
              backgroundColor: "#4d4d4d",
              borderRadius: 2,
              textAlign: "center",
              color: "#ccc"
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              Taxapad 2016
            </Typography>
            <Typography variant="h5">
              {totalExpected.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
        <Grid
          item
          xs={2}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Typography variant="body1" fontWeight="bold" sx={{ color: "#aaa" }}>
            VS
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              p: 1,
              backgroundColor: "#4d4d4d",
              borderRadius: 2,
              textAlign: "center",
              color: "#ccc"
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              This Database
            </Typography>
            <Typography variant="h5">
              {totalActual.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
          </Box>
          

        {/* ソート見出し */}
      <Box sx={{ textAlign: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: "#aaa" }}>
          Sort by:
        </Typography>
      </Box>

              {/* ソート切り替え */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <ToggleButtonGroup
          value={sortKey}
          exclusive
          onChange={(_, value) => value && setSortKey(value)}
          size="small"
        >
          <ToggleButton value="label">Label</ToggleButton>
          <ToggleButton value="expected">Taxapad</ToggleButton>
          <ToggleButton value="actual">Database</ToggleButton>
          <ToggleButton value="rate">Completion</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 棒グラフ */}
      <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
        <BarChart
          width={width}
          height={height}
          data={sortedData}
          layout="vertical"
          barCategoryGap={gapHeight}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {/* X方向（縦線のみ）のグリッド */}
          <CartesianGrid horizontal={false} vertical stroke="#555" strokeDasharray="3 3" />

          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#eee" }}
            label={{ value: "Count", position: "insideBottom", fill: "#aaa", fontSize: 12 }}
          />

          <YAxis
            dataKey="subfamily"
            type="category"
            width={200}
            tick={{ fontSize: 12, fill: "#eee" }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#222",
              border: "1px solid #555",
              borderRadius: 4,
              fontSize: 13
            }}
            labelStyle={{ color: "#aaa" }}
            itemStyle={{ color: "#fff" }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />

          <Legend wrapperStyle={{ fontSize: 13, color: "#fff" }} />

          {/* Taxapad 2016 */}
          <Bar
            dataKey={expectedKey}
            name="Taxapad 2016"
            fill={colorExp}
            barSize={barHeight}
          />

          {/* This Database */}
          <Bar
            dataKey={actualKey}
            name="This Database"
            barSize={barHeight}
          >
            {sortedData.map((entry, index) => {
              const pct = parseFloat(entry[percentKey]);
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={pct >= 100 ? "#ff4c4c" : colorAct}
                />
              );
            })}

            <LabelList
              dataKey={percentKey}
              position="right"
              formatter={v => `${v}%`}
              style={(props) => {
                const pct = parseFloat(props.value);
                return {
                  fill: pct >= 100 ? "#ff4c4c" : colorAct,
                  fontSize: 12,
                  fontWeight: "bold"
                };
              }}
            />
          </Bar>
        </BarChart>
      </Box>
    </Box>
  );
}
