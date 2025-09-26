"use client";

import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, Grid, Skeleton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import ValidInvalidChart from "../Charts/ValidInvalidChart";
import RanksChart from "../Charts/RanksChart";
import YearlySpeciesChart from "../Charts/YearlySpeciesChart";
import TypeLocalitiesHeatmap from "../Charts/TypeLocalitiesHeatmap";
import ChartDialog from "../Charts/ChartDialog";
import supabase from "../../utils/supabase";
import worldGeoJson from "../../data/custom.geo.json";
import BiodiversityRichnessHeatmap from "../Charts/BiodiversityRichnessHeatmap";
import LoadingScreen from "../LoadingScreen";
import fetchSupabaseAll from "../../utils/fetchSupabaseAll";
import SubfamilyComparisonChart from "../Charts/CompareToTaxapad2016/SubfamilyComparisonChart";
import DynamicToc from "../DynamicToc";

const tocSections = [
  { id: "yearly-new-name-descriptions", label: "Yearly New Naxa Descriptions" },
  { id: "biodiversity-richness-heatmap", label: "Biodiversity Richness Heatmap"},
  { id: "type-localities-heatmap", label: "Type Localities Heatmap (by Country)"},
  { id: "valid-vs-invalid-names", label: "Valid vs Invalid Names"},
  { id: "ranks-distribution", label: "Ranks Distribution"},
  { id: "taxapad-vs-our-db", label: "Taxapad 2016 vs. This Database"},
];

export default function Statistics() {
  const [scientificNames, setScientificNames] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  const handleLangChange = (_, newLang) => {
    if (newLang) setLang(newLang);
  };

  const overviewTitles = {
    ja: "概要",
    en: "Overview",
  }

  const overviewContents = {
    ja: "この統計ページでは、当データベースに登録された情報に基づき、ヒメバチ上科に関連する様々な生物多様性情報学的データをリアルタイムで可視化しています。<br/><br/>より充実かつ精度の高い統計情報を提供できるよう、日々アップデートを行っております。ご意見やご要望、不具合などにお気づきの際は、お気軽に管理者までご連絡ください。",
    en: "This statistics page offers real-time, interactive access to various biodiversity information related to Ichneumonoidea, based on data registered in our database.<br/><br/>We continuously update the page to provide more accurate and comprehensive information. If you notice any issues or have suggestions for additional statistics, please feel free to contact the administrator."
  };

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogContent, setDialogContent] = useState(null);

  const { data: sciData, loading: loadingSciNames, error: sciError } = fetchSupabaseAll(
    "scientific_names",
    "id, valid_name_id, current_rank, type_locality, authority_year"
  );

  useEffect(() => {
    (async () => {
      const sciData = await fetchSupabaseAll("scientific_names", "*");
      const { data: countryData, error: countryError } = await supabase
        .from("countries")
        .select("id, geojson_name");

      if (sciError || countryError) {
        console.error("Supabase fetch error:", sciError || countryError);
        setScientificNames([]);
        setCountries([]);
      } else {
        setScientificNames(Array.isArray(sciData) ? sciData : []);
        setCountries(Array.isArray(countryData) ? countryData : []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  const handleOpenDialog = (title, description, content) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogContent(content);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  return (
    <Box p={4}>
      <Typography variant="h2" gutterBottom>
        Statistics
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <ToggleButtonGroup value={lang} exclusive onChange={handleLangChange} size="small">
          <ToggleButton value="ja">日本語</ToggleButton>
          <ToggleButton value="en">English</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Overview */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <Grid item xs={12} sx={{maxWidth:"1200px"}}>
          <Paper elevation={4} sx={{ p: 3, borderRadius: 4, overflowX: "hidden" }}>
            <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>{overviewTitles[lang]}</Typography>
            <Typography
              variant="body1"
              component="div"
              dangerouslySetInnerHTML={{ __html: overviewContents[lang] }}
            />
          </Paper>
        </Grid>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <DynamicToc sections={tocSections} />
      </Box>

      <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 1400, mx: "auto" }}>
        <Box id="yearly-new-name-descriptions" sx={{ overflowX: "auto", width: "100%" }}>
          <YearlySpeciesChart data={scientificNames} openDialog={handleOpenDialog} />
        </Box>

        <Box id="biodiversity-richness-heatmap" sx={{ overflowX: "auto", width: "100%" }}>
          <BiodiversityRichnessHeatmap
            scientificNames={scientificNames}
            countries={countries}
            worldGeoJson={worldGeoJson}
            openDialog={handleOpenDialog}
          />
        </Box>

        <Box id="type-localities-heatmap" sx={{ overflowX: "auto", width: "100%" }}>
          <TypeLocalitiesHeatmap
            scientificNames={scientificNames}
            countries={countries}
            worldGeoJson={worldGeoJson}
            openDialog={handleOpenDialog}
          />
        </Box>

        <Box id="valid-vs-invalid-names" sx={{ overflowX: "auto", width: "100%" }}>
          <ValidInvalidChart data={scientificNames} openDialog={handleOpenDialog} />
        </Box>

        <Box id="ranks-distribution" sx={{ overflowX: "auto", width: "100%" }}>
          <RanksChart data={scientificNames} openDialog={handleOpenDialog} />
        </Box>

        <Box id="taxapad-vs-our-db" sx={{ overflowX: "auto", width: "100%" }}>
          <Grid item xs={12} md={12}>
            <SubfamilyComparisonChart />
          </Grid>
        </Box>
      </Grid>

      <ChartDialog
        open={openDialog}
        onClose={handleCloseDialog}
        title={dialogTitle}
        description={dialogDescription}
        content={dialogContent}
      />
    </Box>
  );
}
