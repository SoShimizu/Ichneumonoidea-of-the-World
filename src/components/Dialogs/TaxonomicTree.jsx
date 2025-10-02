import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Collapse,
  useMediaQuery,
  Divider,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// ランク優先度 (ベース参照コードのもの)
const RANK_PRIORITY = {
  kingdom: 1, phylum: 2, class: 3, order: 4, superfamily: 5, family: 6,
  subfamily: 7, tribe: 8, genus: 9, subgenus: 10, species: 11,
  "replacement_name": 11, // replacement_name は species と同等扱い
  subspecies: 12,
  synonym: 9999, // synonym/homonym は優先度最低
  homonym: 9999,
};

// ランク色 (ベース参照コードのもの)
const rankStyles = {
  kingdom: { color: "#FFEB3B" }, phylum: { color: "#FF9800" }, class: { color: "#FF7043" },
  order: { color: "#F06292" }, superfamily: { color: "#E040FB" }, family: { color: "#BA68C8" },
  subfamily: { color: "#CE93D8" }, tribe: { color: "#B39DDB" }, genus: { color: "#4FC3F7" },
  subgenus: { color: "#81D4FA" }, species: { color: "#9CCC65" },
  replacement_name: { color: "#80CBC4" }, // replacement_name の色
  subspecies: { color: "#C5E1A5" },
  synonym: { color: "#A0A0A0" }, // Synonym/Homonym の色を少し調整
  homonym: { color: "#A0A0A0" },
  default: { color: "aquamarine" },
};

// 複数形ラベル (getDescendantLine で使用)
const RANK_PLURALS = {
  kingdom: "kingdoms", phylum: "phyla", class: "classes", order: "orders",
  superfamily: "superfamilies", family: "families", subfamily: "subfamilies",
  tribe: "tribes", genus: "genera", subgenus: "subgenera", species: "species",
  subspecies: "subspecies", replacement_name: "replacement names",
  synonym: "synonyms", homonym: "homonyms", default: "others",
};

// インデント (ベース参照コードの値)
const INDENT_MULTIPLIER_MOBILE = 1.5;
const INDENT_MULTIPLIER_DESKTOP = 2.5;
const LINE_COLOR = "rgba(151, 235, 234, 0.68)"; // 線の色

