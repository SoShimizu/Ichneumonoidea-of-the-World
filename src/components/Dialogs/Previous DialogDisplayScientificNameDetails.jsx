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
  // Dialog, DialogTitle, DialogContent, DialogActions, Button, // ← Dialogに切り替えたい場合に使う
} from "@mui/material";

import CategoryIcon from "@mui/icons-material/Category";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArchiveIcon from "@mui/icons-material/Archive";
import PublicIcon from "@mui/icons-material/Public";
import BookIcon from "@mui/icons-material/Book";
import ParkIcon from "@mui/icons-material/Park";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import leaflet from "leaflet";
import dayjs from "dayjs";
import supabase from "../../utils/supabase"; // ← プロジェクトパスに合わせて
import TaxonomicTree from "./TaxonomicTree"; // ← あなたのプロジェクト用
import worldGeoJson from "../../data/custom.geo.json"; // ← あなたのGeoJSONパス

//----------------------------------
// ユーティリティ & 定数
//----------------------------------

/** 分布Mapでの塗りつぶし色 */
function interpolateColor(value) {
  const colors = [
    [255, 255, 255],
    [0, 212, 255],
    [255, 255, 0],
    [255, 165, 0],
    [255, 0, 0],
    [139, 69, 19],
  ];
  const steps = colors.length - 1;
  const step = Math.min(Math.floor(value * steps), steps - 1);
  const ratio = value * steps - step;
  const start = colors[step];
  const end = colors[step + 1];
  const interpolated = start.map((s, i) => Math.round(s + (end[i] - s) * ratio));
  return `rgb(${interpolated.join(",")})`;
}

/** reliability_id => 星評価 */
function getStarRating(reliabilityId) {
  // ここはお好みでマッピング（例: "low", "medium", "high"）
  switch (reliabilityId) {
    case "low":
      return "★☆☆ (Low)";
    case "medium":
      return "★★☆ (Medium)";
    case "high":
      return "★★★ (High)";
    default:
      return "-";
  }
}

/** 文献を短く表示 */
function shortRef(pub) {
  if (!pub) return "No reference provided";
  const authors = pub.publications_authors
    ? pub.publications_authors
        .sort((a, b) => a.author_order - b.author_order)
        .map((rel) => rel.author?.last_name_eng)
        .filter(Boolean)
    : [];
  const year = pub.publication_date ? dayjs(pub.publication_date).format("YYYY") : "n.d.";
  const authorsStr =
    authors.length === 0
      ? `Unknown authors ${year}`
      : authors.length === 1
      ? `${authors[0]} ${year}`
      : `${authors[0]} et al. ${year}`;

  const journalName = pub.journal?.name_english || "";
  const volStr = pub.volume ? ` Vol. ${pub.volume}` : "";
  const numStr = pub.number ? ` (No. ${pub.number})` : "";
  const pageStr = pub.page ? `: ${pub.page}` : "";

  return `${authorsStr}${
    journalName ? ` — ${journalName}` : ""
  }${volStr}${numStr}${pageStr}${pub.doi ? `  DOI: ${pub.doi}` : ""}`;
}

const SectionTitle = ({ icon, title }) => (
  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
    {React.cloneElement(icon, { sx: { color: "aquamarine" }, fontSize: "small" })}
    <Typography variant="h6">{title}</Typography>
  </Stack>
);

const EmptyText = ({ children }) => (
  <Typography variant="body2" color="text.secondary" fontStyle="italic">
    {children}
  </Typography>
);

//----------------------------------
// 地図の再描画コンポーネント
//----------------------------------
function InvalidateSizeComponent() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const customIcon = new leaflet.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

/** 国名から地図中心をざっくり算出 */
function getCountryCenterFromGeoJson(countryName) {
  if (!worldGeoJson?.features || !countryName) return null;
  const lowerName = countryName.toLowerCase();
  const feature = worldGeoJson.features.find(
    (f) => f.properties?.admin?.toLowerCase() === lowerName
  );
  if (!feature || !feature.geometry) return null;

  let coordsArray = [];
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    coordsArray = geom.coordinates[0];
  } else if (geom.type === "MultiPolygon") {
    coordsArray = geom.coordinates.flat(2);
  }
  if (!coordsArray.length) return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  coordsArray.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (minLng === Infinity) return null;

  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

