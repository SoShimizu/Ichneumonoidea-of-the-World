// DialogDisplayScientificNameDetails.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Divider,
  Stack,
  Chip,
  Paper,
  Grid,
  Link,
  Popover,
} from "@mui/material";

import CategoryIcon from "@mui/icons-material/Category";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArchiveIcon from "@mui/icons-material/Archive";
import PublicIcon from "@mui/icons-material/Public";
import BookIcon from "@mui/icons-material/Book";
import ParkIcon from "@mui/icons-material/Park";

// Supabase とか自前コンポーネント
import supabase from "../../../utils/supabase"; // ← あなたのプロジェクトに合わせて
import TaxonomicTree from "../TaxonomicTree"; // ← あなたのプロジェクトに合わせて

// 分割した小コンポーネント・ユーティリティ
import { shortRef, getStarRating } from "./utilsDialogDisplayScientificNameDetails";
import SectionTitle from "./SectionTitle";
import RenderReferenceItem from "./RenderReferenceItem";
import EcologyItem from "./EcologyItem";
import DistributionMap from "./DistributionMap";

// 以下、メインコンポーネント内でだけ使う小コンポーネント(EmptyTextなど)
const EmptyText = ({ children }) => (
  <Typography variant="body2" color="text.secondary" fontStyle="italic">
    {children}
  </Typography>
);