export default function TaxonomicTree({
  rootScientificName,
  allScientificNames: allScientificNamesProp = [],
  scientificNameAuthors: scientificNameAuthorsProp = [],
  highlightId,
  onSelectScientificName,
}) {
  const [expandedNodes, setExpandedNodes] = useState({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const allScientificNames = useMemo(() => (Array.isArray(allScientificNamesProp) ? allScientificNamesProp : []), [allScientificNamesProp]);
  const scientificNameAuthors = useMemo(() => (Array.isArray(scientificNameAuthorsProp) ? scientificNameAuthorsProp : []), [scientificNameAuthorsProp]);

  // --- Helper Functions ---
  const getParentChain = useCallback((node) => {
    if (!node?.id) return [];
    const chain = []; let current = node; const visited = new Set([current.id]);
    while (current?.current_parent) {
      const parentId = current.current_parent;
      if (visited.has(parentId)) { console.warn("Circular:", current.id, "->", parentId); break; }
      const parent = allScientificNames.find((n) => n?.id === parentId);
      if (!parent) break;
      chain.unshift(parent); visited.add(parentId); current = parent;
    } return chain;
  }, [allScientificNames]);

  const getValidChildren = useCallback((nodeId) => {
    return allScientificNames
      .filter((n) => {
        if (n?.current_parent !== nodeId) return false;
        const rankLower = (n.current_rank || "").toLowerCase();
        return rankLower !== "synonym" && rankLower !== "homonym";
      })
      .sort((a, b) => {
        const rankA = RANK_PRIORITY[a.current_rank?.toLowerCase()] || 9999;
        const rankB = RANK_PRIORITY[b.current_rank?.toLowerCase()] || 9999;
        if (rankA !== rankB) return rankA - rankB;
        return (a.name_spell_valid || "").localeCompare(b.name_spell_valid || "");
      });
  }, [allScientificNames]);

  const getSpecialChildren = useCallback((nodeId) => {
    const synonyms = allScientificNames.filter(n => n?.current_parent === nodeId && n.current_rank?.toLowerCase() === "synonym").sort((a,b)=>(a.name_spell_valid||"").localeCompare(b.name_spell_valid||""));
    const homonyms = allScientificNames.filter(n => n?.current_parent === nodeId && n.current_rank?.toLowerCase() === "homonym").sort((a,b)=>(a.name_spell_valid||"").localeCompare(b.name_spell_valid||""));
    return { synonyms, homonyms };
  }, [allScientificNames]);

  // ▼▼▼ 修正点 1: 著者名の取得ロジックを更新 ▼▼▼
  const getAuthorsText = useCallback((scientificNameId) => {
    const authors = scientificNameAuthors
      .filter(rel => rel.scientific_name_id === scientificNameId)
      .sort((a, b) => a.author_order - b.author_order)
      // `rel.author?.last_name_eng` を `rel.researchers?.last_name` に変更
      .map(rel => rel.researchers?.last_name)
      .filter(Boolean);
      
    if (!authors.length) return "";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors.slice(0, -1).join(", ")} & ${authors.at(-1)}`;
  }, [scientificNameAuthors]);
  // ▲▲▲ 修正点 1 ▲▲▲

  const getDescendantCountByRank = useCallback((node, visited = new Set()) => {
      if (!node || !node.id || visited.has(node.id)) return {};
      visited.add(node.id);
      const counts = {};
      const children = getValidChildren(node.id);
      children.forEach((child) => {
          const rank = (child.current_rank || "default").toLowerCase();
          counts[rank] = (counts[rank] || 0) + 1;
          const descendantCounts = getDescendantCountByRank(child, new Set(visited));
          for (const [r, count] of Object.entries(descendantCounts)) {
              counts[r] = (counts[r] || 0) + count;
          }
      });
      return counts;
  }, [getValidChildren]);

  const getDescendantLine = useCallback((countsObj) => {
      if (!countsObj || Object.keys(countsObj).length === 0) return "";
      const sortedRanks = Object.keys(countsObj).sort((a, b) => (RANK_PRIORITY[a] || 9999) - (RANK_PRIORITY[b] || 9999));
      const pieces = sortedRanks.map(rank => { const count = countsObj[rank]; const label = RANK_PLURALS[rank] || `${rank}s`; return `${count} ${label}`; });
      return pieces.length > 0 ? `including ${pieces.join(", ")}` : "";
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const targetNode = allScientificNames.find((n) => n?.id === highlightId);
    if (!targetNode) return;
    const parents = getParentChain(targetNode); const newExpanded = {};
    parents.forEach((p) => { if (p?.id) newExpanded[p.id] = true; });
    newExpanded[targetNode.id] = true;
    setExpandedNodes(prev => ({ ...prev, ...newExpanded }));
  }, [highlightId, allScientificNames, getParentChain]);

  const expandAll = useCallback(() => {
    const allIds = {}; allScientificNames.forEach((node) => { if (node?.id) allIds[node.id] = true; });
    setExpandedNodes(allIds);
   }, [allScientificNames]);
  const collapseAll = useCallback(() => { setExpandedNodes({}); }, []);

  const handleNodeClick = useCallback((node) => {
    if (!node?.id) return;
    const isCurrentlyExpanded = !!expandedNodes[node.id];
    const willExpand = !isCurrentlyExpanded;

    setExpandedNodes(prev => ({
        ...prev,
        [node.id]: willExpand
    }));

    if (willExpand) {
        const parents = getParentChain(node);
        const ancestorsToExpand = {};
        parents.forEach((p) => { if (p?.id) ancestorsToExpand[p.id] = true; });
        setExpandedNodes(prev => ({ ...prev, ...ancestorsToExpand }));
    }
  }, [getParentChain, expandedNodes]);


  const renderNode = useCallback((node, level = 0) => {
    if (!node?.id) return null;

    const validChildren = getValidChildren(node.id);
    const special = getSpecialChildren(node.id);
    const hasValidChildren = validChildren.length > 0;
    const hasSpecialChildren = special.synonyms.length > 0 || special.homonyms.length > 0;
    const canExpand = hasValidChildren || hasSpecialChildren;

    const isExpanded = !!expandedNodes[node.id];
    const isTarget = node.id === highlightId;
    const rank = (node.current_rank || "default").toLowerCase();
    const style = rankStyles[rank] || rankStyles.default;
    const authors = getAuthorsText(node.id);
    const authorityText = [authors, node.authority_year].filter(Boolean).join(", ");

    const descendantCounts = getDescendantCountByRank(node);
    const descendantLine = getDescendantLine(descendantCounts);

    const indentMultiplier = isMobile ? INDENT_MULTIPLIER_MOBILE : INDENT_MULTIPLIER_DESKTOP;

    return (
      <Box sx={{ position: 'relative', ml: level * indentMultiplier }}>
        {level > 0 && (
          <Box sx={{ position: "absolute", top: 0, left: `-${indentMultiplier / 2}rem`, height: "100%", width: "1px", bgcolor: LINE_COLOR }} />
        )}

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: isTarget ? "rgba(127,255,212,0.15)" : "transparent", borderRadius: 1, p: 0.3, my: 0.2, minHeight: '24px' }}>
            <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {canExpand && (isExpanded ? <ExpandMoreIcon fontSize="small" sx={{ color: '#B0BEC5' }} /> : <ChevronRightIcon fontSize="small" sx={{ color: '#B0BEC5' }} />)}
            </Box>

            <Box flexGrow={1} onClick={() => canExpand && handleNodeClick(node)} sx={{ cursor: canExpand ? 'pointer' : 'default', display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}>
              <Typography variant="body2" component="span" sx={{ display: 'inline', whiteSpace: 'nowrap' }}>
                <Box component="span" sx={{ color: style.color, fontWeight: isTarget ? "bold" : "normal" }}>{node.current_rank || "Rank N/A"}:</Box>
                <Box component="span" sx={{ color: style.color, fontWeight: isTarget ? "bold" : "normal", ml: 0.5, fontStyle: ['species', 'subspecies', 'replacement_name'].includes(rank) ? 'italic' : 'normal' }}>{node.name_spell_valid || "Name N/A"}</Box>
                {authorityText && (<Typography component="span" variant="caption" sx={{ ml: 1, color: "lightgray" }}>({authorityText})</Typography>)}
              </Typography>

              {descendantLine && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: "#888", whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {descendantLine}
                  </Typography>
              )}

              {onSelectScientificName && (
                <Tooltip title="View Details" arrow>
                  <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Button size="small" onClick={() => onSelectScientificName(node)}
                      sx={{ minWidth: 0, color: "aquamarine", p: "2px 4px", lineHeight: 'inherit', verticalAlign: 'baseline', "&:hover": { bgcolor: "rgba(127,255,212,0.1)" } }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: '1rem', mr: { xs: 0, sm: 0.3 } }} />
                      <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'inline' } }}>SHOW DETAILS</Typography>
                    </Button>
                  </Box>
                </Tooltip>
              )}
          </Box>
        </Stack>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          {hasSpecialChildren && (
            <Box sx={{ ml: (level + 1) * indentMultiplier, pl: 1, mt: 0.5, mb: 0.5, borderLeft: `2px solid ${LINE_COLOR}`, py: 0.5 }}>
              {special.synonyms.map((syn) => {
                  const isSynTarget = syn.id === highlightId;
                  const synAuthors = getAuthorsText(syn.id);
                  const synAuthority = [synAuthors, syn.authority_year].filter(Boolean).join(", ");
                   return ( <Stack key={syn.id} direction="row" alignItems="center" spacing={1} sx={{ bgcolor: isSynTarget ? "rgba(127,255,212,0.1)" : "transparent", borderRadius: 1, p: 0.5, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: rankStyles.synonym.color, mr: 0.5, flexShrink: 0 }}>Synonym:</Typography>
                      <Typography variant="body2" sx={{ color: rankStyles.synonym.color, fontStyle: 'italic', flexGrow: 1 }}>
                        {syn.name_spell_valid} {synAuthority && <Typography component="span" variant="caption" sx={{ ml: 1, color: "lightgray" }}>({synAuthority})</Typography>}
                      </Typography>
                      {onSelectScientificName && (<Tooltip title="View Details of this Synonym" arrow>
                          <Button size="small" onClick={(e) => {e.stopPropagation(); onSelectScientificName(syn)}} sx={{ minWidth: 0, color: "aquamarine", p: "2px", ml: 'auto', flexShrink: 0, "&:hover": { bgcolor: "rgba(127,255,212,0.1)" } }}> <InfoOutlinedIcon fontSize="small" /> </Button>
                        </Tooltip> )}
                    </Stack> ); })}
               {special.homonyms.map((hm) => {
                   const isHmTarget = hm.id === highlightId;
                   const hmAuthors = getAuthorsText(hm.id);
                   const hmAuthority = [hmAuthors, hm.authority_year].filter(Boolean).join(", ");
                   return ( <Stack key={hm.id} direction="row" alignItems="center" spacing={1} sx={{ bgcolor: isHmTarget ? "rgba(127,255,212,0.1)" : "transparent", borderRadius: 1, p: 0.5, mb: 0.5, mt: special.synonyms.length > 0 ? 0.5 : 0 }}>
                       <Typography variant="body2" sx={{ color: rankStyles.homonym.color, mr: 0.5, flexShrink: 0 }}>Homonym:</Typography>
                       <Typography variant="body2" sx={{ color: rankStyles.homonym.color, fontStyle: 'italic', flexGrow: 1 }}>
                         {hm.name_spell_valid} {hmAuthority && <Typography component="span" variant="caption" sx={{ ml: 1, color: "lightgray" }}>({hmAuthority})</Typography>}
                       </Typography>
                       {onSelectScientificName && (<Tooltip title="View Details of this Homonym" arrow>
                           <Button size="small" onClick={(e) => {e.stopPropagation(); onSelectScientificName(hm)}} sx={{ minWidth: 0, color: "aquamarine", p: "2px", ml: 'auto', flexShrink: 0, "&:hover": { bgcolor: "rgba(127,255,212,0.1)" } }}> <InfoOutlinedIcon fontSize="small" /> </Button>
                         </Tooltip> )}
                     </Stack> ); })}
            </Box>
          )}
          {hasValidChildren && validChildren.map((child) => (
            <React.Fragment key={child.id}>
              {renderNode(child, level + 1)}
            </React.Fragment>
          ))}
        </Collapse>
      </Box>
    );
  // ▼▼▼ 修正点 2: ESLintの警告に従い、不要な依存関係を削除 ▼▼▼
  }, [
    getValidChildren, getSpecialChildren, expandedNodes, highlightId, isMobile,
    getAuthorsText, onSelectScientificName, handleNodeClick,
    getDescendantCountByRank, getDescendantLine
  ]);
  // ▲▲▲ 修正点 2 ▲▲▲

  const treeRootNodes = useMemo(() => {
    if (!rootScientificName?.id) return [];
    const rootNode = allScientificNames.find(n => n.id === rootScientificName.id);
    if (!rootNode) return [];
    const parents = getParentChain(rootNode);
    return [...parents, rootNode].filter(Boolean);
  }, [rootScientificName, allScientificNames, getParentChain]);

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} justifyContent="center">
        <Button variant="outlined" color="success" onClick={expandAll} startIcon={<ExpandMoreIcon />} sx={{ minWidth: 120 }}>Expand All</Button>
        <Button variant="outlined" color="error" onClick={collapseAll} startIcon={<ChevronRightIcon />} sx={{ minWidth: 120 }}>Collapse All</Button>
      </Stack>
      <Divider sx={{ mb: 2, borderColor: "rgba(176, 190, 197, 0.3)" }} />

      {treeRootNodes.length > 0 ? (
        treeRootNodes.map((node) => (
          <React.Fragment key={node?.id ?? `root-node-${Math.random()}`}>
            {renderNode(node, 0)}
          </React.Fragment>
        ))
      ) : (
        <Typography sx={{ textAlign: "center", color: "grey.500", mt: 3 }}>
          Select a taxon to display the tree.
        </Typography>
      )}
    </Box>
  );
}