//----------------------------------
// DistributionMap
//----------------------------------
function DistributionMap({ distributionLocalities, typeLocalityCountryName, isSpeciesOrSubspecies }) {
  // 国ごとの件数集計
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

  // タイプ産地
  const typeLocalityCenter = useMemo(() => {
    if (!isSpeciesOrSubspecies || !typeLocalityCountryName) return null;
    return getCountryCenterFromGeoJson(typeLocalityCountryName);
  }, [typeLocalityCountryName, isSpeciesOrSubspecies]);

  // GeoJSONのスタイル
  const style = useCallback(
    (feature) => {
      const adminName = feature.properties?.admin;
      if (!adminName) {
        return { fillColor: "grey", weight: 0.5, color: "white", fillOpacity: 0.3 };
      }
      const count = countryCount[adminName] || 0;
      const normalizedCount = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
      let fillColor = interpolateColor(normalizedCount);

      // タイプ産地国は黒く塗る
      if (
        isSpeciesOrSubspecies &&
        typeLocalityCountryName &&
        adminName.toLowerCase() === typeLocalityCountryName.toLowerCase()
      ) {
        fillColor = "black";
      }
      return {
        fillColor,
        weight: 1,
        color: "white",
        dashArray: "3",
        fillOpacity: 0.7,
      };
    },
    [countryCount, maxCount, typeLocalityCountryName, isSpeciesOrSubspecies]
  );

  // 国境ポップアップ
  const onEachFeature = useCallback(
    (feature, layer) => {
      const adminName = feature.properties?.admin;
      if (!adminName) return;
      const count = countryCount[adminName] || 0;
      let popupContent = `${adminName}`;
      if (count > 0) popupContent += `: ${count} record(s)`;

      // タイプ産地
      if (
        isSpeciesOrSubspecies &&
        typeLocalityCountryName &&
        adminName.toLowerCase() === typeLocalityCountryName.toLowerCase()
      ) {
        if (count > 0) popupContent += "<br />(Type Locality Country)";
        else popupContent = `${adminName}: Type Locality Country`;
      }
      if (
        count > 0 ||
        (isSpeciesOrSubspecies && adminName.toLowerCase() === typeLocalityCountryName?.toLowerCase())
      ) {
        layer.bindPopup(popupContent);
      }
    },
    [countryCount, typeLocalityCountryName, isSpeciesOrSubspecies]
  );

  if (!worldGeoJson?.features) return <EmptyText>No world map data.</EmptyText>;

  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "2 / 1",
        position: "relative",
        border: "1px solid rgba(127,255,212,0.3)",
        borderRadius: 2,
        overflow: "hidden",
        mb: 3,
      }}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        style={{ width: "100%", height: "100%" }}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON data={worldGeoJson} style={style} onEachFeature={onEachFeature} />
        {/* 緯度経度付きの地点はマーカー表示 */}
        {distributionLocalities.map((loc, i) => {
          if (loc.latitude == null || loc.longitude == null) return null;
          return (
            <Marker key={`marker-${i}`} position={[loc.latitude, loc.longitude]} icon={customIcon}>
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
        {/* タイプ産地のマーカー */}
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
      <Box
        sx={{
          position: "absolute",
          right: 20,
          bottom: 40,
          width: 180,
          height: 12,
          background: "linear-gradient(to right, white, #00D4FF, yellow, orange, red, #8B4513)",
          border: "1px solid black",
          borderRadius: "4px",
          zIndex: 1000,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: 20,
          bottom: 22,
          width: 180,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "black",
          zIndex: 1000,
        }}
      >
        {maxCount > 0 && <div>0</div>}
        {maxCount > 0 && <div>{maxCount}</div>}
      </Box>
    </Box>
  );
}

//----------------------------------
// EcologyItem
//----------------------------------
function EcologyItem({ eco, allReferences }) {
  const refsArray = Array.isArray(allReferences?.data)
    ? allReferences.data
    : Array.isArray(allReferences)
    ? allReferences
    : [];

  const tagList = Array.isArray(eco.ecological_tags) ? eco.ecological_tags : [];
  const reliabilityStars = getStarRating(eco.reliability_id);

  // そのbionomic_recordのsource_publication_id
  const matchedReferences = useMemo(() => {
    if (!eco.source_publication_id) return [];
    const found = refsArray.filter((r) => r.id === eco.source_publication_id);
    return found;
  }, [eco.source_publication_id, refsArray]);

  // popover
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  if (!tagList.length) {
    return (
      <Box sx={{ mb: 1 }}>
        <Chip label={`(No ecology tag) Reliability: ${reliabilityStars}`} variant="outlined" />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {tagList.map((tag, idx) => (
          <Chip
            key={`${eco.id}-${tag}-${idx}`}
            label={`${tag} | ${reliabilityStars}`}
            variant="outlined"
            size="small"
            onClick={handleOpen}
            sx={{ cursor: "pointer" }}
          />
        ))}
      </Stack>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, maxWidth: 300 }}>
          {matchedReferences.length > 0 ? (
            matchedReferences.map((ref) => (
              <Typography
                key={ref.id}
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                {shortRef(ref)}
              </Typography>
            ))
          ) : (
            <Typography variant="caption" sx={{ fontStyle: "italic" }}>
              No reference provided
            </Typography>
          )}
        </Box>
      </Popover>
    </Box>
  );
}

//----------------------------------
// メイン
//----------------------------------
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

  // マップ用
  const allScientificNamesMap = useMemo(
    () => new Map(allScientificNames.map((sn) => [sn.id, sn])),
    [allScientificNames]
  );

  // -------------------------------------------
  // bionomic_recordsの取得ロジック
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

      setDistributionData(data.filter((d) => d.data_type === "distribution"));
      setEcologyData(data.filter((d) => d.data_type === "ecology"));
    } catch (err) {
      console.error("Error in fetchBionomicData:", err);
      setDistributionData([]);
      setEcologyData([]);
    }
  }, []);

  // 初期ロード or 学名変更時
  useEffect(() => {
    setScientificName(initialScientificName);
    if (initialScientificName?.id) {
      const rank = initialScientificName.current_rank;
      if (rank === "Species" || rank === "Subspecies") {
        fetchBionomicData([initialScientificName.id]);
      } else if (rank && allScientificNamesMap.size > 0) {
        const descIds = getAllDescendantSpeciesSubspeciesIds(
          initialScientificName.id,
          allScientificNamesMap
        );
        fetchBionomicData([initialScientificName.id, ...descIds]);
      } else {
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

  // -------------------------------------------
  // 学名の階層的情報 (ancestorTaxa)
  // -------------------------------------------
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

  // 著者
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

  // 学名表示のHTML
  const formattedScientificName = useMemo(() => {
    if (!scientificName) return "";
    const authorsText = formatAuthors(authorsForThisScientificName);
    const year = scientificName.authority_year || "";
    let authority = authorsText && year ? `${authorsText}, ${year}` : authorsText || year || "";

    // もともと()付きになるケース
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
      const genus = ancestorTaxa.find((a) => a.current_rank === "Genus");
      nameStr = `${italics(genus?.name_spell_valid || "")} (${italics(validName)})`;
    } else {
      nameStr = validName;
    }

    return `${nameStr}${authority ? ` ${authority}` : ""}`;
  }, [scientificName, authorsForThisScientificName, ancestorTaxa, formatAuthors]);

  // -------------------------------------------
  // Distribution配列のフラット化
  // -------------------------------------------
  // bionomic_recordsが複数あり => each recordに distribution: [...], reliability_id, source_publication_id
  // さらに referencesを取得したいなら、 record.source_publication_id からマッチさせる
  const refsArray = useMemo(() => {
    return Array.isArray(allReferences?.data)
      ? allReferences.data
      : Array.isArray(allReferences)
      ? allReferences
      : [];
  }, [allReferences]);

  const distributionLocalities = useMemo(() => {
    const result = [];
    distributionData.forEach((rec) => {
      // rec.source_publication_id => 文献取得
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
            // ここに参照を付与
            references: recRefs, // 1件かもしれないが複数の可能性もある想定
          });
        });
      }
    });
    return result;
  }, [distributionData, refsArray]);

  // 国ごとに集約
  const aggregatedDistribution = useMemo(() => {
    // Map<country, [ {state, city, detail, reliability_id, references}, ... ]>
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

  // -------------------------------------------
  // ポップアップ(チップ)の開閉
  // -------------------------------------------
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

  // もしPopoverではなくDialogに切り替えたい場合、下記のようにしてください:
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const handleOpenDialog = (item) => {
  //   setSelectedCountry(item);
  //   setDialogOpen(true);
  // };
  // const handleCloseDialog = () => {
  //   setDialogOpen(false);
  //   setSelectedCountry(null);
  // };

  // -------------------------------------------
  // references (finalReferenceList) などは既存ロジック
  // -------------------------------------------
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
                label={`${item.country} (${item.items.length} record${item.items.length > 1 ? "s" : ""})`}
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  minWidth: "180px", // ★ ここで国チップの幅を調整
                }}
                onClick={(e) => handleOpenCountry(e, item)}
              />
            ))}

            {/* Popoverを大きめにして Source 情報も表示 */}
            <Popover
              open={openPopover}
              anchorEl={anchorEl}
              onClose={handleCloseCountry}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{
                sx: {
                  width: 450, // ★ ポップアップの幅を大きめに
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
                    // referencesを整形
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

//----------------------------------
// 個々の文献表示
//----------------------------------
function RenderReferenceItem({ pub }) {
  if (!pub) return null;
  const catColors = {
    "Original description": "warning",
    "Taxonomic acts": "success",
    "Distribution": "info",
    "Ecology": "secondary",
  };

  const authors = pub.publications_authors
    ? pub.publications_authors
        .sort((a, b) => a.author_order - b.author_order)
        .map((r) => r.author)
        .filter(Boolean)
    : [];
  const authorStr = authors.length
    ? authors.map((a) => a.last_name_eng || "N/A").join("; ")
    : "Unknown authors";

  const journalName = pub.journal?.name_english || "No Journal Info";
  const pubYear = pub.publication_date ? dayjs(pub.publication_date).format("YYYY") : "n.d.";
  const titleHtml = pub.title_english || pub.title_original || "No Title Available";

  return (
    <>
      {/* カテゴリ(Original desc, Distribution等) */}
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
        {pub.categories?.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            color={catColors[cat] || "default"}
            size="small"
            variant="outlined"
            sx={{ mb: 0.5 }}
          />
        ))}
      </Stack>
      <Typography variant="subtitle2" sx={{ fontWeight: "medium", lineHeight: 1.3 }} gutterBottom>
        {authorStr} ({pubYear})
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5, lineHeight: 1.3 }}
        dangerouslySetInnerHTML={{ __html: titleHtml }}
      />
      {(journalName !== "No Journal Info" || pub.volume || pub.page) && (
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ fontStyle: "italic", lineHeight: 1.3 }}
        >
          {journalName}
          {pub.volume ? `, Vol. ${pub.volume}` : ""}
          {pub.number ? ` (No. ${pub.number})` : ""}
          {pub.page ? `: ${pub.page}` : ""}
        </Typography>
      )}
      {pub.doi && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.3, mt: 0.5 }}>
          DOI:{" "}
          <Link
            href={`https://doi.org/${pub.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "aquamarine", wordBreak: "break-all" }}
          >
            {pub.doi}
          </Link>
        </Typography>
      )}
    </>
  );
}
