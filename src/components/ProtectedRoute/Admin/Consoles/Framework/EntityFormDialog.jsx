// src/components/ProtectedRoute/Admin/Consoles/Framework/EntityFormDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, FormControlLabel, Checkbox, Stack, Box, Typography
} from "@mui/material";

// ──────────────────────────────────────────────────────────────
// タイプ別フィールド（各コンポーネント内部で Hooks を使用OK）
// ──────────────────────────────────────────────────────────────
function TextFieldSimple({ field, value, setValue }) {
  return (
    <TextField
      fullWidth
      label={field.label}
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value)}
      multiline={field.multiline}
      required={field.required}
    />
  );
}

function NumberField({ field, value, setValue }) {
  return (
    <TextField
      fullWidth
      type="number"
      label={field.label}
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

function DateField({ field, value, setValue }) {
  return (
    <TextField
      fullWidth
      type="date"
      label={field.label}
      InputLabelProps={{ shrink: true }}
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function CheckboxField({ field, value, setValue }) {
  return (
    <FormControlLabel
      control={<Checkbox checked={!!value} onChange={(e) => setValue(e.target.checked)} />}
      label={field.label}
    />
  );
}

function SelectField({ field, value, setValue }) {
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const o = await field.options?.();
      if (mounted) setOpts(o || []);
    })();
    return () => { mounted = false; };
  }, [field]);

  return (
    <TextField select fullWidth label={field.label} value={value ?? ""} onChange={(e) => setValue(e.target.value)}>
      <MenuItem value="">(Select)</MenuItem>
      {opts.map((o) => (<MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>))}
    </TextField>
  );
}

function AsyncSelectField({ field, value, setValue }) {
  const [opts, setOpts] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const o = await field.search?.(q);
      if (mounted) setOpts(o || []);
    })();
    return () => { mounted = false; };
  }, [field, q]);

  return (
    <Stack>
      <TextField
        size="small"
        placeholder={`Search ${field.label}…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <TextField
        select
        fullWidth
        label={field.label}
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
      >
        <MenuItem value="">(Select)</MenuItem>
        {opts.map((o) => (
          <MenuItem key={String(field.getOptionValue(o))} value={field.getOptionValue(o)}>
            {field.getOptionLabel(o)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

function GeoField({ field, value, setValue }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <TextField
        fullWidth
        label={`${field.label} (lat)`}
        value={value?.lat ?? ""}
        onChange={(e) => setValue({ ...(value || {}), lat: e.target.value })}
      />
      <TextField
        fullWidth
        label={`${field.label} (lng)`}
        value={value?.lng ?? ""}
        onChange={(e) => setValue({ ...(value || {}), lng: e.target.value })}
      />
    </Stack>
  );
}

function JsonField({ field, value, setValue }) {
  return (
    <TextField
      fullWidth
      label={field.label}
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value)}
      multiline
    />
  );
}

// ──────────────────────────────────────────────────────────────
// フィールドレンダラー（ここでは Hooks を使わない）
// ──────────────────────────────────────────────────────────────
function FieldRenderer({ field, value, setValue }) {
  switch (field.type) {
    case "text":        return <TextFieldSimple field={field} value={value} setValue={setValue} />;
    case "number":      return <NumberField      field={field} value={value} setValue={setValue} />;
    case "date":        return <DateField        field={field} value={value} setValue={setValue} />;
    case "checkbox":    return <CheckboxField    field={field} value={value} setValue={setValue} />;
    case "select":      return <SelectField      field={field} value={value} setValue={setValue} />;
    case "asyncSelect": return <AsyncSelectField field={field} value={value} setValue={setValue} />;
    case "geo":         return <GeoField         field={field} value={value} setValue={setValue} />;
    case "json":        return <JsonField        field={field} value={value} setValue={setValue} />;
    default:            return <div />;
  }
}

// ──────────────────────────────────────────────────────────────
// 本体ダイアログ
// ──────────────────────────────────────────────────────────────
export default function EntityFormDialog({
  open, onClose, onSubmit, title,
  fields = [], validation, initial = {}
}) {
  const [form, setForm] = useState(initial || {});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial || {});
    setErrors({});
  }, [open, initial]);

  const handleSubmit = async () => {
    try {
      if (validation) {
        const parsed = validation.parse(form);
        await onSubmit(parsed);
      } else {
        await onSubmit(form);
      }
      onClose?.();
    } catch (e) {
      if (e?.errors) {
        const m = {};
        e.errors.forEach((er) => { m[er.path?.[0]] = er.message; });
        setErrors(m);
      } else {
        // バリデーション以外の例外
        console.error(e);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((f) => (
            <Box key={f.name}>
              <FieldRenderer
                field={f}
                value={form[f.name]}
                setValue={(v) => setForm((prev) => ({ ...prev, [f.name]: v }))}
              />
              {errors[f.name] && (
                <Typography variant="caption" color="error">{errors[f.name]}</Typography>
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
