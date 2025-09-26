import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Typography, Paper, Grid } from "@mui/material";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function RanksChart({ data, openDialog }) {
  // current_rank の集計
  const rankData = Object.entries(
    data.reduce((acc, cur) => {
      acc[cur.current_rank] = (acc[cur.current_rank] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <Grid item xs={12} sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Paper
        elevation={4}
        sx={{ p: 3, borderRadius: 4, cursor: "pointer" }}
        onClick={() =>
          openDialog(
            "Ranks Distribution",
            "This pie chart illustrates the distribution of taxonomic ranks, including species, genus, and others.",
            // ダイアログ用グラフ
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={rankData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label
                >
                  {rankData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )
        }
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
        >
          Ranks Distribution
        </Typography>

        {/* 通常表示用 */}
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={rankData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {rankData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    </Grid>
  );
}