export default function DialogDisplayScientificNameDetails({
  initialScientificName,
  allScientificNames = [],
  scientificNameAuthors = [],
  allTaxonomicActs = [],
  allReferences = [],
}) {
  const [scientificName, setScientificName] = useState(initialScientificName);
  const [distributionData, setDistributionData] = useState([]); // bionomic_records(data_type='distribution')
  const [ecologyData, setEcologyData] = useState([]);           // bionomic_records(data_type='ecology')

  // 学名ID => 学名オブジェクトのMap
  const allScientificNamesMap = useMemo(
    () => new Map(allScientificNames.map((sn) => [sn.id, sn])),
    [allScientificNames]
  );

  // -------------------------------------------
  // bionomic_recordsを取得
  // -------------------------------------------
  const getAllDescendantSpeciesSubspeciesIds = useCallback((parentId, taxaMap) => {
    const descendantIds = new Set();
    const directChildrenMap = new Map();

    taxaMap.forEach((taxon) => {
      if (taxon.current_parent) {
        if (!directChildrenMap.has(taxon.current_parent)) {
          directChildrenMap.set(taxon.current_parent, []);
        }
        directChildrenMap.get(taxon.current_parent).push(taxon.id);
      }
    });

    const findDescendantsRecursive = (currentId) => {
      const childrenIds = directChildrenMap.get(currentId) || [];
      for (const childId of childrenIds) {
        const childTaxon = taxaMap.get(childId);
        if (childTaxon) {
          if (["Species", "Subspecies"].includes(childTaxon.current_rank)) {
            descendantIds.add(childId);
          }
          findDescendantsRecursive(childId);
        }
      }
    };
    findDescendantsRecursive(parentId);
    return Array.from(descendantIds);
  }, []);

  const fetchBionomicData = useCallback(async (taxaIds) => {
    if (!taxaIds || taxaIds.length === 0) {
      setDistributionData([]);
      setEcologyData([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("bionomic_records")
        .select("*")
        .in("target_taxa_id", taxaIds);

      if (error) {
        console.error("Error fetching bionomic_records:", error);
        setDistributionData([]);
        setEcologyData([]);
        return;
      }

      // data_typeで分岐
      setDistributionData(data.filter((d) => d.data_type === "distribution"));
      setEcologyData(data.filter((d) => d.data_type === "ecology"));
    } catch (err) {
      console.error("Error in fetchBionomicData:", err);
      setDistributionData([]);
      setEcologyData([]);
    }
  }, []);

  // ダイアログopen/学名変更時に再取得
  useEffect(() => {
    setScientificName(initialScientificName);
    if (initialScientificName?.id) {
      const rank = initialScientificName.current_rank;
      if (rank === "Species" || rank === "Subspecies") {
        // その種/亜種のみ
        fetchBionomicData([initialScientificName.id]);
      } else if (rank && allScientificNamesMap.size > 0) {
        // 上位階層の場合、配下のSpecies/Subspeciesも含める
        const descIds = getAllDescendantSpeciesSubspeciesIds(
          initialScientificName.id,
          allScientificNamesMap
        );
        fetchBionomicData([initialScientificName.id, ...descIds]);
      } else {
        // rankなし？とりあえずこれ単体
        fetchBionomicData([initialScientificName.id]);
      }
    } else {
      setDistributionData([]);
      setEcologyData([]);
    }
  }, [
    initialScientificName,
    allScientificNamesMap,
    fetchBionomicData,
    getAllDescendantSpeciesSubspeciesIds,
  ]);

  // 祖先リスト (Genus, Family, etc. の上位階層)
  const ancestorTaxa = useMemo(() => {
    if (!scientificName) return [];
    const ancestors = [];
    let cur = scientificName;
    while (cur && cur.current_parent) {
      const parent = allScientificNamesMap.get(cur.current_parent);
      if (!parent) break;
      ancestors.unshift(parent);
      cur = parent;
    }
    return ancestors;
  }, [allScientificNamesMap, scientificName]);

  // 学名の著者
  const authorsForThisScientificName = useMemo(() => {
    if (!scientificName || !scientificNameAuthors) return [];
    return scientificNameAuthors
      .filter((r) => r.scientific_name_id === scientificName.id)
      .sort((a, b) => a.author_order - b.author_order);
  }, [scientificName, scientificNameAuthors]);

  const formatAuthors = useCallback((rels) => {
    if (!rels?.length) return "";
    const arr = rels.map((r) => r.author?.last_name_eng).filter(Boolean);
    if (!arr.length) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")} & ${arr.at(-1)}`;
  }, []);

  // 学名HTML (イタリックなど)
  const formattedScientificName = useMemo(() => {
    if (!scientificName) return "";
    const authorsText = formatAuthors(authorsForThisScientificName);
    const year = scientificName.authority_year || "";
    let authority = authorsText && year ? `${authorsText}, ${year}` : authorsText || year || "";

    // 同属異属のときカッコ付き
    if (
      scientificName.original_parent &&
      scientificName.current_parent &&
      scientificName.original_parent !== scientificName.current_parent &&
      (scientificName.current_rank === "Species" || scientificName.current_rank === "Subspecies")
    ) {
      authority = authority ? `(${authority})` : "";
    }

    const italics = (n) => (n ? `<i>${n}</i>` : "");
    const rank = scientificName.current_rank;
    const validName = scientificName.name_spell_valid || "";
    let nameStr = "";

    if (["Genus", "Species", "Subspecies"].includes(rank)) {
      const epithet = italics(validName);
      if (rank === "Species" || rank === "Subspecies") {
        const genus = ancestorTaxa.find((a) => a.current_rank === "Genus");
        const subgenus = ancestorTaxa.find((a) => a.current_rank === "Subgenus");
        const genusName = italics(genus?.name_spell_valid || "");
        const subgenusPart = subgenus ? `(${italics(subgenus.name_spell_valid)}) ` : "";

        if (rank === "Species") {
          nameStr = `${genusName} ${subgenusPart}${epithet}`;
        } else {
          // Subspecies
          const speciesAncestor = ancestorTaxa.find((a) => a.current_rank === "Species");
          const speciesEpithet = italics(speciesAncestor?.name_spell_valid || "");
          nameStr = `${genusName} ${subgenusPart}${speciesEpithet} ${epithet}`;
        }
      } else {
        // Genus
        nameStr = epithet;
      }
    } else if (rank === "Subgenus") {
      // Subgenusは Genus (Subgenus) の形に
      const genus = ancestorTaxa.find((a) => a.current_rank === "Genus");
      nameStr = `${italics(genus?.name_spell_valid || "")} (${italics(validName)})`;
    } else {
      // それ以外のランクはそのまま
      nameStr = validName;
    }

    return `${nameStr}${authority ? ` ${authority}` : ""}`;
  }, [scientificName, authorsForThisScientificName, ancestorTaxa, formatAuthors]);

  // 参照テーブル
  const refsArray = useMemo(() => {
    return Array.isArray(allReferences?.data)
      ? allReferences.data
      : Array.isArray(allReferences)
      ? allReferences
      : [];
  }, [allReferences]);

  // Distribution配列をフラット化
  const distributionLocalities = useMemo(() => {
    const result = [];
    distributionData.forEach((rec) => {
      const recRefs = rec.source_publication_id
        ? refsArray.filter((r) => r.id === rec.source_publication_id)
        : [];
      if (Array.isArray(rec.distribution)) {
        rec.distribution.forEach((item) => {
          result.push({
            country: item.country || "Unknown",
            state: item.state || "",
            city: item.city || "",
            detail: item.detail || "",
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            reliability_id: rec.reliability_id || "",
            references: recRefs,
          });
        });
      }
    });
    return result;
  }, [distributionData, refsArray]);

  // 国ごとにまとめた Distribution
  const aggregatedDistribution = useMemo(() => {
    const countryMap = new Map();
    distributionLocalities.forEach((loc) => {
      const c = loc.country;
      if (!countryMap.has(c)) {
        countryMap.set(c, []);
      }
      countryMap.get(c).push(loc);
    });
    return Array.from(countryMap.entries()).map(([country, items]) => ({ country, items }));
  }, [distributionLocalities]);

  // Popover
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const openPopover = Boolean(anchorEl);

  const handleOpenCountry = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedCountry(item);
  };
  const handleCloseCountry = () => {
    setAnchorEl(null);
    setSelectedCountry(null);
  };

  // references (finalReferenceList)
  const [categorizedRefIds, finalReferenceList] = useMemo(() => {
    const categories = {
      originalDescription: new Set(),
      taxonomicActs: new Set(),
      distribution: new Set(),
      ecology: new Set(),
    };
    if (!scientificName) {
      return [categories, []];
    }

    // originalDescription
    if (scientificName.source_of_original_description) {
      categories.originalDescription.add(scientificName.source_of_original_description);
    }
    // taxonomicActs
    allTaxonomicActs.forEach((act) => {
      if (act.scientific_name_id === scientificName.id && act.reference_id) {
        categories.taxonomicActs.add(act.reference_id);
      }
    });
    // distribution
    distributionData.forEach((d) => {
      if (d.source_publication_id) categories.distribution.add(d.source_publication_id);
    });
    // ecology
    ecologyData.forEach((e) => {
      if (e.source_publication_id) categories.ecology.add(e.source_publication_id);
    });

    const refMap = new Map();
    const addCat = (refId, cat) => {
      if (!refId) return;
      const ex = refMap.get(refId);
      if (ex) {
        ex.categories.add(cat);
      } else {
        const rObj = refsArray.find((r) => r.id === refId);
        if (rObj) refMap.set(refId, { ref: rObj, categories: new Set([cat]) });
      }
    };
    categories.originalDescription.forEach((id) => addCat(id, "Original description"));
    categories.taxonomicActs.forEach((id) => addCat(id, "Taxonomic acts"));
    categories.distribution.forEach((id) => addCat(id, "Distribution"));
    categories.ecology.forEach((id) => addCat(id, "Ecology"));

    const finalRefArr = Array.from(refMap.values()).map((entry) => ({
      ...entry.ref,
      categories: Array.from(entry.categories),
    }));
    return [categories, finalRefArr];
  }, [scientificName, allTaxonomicActs, distributionData, ecologyData, refsArray]);

  // -------------------------------------------
  // レンダリング開始
  // -------------------------------------------
  if (!scientificName) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyText>No scientific name data available.</EmptyText>
      </Box>
    );
  }

  const typeLocalityName = scientificName.type_locality;
  const isSpeciesOrSubspecies =
    scientificName.current_rank === "Species" || scientificName.current_rank === "Subspecies";

  return (
    <Box sx={{ p: 3, bgcolor: "background.paper" }}>
      <Divider sx={{ mb: 3, borderColor: "aquamarine", borderWidth: 2 }} />

      {/* Rank */}
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <CategoryIcon sx={{ color: "aquamarine" }} fontSize="small" />
        <Typography variant="body2">
          <strong>Rank:</strong> {scientificName.current_rank || "N/A"}
        </Typography>
      </Stack>

      {/* Scientific Name */}
      <Typography variant="h4" gutterBottom sx={{ wordBreak: "break-word" }}>
        <span dangerouslySetInnerHTML={{ __html: formattedScientificName }} />
      </Typography>

      {/* Taxonomic Tree */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<AccountTreeIcon />} title="Taxonomic Tree / Hierarchy" />
      <Box sx={{ mb: 3 }}>
        <TaxonomicTree
          rootScientificName={scientificName}
          allScientificNames={allScientificNames}
          scientificNameAuthors={scientificNameAuthors}
          onSelectScientificName={(node) => setScientificName(node)}
        />
      </Box>

      {/* Type Info */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<ArchiveIcon />} title="Type Information" />
      <Stack spacing={1} mb={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocationOnIcon sx={{ color: "aquamarine" }} fontSize="small" />
          <Typography variant="body2">
            <strong>Type Locality:</strong> {typeLocalityName || "N/A"}
            {!isSpeciesOrSubspecies && typeLocalityName && (
              <Typography variant="caption" sx={{ ml: 1, fontStyle: "italic" }}>
                (Defined for the type species/subspecies)
              </Typography>
            )}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <ArchiveIcon sx={{ color: "aquamarine" }} fontSize="small" />
          <Typography variant="body2">
            <strong>Type Specimen Info:</strong> {scientificName.type_specimen_info || "N/A"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <ArchiveIcon sx={{ color: "aquamarine" }} fontSize="small" />
          <Typography variant="body2">
            <strong>Type Repository:</strong> {scientificName.type_repository || "N/A"}
          </Typography>
        </Stack>
      </Stack>

      {/* Distribution Map */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<PublicIcon />} title="Distribution Map" />
      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
        Colors on the map indicate the number of records.
        {isSpeciesOrSubspecies
          ? " The type locality country is highlighted in black with a pin."
          : ""}
      </Typography>
      <DistributionMap
        distributionLocalities={distributionLocalities}
        typeLocalityCountryName={typeLocalityName}
        isSpeciesOrSubspecies={isSpeciesOrSubspecies}
      />

      {/* Distribution List */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<PublicIcon />} title="Distribution List" />
      {distributionLocalities.length === 0 ? (
        <EmptyText>No distribution data available.</EmptyText>
      ) : (
        <>
          {!isSpeciesOrSubspecies && distributionLocalities.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mb: 1, fontStyle: "italic" }}>
              Aggregated records from descendant species/subspecies:
            </Typography>
          )}
          <Stack spacing={1} sx={{ mb: 3, maxHeight: 300, overflowY: "auto", pr: 1 }}>
            {aggregatedDistribution.map((item) => (
              <Chip
                key={item.country}
                label={`${item.country} (${item.items.length} record${
                  item.items.length > 1 ? "s" : ""
                })`}
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  minWidth: "180px",
                }}
                onClick={(e) => handleOpenCountry(e, item)}
              />
            ))}

            <Popover
              open={openPopover}
              anchorEl={anchorEl}
              onClose={handleCloseCountry}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{
                sx: {
                  width: 450,
                  p: 2,
                },
              }}
            >
              {selectedCountry && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {selectedCountry.country}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontStyle: "italic" }}>
                    Total {selectedCountry.items.length} records
                  </Typography>
                  {selectedCountry.items.map((loc, index) => {
                    const sourceRefs = loc.references?.length
                      ? loc.references.map((r) => shortRef(r)).join("; ")
                      : null;
                    return (
                      <Box key={index} sx={{ mb: 2, pl: 1 }}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                          • {loc.state || ""} {loc.city || ""}
                          {loc.detail ? ` / ${loc.detail}` : ""}
                          {loc.latitude != null && loc.longitude != null
                            ? ` (lat=${loc.latitude}, lng=${loc.longitude})`
                            : ""}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block" }}>
                          Reliability: {getStarRating(loc.reliability_id)}
                        </Typography>
                        {sourceRefs && (
                          <Typography variant="caption" sx={{ display: "block" }}>
                            Source: {sourceRefs}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Popover>
          </Stack>
        </>
      )}

      {/* Ecology */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<ParkIcon />} title="Ecology" />
      {ecologyData.length === 0 ? (
        <EmptyText>No ecology data available for this taxon.</EmptyText>
      ) : (
        <Stack spacing={1} sx={{ mb: 3 }}>
          {ecologyData.map((eco) => (
            <EcologyItem key={eco.id} eco={eco} allReferences={allReferences} />
          ))}
        </Stack>
      )}

      {/* References */}
      <Divider sx={{ my: 3, borderColor: "rgba(127,255,212,0.5)", borderWidth: 1 }} />
      <SectionTitle icon={<BookIcon />} title="References" />
      {finalReferenceList.length === 0 ? (
        <EmptyText>No references associated with this taxon or its data found.</EmptyText>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {finalReferenceList.map((ref) => (
            <Grid item xs={12} sm={6} md={4} key={ref.id}>
              <Paper
                variant="outlined"
                sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
              >
                <RenderReferenceItem pub={ref} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
