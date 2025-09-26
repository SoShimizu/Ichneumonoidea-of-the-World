import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";
import {
  Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";

// Z検定（比率の差）
function calcZTest(p1, n1, p2, n2) {
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return pValue;
}

// 正規分布累積関数 (近似式)
function normalCDF(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erfApprox = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return z >= 0 ? 0.5 * (1 + erfApprox) : 0.5 * (1 - erfApprox);
}

export default function YearlySpeciesChart({ data, openDialog }) {
  const [selectedRank, setSelectedRank] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedValidity, setSelectedValidity] = useState("All");

  const ranks = useMemo(() => {
    const uniqueRanks = Array.from(new Set(data.map(d => d.current_rank).filter(Boolean)));
    return ["All", ...uniqueRanks.sort()];
  }, [data]);

  const countries = useMemo(() => {
    const uniqueCountries = Array.from(new Set(data.map(d => d.type_locality).filter(Boolean)));
    return ["All", ...uniqueCountries.sort()];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const rankMatch = selectedRank === "All" || d.current_rank === selectedRank;
      const countryMatch = selectedCountry === "All" || d.type_locality === selectedCountry;
      const validityMatch =
        selectedValidity === "All" ||
        (selectedValidity === "Valid" && d.valid_name_id === d.id) ||
        (selectedValidity === "Invalid" && d.valid_name_id !== d.id);
      return rankMatch && countryMatch && validityMatch;
    });
  }, [data, selectedRank, selectedCountry, selectedValidity]);

  // --- 統計量計算 ---
  const stats = useMemo(() => {
    const total = filteredData.length;
    const valid = filteredData.filter(d => d.valid_name_id === d.id).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  }, [filteredData]);

  const allYears = useMemo(() => {
    const years = data.map(d => d.authority_year).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => (minYear + i).toString());
  }, [data]);

  const yearGroupedData = useMemo(() => {
    const initial = {};
    allYears.forEach(year => {
      initial[year] = { year, Valid: 0, Invalid: 0, total: 0 };
    });

    filteredData.forEach(cur => {
      const year = cur.authority_year || "Unknown";
      if (!initial[year]) {
        initial[year] = { year, Valid: 0, Invalid: 0, total: 0 };
      }
      if (cur.valid_name_id === cur.id) {
        initial[year].Valid++;
      } else {
        initial[year].Invalid++;
      }
      initial[year].total++;
    });

    const grouped = Object.values(initial).sort((a, b) => (a.year > b.year ? 1 : -1));

    for (let i = 1; i < grouped.length; i++) {
      const prev = grouped[i - 1];
      const curr = grouped[i];
      if (prev.total > 5 && curr.total > 5) {
        const pPrev = prev.Valid / prev.total;
        const pCurr = curr.Valid / curr.total;
        const pValue = calcZTest(pPrev, prev.total, pCurr, curr.total);
        if (pValue < 0.01) {
          curr.significant = "★★";
        } else if (pValue < 0.05) {
          curr.significant = "※";
        } else {
          curr.significant = "";
        }
      } else {
        curr.significant = "";
      }
    }

    return grouped;
  }, [filteredData, allYears]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const valid = payload.find((p) => p.dataKey === "Valid")?.value || 0;
      const invalid = payload.find((p) => p.dataKey === "Invalid")?.value || 0;
      const total = valid + invalid;

      return (
        <Box
          sx={{
            backgroundColor: "#222",
            border: "1px solid #555",
            borderRadius: 2,
            p: 2,
            color: "#fff",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {String(label)}
            {payload[0].payload.significant ? ` ${payload[0].payload.significant}` : ""}
          </Typography>
          <Typography variant="body2">Valid: {valid}</Typography>
          <Typography variant="body2">Invalid: {invalid}</Typography>
          <Typography variant="body2" fontWeight="bold" mt={1}>
            Total: {total}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Grid item xs={12}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: 4, overflowX: "hidden" }}>
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>
          Yearly New Name Descriptions
        </Typography>

        {/* フィルター */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="rank-filter-label">Filter by Rank</InputLabel>
            <Select
              labelId="rank-filter-label"
              value={selectedRank}
              label="Filter by Rank"
              onChange={(e) => setSelectedRank(e.target.value)}
            >
              {ranks.map((rank) => (
                <MenuItem key={rank} value={rank}>
                  {rank}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="country-filter-label">Filter by Country</InputLabel>
            <Select
              labelId="country-filter-label"
              value={selectedCountry}
              label="Filter by Country"
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map((country) => (
                <MenuItem key={country} value={country}>
                  {country}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="validity-filter-label">Filter by Validity</InputLabel>
            <Select
              labelId="validity-filter-label"
              value={selectedValidity}
              label="Filter by Validity"
              onChange={(e) => setSelectedValidity(e.target.value)}
            >
              {["All", "Valid", "Invalid"].map((val) => (
                <MenuItem key={val} value={val}>
                  {val}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* --- ここに統計表示 --- */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Total: <strong>{stats.total}</strong> names
            {" | "} Valid: <strong>{stats.valid}</strong>
            {" | "} Invalid: <strong>{stats.invalid}</strong>
          </Typography>
        </Box>

        {/* チャート */}
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box sx={{ width: Math.max(yearGroupedData.length * 24, 800), height: "min(60vh, 600px)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearGroupedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  interval={0}
                  angle={90}
                  textAnchor="start"
                  dx={7}
                  height={100}
                  tickMargin={2}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Valid" stackId="a" fill="#00C49F">
                  <LabelList dataKey="significant" position="top" fontSize={16} />
                </Bar>
                <Bar dataKey="Invalid" stackId="a" fill="#FF7F50" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* 注釈 */}
        <Typography
          variant="caption"
          color="textSecondary"
          display="block"
          textAlign="right"
          mt={1}
        >
          ※: p {"<"} 0.05, ★★: p {"<"} 0.01 (Significant change from previous year)
        </Typography>
      </Paper>
    </Grid>
  );
}
