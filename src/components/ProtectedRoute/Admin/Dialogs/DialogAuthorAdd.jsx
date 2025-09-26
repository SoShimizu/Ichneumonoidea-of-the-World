import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid
} from "@mui/material";
import { useState, useEffect } from "react";
import supabase from "../../../../utils/supabase";

export default function DialogAuthorAdd({ open, onClose, onAdd }) {
  const [form, setForm] = useState({
    id: "",
    first_name_eng: "",
    first_name_org: "",
    middle_name_eng: "",
    middle_name_org: "",
    last_name_eng: "",
    last_name_org: "",
    affiliations: "",
    orcid: "",
    research_gate: "",
    google_scholar: "",
    email: "",
    address: "",
    birth: "",
    death: "",
    remark: ""
  });

  const [errors, setErrors] = useState({
    id: false,
    first_name_eng: false,
    last_name_eng: false
  });

  useEffect(() => {
    if (open) {
      // ダイアログが開かれたときにフォームをリセット
      setForm({
        id: "",
        first_name_eng: "",
        first_name_org: "",
        middle_name_eng: "",
        middle_name_org: "",
        last_name_eng: "",
        last_name_org: "",
        affiliations: "",
        orcid: "",
        research_gate: "",
        google_scholar: "",
        email: "",
        address: "",
        birth: "",
        death: "",
        remark: ""
      });
      setErrors({
        id: false,
        first_name_eng: false,
        last_name_eng: false
      });
    }
  }, [open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async () => {
    const newErrors = {
    id: !form.id.trim(),
    first_name_eng: !form.first_name_eng.trim(),
    last_name_eng: !form.last_name_eng.trim()
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    const { data: exists } = await supabase
      .from("authors")
      .select("id")
      .eq("id", form.id);

    if (exists.length > 0) {
      alert("Author ID already exists.");
      return;
    }

    const cleanedForm = {
      ...form,
      birth: form.birth.trim() === "" ? null : form.birth,
      death: form.death.trim() === "" ? null : form.death
    };

    const { data, error } = await supabase
      .from("authors")
      .insert([cleanedForm])
      .select()
      .single();

    if (error) {
      alert("Failed to add author: " + error.message);
    } else {
      onAdd(data);
      onClose();
    }
  };


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Author</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="ID"
              value={form.id}
              onChange={(e) => handleChange("id", e.target.value)}
              fullWidth
              error={errors.id}
              helperText={errors.id && "Author ID is required"}
            />
          </Grid>

          {/* FIRST NAME */}
          <Grid item xs={4}>
            <TextField
              label="First Name (English)"
              value={form.first_name_eng}
              onChange={(e) => handleChange("first_name_eng", e.target.value)}
              fullWidth
              error={errors.first_name_eng}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="First Name (Original)"
              value={form.first_name_org}
              onChange={(e) => handleChange("first_name_org", e.target.value)}
              fullWidth
              error={errors.first_name_org}
            />
          </Grid>

          {/* MIDDLE NAME */}
          <Grid item xs={4}>
            <TextField
              label="Middle Name (English)"
              value={form.middle_name_eng}
              onChange={(e) => handleChange("middle_name_eng", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Middle Name (Original)"
              value={form.middle_name_org}
              onChange={(e) => handleChange("middle_name_org", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* LAST NAME */}
          <Grid item xs={4}>
            <TextField
              label="Last Name (English)"
              value={form.last_name_eng}
              onChange={(e) => handleChange("last_name_eng", e.target.value)}
              fullWidth
              error={errors.last_name_eng}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Last Name (Original)"
              value={form.last_name_org}
              onChange={(e) => handleChange("last_name_org", e.target.value)}
              fullWidth
              error={errors.last_name_org}
            />
          </Grid>

          {/* Affiliations */}
          <Grid item xs={12}>
            <TextField
              label="Affiliations"
              value={form.affiliations}
              onChange={(e) => handleChange("affiliations", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* ORCID */}
          <Grid item xs={6}>
            <TextField
              label="ORCID"
              value={form.orcid}
              onChange={(e) => handleChange("orcid", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Research Gate */}
          <Grid item xs={6}>
            <TextField
              label="Research Gate"
              value={form.research_gate}
              onChange={(e) => handleChange("research_gate", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Google Scholar */}
          <Grid item xs={6}>
            <TextField
              label="Google Scholar"
              value={form.google_scholar}
              onChange={(e) => handleChange("google_scholar", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Email */}
          <Grid item xs={6}>
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Address */}
          <Grid item xs={6}>
            <TextField
              label="Address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* BIRTH */}
          <TextField
            label="Birth"
            type="date"
            value={form.birth}
            onChange={(e) => handleChange("birth", e.target.value)}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />

          {/* Death */}
          <TextField
            label="Death"
            type="date"
            value={form.death}
            onChange={(e) => handleChange("death", e.target.value)}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />

          {/* REMARKS */}
          <Grid item xs={6}>
            <TextField
              label="Remark"
              value={form.remark}
              onChange={(e) => handleChange("remark", e.target.value)}
              fullWidth
            />
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="contained">
          Add
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}