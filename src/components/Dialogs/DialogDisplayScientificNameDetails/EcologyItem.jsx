// EcologyItem.jsx
import React, { useMemo, useState } from "react";
import { Stack, Box, Chip, Typography, Popover } from "@mui/material";
import { getStarRating, shortRef } from "./utilsDialogDisplayScientificNameDetails";

export default function EcologyItem({ eco, allReferences }) {
  // refsArrayをuseMemoで固定する
  const refsArray = useMemo(() => {
    return Array.isArray(allReferences?.data)
      ? allReferences.data
      : Array.isArray(allReferences)
      ? allReferences
      : [];
  }, [allReferences]);

  const tagList = Array.isArray(eco.ecological_tags) ? eco.ecological_tags : [];
  const reliabilityStars = getStarRating(eco.reliability_id);

  const matchedReferences = useMemo(() => {
    if (!eco.source_publication_id) return [];
    return refsArray.filter((r) => r.id === eco.source_publication_id);
  }, [eco.source_publication_id, refsArray]); // 依存に refsArray を安全に使える！

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
