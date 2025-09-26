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

const COLORS = ["#0088FE", "#00C49F"];

export default function ValidInvalidChart({ data, openDialog }) {
  // Valid vs Invalid の集計
  const validInvalidData = [
    {
      name: "Valid",
      value: data.filter((d) => d.valid_name_id === d.id).length,
    },
    {
      name: "Invalid",
      value: data.filter((d) => d.valid_name_id !== d.id).length,
    },
  ];

  return (
    <Grid item xs={12} sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Paper
        elevation={4}
        sx={{ p: 3, borderRadius: 4, cursor: "pointer" }}
        onClick={() =>
          openDialog(
            "Valid vs Invalid Names",
            "This pie chart illustrates the proportion of valid and invalid species among all species names that have been recorded to date.",
            // ダイアログ用の大きいグラフ
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={validInvalidData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label
                >
                  {validInvalidData.map((entry, index) => (
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
          Valid vs Invalid Names
        </Typography>

        {/* 通常ページ表示用の小さめグラフ */}
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={validInvalidData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {validInvalidData.map((entry, index) => (
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
