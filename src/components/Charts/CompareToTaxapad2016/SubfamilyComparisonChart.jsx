"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList
} from "recharts";
import {
  FormControl, MenuItem, Select, InputLabel,
  Box, Grid, Paper, Typography
} from "@mui/material";
import useSubfamilyComparisonData from "./useSubfamilyComparisonData";
import FixedBarChart from "./FixedBarChart";

// カスタムフック：ウィンドウサイズを取得
function useWindowSize() {
  const [size, setSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const updateSize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}

// 合計を集計
function getTotals(data) {
  return {
    genusTaxapad: data.reduce((sum, d) => sum + (d.expectedGenus || 0), 0),
    genusOurDB: data.reduce((sum, d) => sum + (d.generaOurDB || 0), 0),
    speciesTaxapad: data.reduce((sum, d) => sum + (d.expectedSpecies || 0), 0),
    speciesOurDB: data.reduce((sum, d) => sum + (d.speciesOurDB || 0), 0),
  };
}

export default function SubfamilyComparisonChart() {
  const [family, setFamily] = useState("Braconidae");
  const { data, loading } = useSubfamilyComparisonData(family);
  const { width: windowWidth } = useWindowSize();

  const families = useMemo(() => ["Braconidae", "Ichneumonidae"], []);
  const BAR_HEIGHT = 35;
  const GAP_HEIGHT = 10;

  const chartHeight = Math.max(data.length * (BAR_HEIGHT + GAP_HEIGHT), 300);
  const chartWidth = Math.min(windowWidth - 40, 1000);
  const totals = getTotals(data);

  if (loading) return <Typography sx={{ color: "#fff" }}>Loading …</Typography>;
  if (!data.length) return <Typography sx={{ color: "#fff" }}>No data available.</Typography>;

  return (
    <Grid item xs={12} sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: 4 }}>
        {/* タイトル */}
        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
        >
          Taxapad 2016 vs. This Database
        </Typography>

        {/* 説明 */}
        <Typography variant="body2" sx={{ color: "#ccc", mb: 2 }}>
          The bar chart below compares the number of genera and species recorded in Taxapad 2016, one of the most comprehensive databases of Ichneumonoidea to date, with those currently registered in our own database. In general, groups with percentages close to or exceeding 100% indicate a higher degree of registration of scientific names in our database. However, due to significant systematic changes at the family and subfamily levels since the publication of Taxapad 2016 (e.g., Santos 2017), direct comparisons are not always appropriate. Therefore, this chart should be viewed as a general reference only.
        </Typography>

        {/* セレクター */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ color: "#7fffd4", mb: 1 }}>
            Select Family
          </Typography>
          <FormControl size="small" sx={{marginTop:1,marginBottom:2,minWidth:320}}>
            <InputLabel sx={{ color: "#7fffd4" }}>Family</InputLabel>
              <Select
                value={family}
                label="Family"
                onChange={e => setFamily(e.target.value)}
                sx={{
                  minWidth: 180,
                  ".MuiSelect-select": { color: "#7fffd4" },
                  borderColor: "#7fffd4"
                }}
              >
                {families.map(fam => (
                  <MenuItem key={fam} value={fam}>{fam}</MenuItem>
                ))}
              </Select>
            </FormControl>
        </Box>


        {/* Genus チャート */}
        <FixedBarChart
          title="Genus"
          data={data}
          width={chartWidth}
          height={chartHeight}
          expectedKey="expectedGenus"
          actualKey="generaOurDB"
          percentKey="genusPercent"
          colorExp="#8884d8"
          colorAct="#82ca9d"
          totalExpected={totals.genusTaxapad}
          totalActual={totals.genusOurDB}
        />

        {/* Species チャート */}
        <FixedBarChart
          title="Species"
          data={data}
          width={chartWidth}
          height={chartHeight}
          expectedKey="expectedSpecies"
          actualKey="speciesOurDB"
          percentKey="speciesPercent"
          colorExp="#ffc658"
          colorAct="#ff8042"
          mt={6}
          totalExpected={totals.speciesTaxapad}
          totalActual={totals.speciesOurDB}
        />
      </Paper>
    </Grid>
  );
}
