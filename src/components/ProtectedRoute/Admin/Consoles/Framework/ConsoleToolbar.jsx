// src/admin/console/framework/ConsoleToolbar.jsx
import React, { useEffect, useState } from "react";
import { Checkbox, FormControlLabel, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";

export default function ConsoleToolbar({
  searchText, onSearchChange,
  filters, onFiltersChange,
  showHidden, onToggleHidden,
  onRefresh
}) {
  const [local, setLocal] = useState(searchText || "");
  useEffect(() => setLocal(searchText || ""), [searchText]);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange?.(local), 300);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 1 }}>
      <TextField
        size="small"
        placeholder="Search… (press /)"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "/") { e.preventDefault(); const el = e.currentTarget; el.focus(); el.select(); } }}
        sx={{ minWidth: 240, flex: 1 }}
      />
      {filters?.map((f) => (
        <TextField key={f.name} size="small" select label={f.label} value={f.value ?? ""} onChange={(e) => onFiltersChange?.(f.name, e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">(Any)</MenuItem>
          {(f.options || []).map((opt) => <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>)}
        </TextField>
      ))}
      <Tooltip title="Toggle hidden columns">
        <FormControlLabel control={<Checkbox checked={showHidden} onChange={(e) => onToggleHidden?.(e.target.checked)} />} label="Show hidden" />
      </Tooltip>
      <Tooltip title="Refresh">
        <IconButton onClick={onRefresh}><RefreshIcon /></IconButton>
      </Tooltip>
    </Stack>
  );
}
