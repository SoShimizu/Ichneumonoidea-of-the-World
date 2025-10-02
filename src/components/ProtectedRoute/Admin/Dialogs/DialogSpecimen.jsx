import React, { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  Button,
  Stack,
  Autocomplete,
  Chip,
  IconButton,
  MenuItem,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ReactSortable } from "react-sortablejs";
import supabase from "../../../../utils/supabase";

// サブダイアログ
import AddPublicationDialog from "./DialogPublicationAdd";
import AddTaxonDialog from "./DialogScientificNameAdd/DialogScientificNameAdd";
import AddCollectorDialog from "./DialogAuthorAdd";
import fetchSupabaseAll from "../../../../utils/fetchSupabaseAll";

export default function DialogSpecimen({ onClose, mode = "add", recordId = null }) {
  // --- Main record state ---
  // 同定結果は Original と Latest の2種類を持つ
  const [record, setRecord] = useState({
    publication_id: "",
    original_taxon_id: "",
    original_identification_info: "",
    latest_taxon_id: "",
    latest_identification_info: "",
    country_id: "",
    state_province: "",
    district: "",
    city: "",
    locality_detail: "",
    specimen_count_male: "",
    specimen_count_female: "",
    life_stage: "",
    preservation_method: "",
    collection_date: "",
    collection_method_id: "",
    depository_id: "",
    host_id: "",
    ecology_note: "",
    remarks: ""
  });

  // --- Coordinate inputs ---
  const [latitudeFormat, setLatitudeFormat] = useState("decimal");
  const [longitudeFormat, setLongitudeFormat] = useState("decimal");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitudeDMS, setLatitudeDMS] = useState({ deg: "", min: "", sec: "", dir: "N" });
  const [longitudeDMS, setLongitudeDMS] = useState({ deg: "", min: "", sec: "", dir: "E" });

  // --- Reference data ---
  const [publications, setPublications] = useState([]);
  const [taxa, setTaxa] = useState([]);
  const [countries, setCountries] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [lifeStages, setLifeStages] = useState([]);
  const [preservations, setPreservations] = useState([]);
  const [ecologicalTags, setEcologicalTags] = useState([]);
  const [sequenceTypes, setSequenceTypes] = useState([]);
  const [collectionMethods, setCollectionMethods] = useState([]);
  const [repositories, setRepositories] = useState([]);

  // --- Multi-select states ---
  const [selectedCollectors, setSelectedCollectors] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [molecularData, setMolecularData] = useState([]); // array of { sequence_type_id, accession }

  // --- Sub-dialog controls ---
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [showAddTaxon, setShowAddTaxon] = useState(false);
  const [showAddCollector, setShowAddCollector] = useState(false);

  const [saving, setSaving] = useState(false);

  // ---------------------------
  // DMS to Decimal conversion
  // ---------------------------
  const dmsToDecimal = (deg, min, sec, dir) => {
    const d = parseFloat(deg);
    const m = parseFloat(min);
    const s = parseFloat(sec);
    if (isNaN(d) || isNaN(m) || isNaN(s)) return null;
    let decimal = Math.abs(d) + m / 60 + s / 3600;
    return (dir === "S" || dir === "W") ? -decimal : decimal;
  };

  // ---------------------------
  // Convert coordinate based on format
  // ---------------------------
  const convertCoordinate = (value, direction, format, dmsValues) => {
    if (format === "decimal") {
      const num = parseFloat(value);
      return isNaN(num) ? null : ((direction === "S" || direction === "W") ? -Math.abs(num) : Math.abs(num));
    } else if (format === "dms") {
      return dmsToDecimal(dmsValues.deg, dmsValues.min, dmsValues.sec, dmsValues.dir);
    }
    return null;
  };

  // ---------------------------
  // Fetch reference data and (for edit/delete) existing record data
  // ---------------------------
  const fetchInitialData = async () => {
    try {
      const sn = await fetchSupabaseAll("scientific_names", `
          id, name_spell_valid, authority_year, current_rank,
          parent:current_parent(id, name_spell_valid),
          scientific_name_and_author(
            author_order,
            researchers(id, last_name_eng)
          )
        `);
      const [
        { data: pub, error: pubErr },
        { data: cnt, error: cntErr },
        { data: auth, error: authErr },
        { data: lifeData, error: lifeErr },
        { data: presData, error: presErr },
        { data: tags, error: tagsErr },
        { data: seqTypes, error: seqTypesErr },
        { data: collMethods, error: collMethodsErr },
        { data: repos, error: reposErr }
      ] = await Promise.all([
        supabase.from("publications").select(`
          id, title_english, publication_date, volume, number, page,
          journal:journal_id(name_english),
          publications_authors(author_order, authors(last_name_eng))
        `),
        supabase.from("countries").select("id, name"),
        supabase.from("researchers").select("id, first_name_eng, last_name_eng"),
        supabase.from("life_stages").select("id, name"),
        supabase.from("preservation_methods").select("id"),
        supabase.from("ecological_tags").select("id, name"),
        supabase.from("sequence_types").select("id, name"),
        supabase.from("collection_methods").select("id, method_name"),
        supabase.from("Repositories").select("id, full_name")
      ]);
      if (pubErr || cntErr || authErr || lifeErr || presErr || tagsErr || seqTypesErr || collMethodsErr || reposErr) {
        throw new Error("Error fetching reference data");
      }
      if (pub) setPublications(pub);
      if (sn) setTaxa(sn);
      if (cnt) setCountries(cnt);
      if (auth) setCollectors(auth);
      if (lifeData) setLifeStages(lifeData);
      if (presData) setPreservations(presData);
      if (tags) setEcologicalTags(tags);
      if (seqTypes) setSequenceTypes(seqTypes);
      if (collMethods) setCollectionMethods(collMethods);
      if (repos) setRepositories(repos);

      // For edit and delete mode, fetch existing record data
      if ((mode === "edit" || mode === "delete") && recordId) {
        const { data: existingRecord, error: recErr } = await supabase
          .from("distribution_records")
          .select("*")
          .eq("id", recordId)
          .single();
        if (recErr) throw recErr;
        if (existingRecord) {
          setRecord(existingRecord);
          setLatitude(existingRecord.latitude || "");
          setLongitude(existingRecord.longitude || "");
        }
        // Fetch associated collectors
        const { data: collLinks } = await supabase
          .from("distribution_record_and_collector")
          .select("collector_id, order")
          .eq("distribution_record_id", recordId)
          .order("order", { ascending: true });
        if (collLinks) {
          const selected = collLinks.map(link => {
            const coll = auth.find(a => a.id === link.collector_id);
            return coll ? { id: coll.id, first_name: coll.first_name_eng, last_name: coll.last_name_eng } : { id: link.collector_id, first_name: "(Unknown)", last_name: "" };
          });
          setSelectedCollectors(selected);
        }
        // Fetch associated ecological tags
        const { data: tagLinks } = await supabase
          .from("distribution_and_ecological_tags")
          .select("ecological_tag_id")
          .eq("distribution_record_id", recordId);
        if (tagLinks) {
          setSelectedTags(tagLinks.map(t => t.ecological_tag_id));
        }
        // Fetch associated molecular data
        const { data: seqData } = await supabase
          .from("specimen_and_sequence")
          .select("sequence_type_id, accession")
          .eq("distribution_record_id", recordId);
        if (seqData) {
          setMolecularData(seqData);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [mode, recordId]);

  // ---------------------------
  // Input change handler for main record
  // ---------------------------
  const handleChange = (field, value) => {
    setRecord(prev => ({ ...prev, [field]: value }));
  };

  // ---------------------------
  // Molecular Data change handlers
  // ---------------------------
  const handleMolecularDataChange = (index, field, value) => {
    const newData = [...molecularData];
    newData[index] = { ...newData[index], [field]: value };
    setMolecularData(newData);
  };
  const addMolecularDataEntry = () => {
    setMolecularData(prev => [...prev, { sequence_type_id: "", accession: "" }]);
  };
  const removeMolecularDataEntry = (index) => {
    setMolecularData(prev => prev.filter((_, i) => i !== index));
  };

  // ---------------------------
  // Save handler (for add/edit)
  // ---------------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      const finalLatitude = convertCoordinate(latitude, record.latitude_dir, latitudeFormat, latitudeDMS);
      const finalLongitude = convertCoordinate(longitude, record.longitude_dir, longitudeFormat, longitudeDMS);
      const payload = { ...record, latitude: finalLatitude, longitude: finalLongitude };

      let currentRecordId = recordId;
      if (mode === "add") {
        const { data: newRecord, error: insertError } = await supabase
          .from("distribution_records")
          .insert([payload])
          .select()
          .single();
        if (insertError) throw insertError;
        currentRecordId = newRecord.id;
      } else if (mode === "edit") {
        const { error: updateError } = await supabase
          .from("distribution_records")
          .update(payload)
          .eq("id", recordId);
        if (updateError) throw updateError;
      }
      // For add/edit, update many-to-many tables:
      // First, clear existing links if editing:
      if (mode === "edit") {
        await supabase.from("distribution_record_and_collector").delete().eq("distribution_record_id", currentRecordId);
        await supabase.from("distribution_and_ecological_tags").delete().eq("distribution_record_id", currentRecordId);
        await supabase.from("specimen_and_sequence").delete().eq("distribution_record_id", currentRecordId);
      }
      // Insert collector links
      if (selectedCollectors.length > 0) {
        const collectorLinks = selectedCollectors.map((c, i) => ({
          distribution_record_id: currentRecordId,
          collector_id: c.id,
          order: i
        }));
        const { error: collError } = await supabase
          .from("distribution_record_and_collector")
          .insert(collectorLinks);
        if (collError) throw collError;
      }
      // Insert ecological tag links
      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tagId => ({
          distribution_record_id: currentRecordId,
          ecological_tag_id: tagId
        }));
        const { error: tagError } = await supabase
          .from("distribution_and_ecological_tags")
          .insert(tagLinks);
        if (tagError) throw tagError;
      }
      // Insert molecular data links
      if (molecularData.length > 0) {
        const molecularEntries = molecularData
          .filter(seq => (seq.sequence_type_id && seq.sequence_type_id.trim()) || (seq.accession && seq.accession.trim()))
          .map(seq => ({
            distribution_record_id: currentRecordId,
            sequence_type_id: seq.sequence_type_id,
            accession: seq.accession
          }));
        if (molecularEntries.length > 0) {
          const { error: molError } = await supabase
            .from("specimen_and_sequence")
            .insert(molecularEntries);
          if (molError) throw molError;
        }
      }
      alert(mode === "add" ? "Record added successfully!" : "Record saved successfully!");
      onClose();
    } catch (err) {
      console.error("Error saving record:", err);
      alert("Failed to save record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Delete handler (for delete mode)
  // ---------------------------
  const handleDelete = async () => {
    if (!recordId) return;
    setSaving(true);
    try {
      // Delete associated many-to-many records first:
      await supabase.from("distribution_record_and_collector").delete().eq("distribution_record_id", recordId);
      await supabase.from("distribution_and_ecological_tags").delete().eq("distribution_record_id", recordId);
      await supabase.from("specimen_and_sequence").delete().eq("distribution_record_id", recordId);
      const { error: deleteError } = await supabase.from("distribution_records").delete().eq("id", recordId);
      if (deleteError) throw deleteError;
      alert("Record deleted successfully.");
      onClose();
    } catch (err) {
      console.error("Error deleting record:", err);
      alert("Failed to delete record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Display labels for Autocomplete options
  // ---------------------------
  const renderPublicationLabel = (pub) => {
    if (!pub) return "";
    const authors = (pub.publications_authors || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map(pa => pa.authors?.last_name_eng)
      .filter(Boolean);
    let authorStr = authors.slice(0, 3).join(", ");
    if (authors.length > 3) authorStr += ", et al";
    const year = pub.publication_date ? new Date(pub.publication_date).getFullYear() : "n.d.";
    const journal = pub.journal?.name_english || "";
    return `${authorStr} (${year}) ${pub.title_english}${journal ? ` — ${journal}` : ""}`;
  };

  const renderTaxonLabel = (tax) => {
    if (!tax) return "";
    const rank = tax.current_rank || "unknown";
    const parentName = tax.parent?.name_spell_valid || "unknown";
    const authors = (tax.scientific_name_and_author || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map(sa => sa.authors?.last_name_eng)
      .filter(Boolean);
    let authorStr = authors.slice(0, 3).join(", ");
    if (authors.length > 3) authorStr += ", et al";
    return (
      <li>
        {parentName}&nbsp;—&nbsp;<strong>{tax.name_spell_valid}</strong>&nbsp;: {authorStr || "no author data"}, {tax.authority_year || "n.d."} [{rank}]
      </li>
    );
  };

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h4">
          {mode === "add" && "Add Specimen-Based Record"}
          {mode === "edit" && "Edit Specimen-Based Record"}
            {mode === "delete" && "Delete Specimen-Based Record"}
            </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {mode === "delete" ? (
            <Box>
              <Typography variant="body1" color="error">
                Are you sure you want to delete this specimen record? This action cannot be undone.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2} mt={2}>
              <Divider sx={{ mb: 3, borderWidth: 2, borderColor: "aquamarine" }} />
              <Typography variant="body">
                The specimen data (including distribution and ecological information) will serve as the source for further analysis.
                Please enter the information carefully.
              </Typography>
              <Divider sx={{ mb: 3, borderWidth: 2, borderColor: "aquamarine" }} />

              {/* Source */}
              <Typography variant="h5">Source</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flexGrow: 1 }}>
                  <Autocomplete
                    options={publications}
                    getOptionLabel={renderPublicationLabel}
                    value={publications.find(p => p.id === record.publication_id) || null}
                    onChange={(e, val) => handleChange("publication_id", val?.id || "")}
                    renderInput={(params) => (
                      <TextField {...params} label="Publication" margin="dense" fullWidth />
                    )}
                  />
                </Box>
                <IconButton onClick={() => setShowAddPublication(true)} size="large">
                  <AddIcon />
                </IconButton>
              </Stack>

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Identification */}
              <Typography variant="h5">Identification</Typography>
              {/* Original Identification */}
              <Typography variant="h6">Original Identification</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flexGrow: 1 }}>
                  <Autocomplete
                    options={taxa}
                    getOptionLabel={(tax) => tax.name_spell_valid || ""}
                    renderOption={(props, tax) => (
                      <li {...props}>{renderTaxonLabel(tax)}</li>
                    )}
                    value={taxa.find(t => t.id === record.original_taxon_id) || null}
                    onChange={(e, val) => handleChange("original_taxon_id", val?.id || "")}
                    renderInput={(params) => (
                      <TextField {...params} label="Original Taxon" margin="dense" fullWidth />
                    )}
                  />
                </Box>
              </Stack>
              <TextField
                label="Original Identification Info"
                value={record.original_identification_info}
                onChange={(e) => handleChange("original_identification_info", e.target.value)}
                fullWidth
                margin="dense"
                helperText="Enter identification details (e.g., identifier name and year if no publication available)"
                placeholder="e.g., Smith, 1998"
              />

              {/* Latest Identification */}
              <Typography variant="h6">Latest Identification</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flexGrow: 1 }}>
                  <Autocomplete
                    options={taxa}
                    getOptionLabel={(tax) => tax.name_spell_valid || ""}
                    renderOption={(props, tax) => (
                      <li {...props}>{renderTaxonLabel(tax)}</li>
                    )}
                    value={taxa.find(t => t.id === record.latest_taxon_id) || null}
                    onChange={(e, val) => handleChange("latest_taxon_id", val?.id || "")}
                    renderInput={(params) => (
                      <TextField {...params} label="Latest Taxon" margin="dense" fullWidth />
                    )}
                  />
                </Box>
              </Stack>
              <TextField
                label="Latest Identification Info"
                value={record.latest_identification_info}
                onChange={(e) => handleChange("latest_identification_info", e.target.value)}
                fullWidth
                margin="dense"
                helperText="Enter latest identification details (e.g., publication title or identifier and year)"
                placeholder="e.g., Journal of ... or Doe, 2020"
              />

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Locality */}
              <Typography variant="h5">Locality</Typography>
              <Stack spacing={1}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(c) => c.id}
                  value={countries.find(c => c.id === record.country_id) || null}
                  onChange={(e, val) => handleChange("country_id", val?.id || "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country"
                      margin="dense"
                      fullWidth
                      helperText="e.g., Japan, United States, France"
                      placeholder="Japan"
                    />
                  )}
                />
                <TextField
                  label="State / Province / Prefecture"
                  value={record.state_province}
                  onChange={(e) => handleChange("state_province", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="e.g., Hyogo, California"
                  placeholder="Hyogo Prefecture"
                />
                <TextField
                  label="District (Ward / County / District)"
                  value={record.district}
                  onChange={(e) => handleChange("district", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="Provide the district, ward, or county (e.g., Nada Ward, Los Angeles County)"
                  placeholder="Nada Ward"
                />
                <TextField
                  label="City"
                  value={record.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="e.g., Kobe City, Los Angeles"
                  placeholder="Kobe City"
                />
                <TextField
                  label="Locality Detail"
                  value={record.locality_detail}
                  onChange={(e) => handleChange("locality_detail", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="e.g., Rokko-dai, Downtown area"
                  placeholder="Rokko-dai"
                />
              </Stack>

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Coordinates */}
              <Typography variant="h5">Coordinates</Typography>
              <Stack direction="row" spacing={2}>
                {/* Latitude Block */}
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <TextField
                    select
                    label="Lat Format"
                    value={latitudeFormat}
                    onChange={(e) => setLatitudeFormat(e.target.value)}
                    margin="dense"
                  >
                    <MenuItem value="decimal">Decimal</MenuItem>
                    <MenuItem value="dms">DMS</MenuItem>
                  </TextField>
                  {latitudeFormat === "decimal" ? (
                    <TextField
                      label="Latitude (decimal)"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      fullWidth
                      margin="dense"
                    />
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Deg"
                        value={latitudeDMS.deg}
                        onChange={(e) => setLatitudeDMS({ ...latitudeDMS, deg: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        label="Min"
                        value={latitudeDMS.min}
                        onChange={(e) => setLatitudeDMS({ ...latitudeDMS, min: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        label="Sec"
                        value={latitudeDMS.sec}
                        onChange={(e) => setLatitudeDMS({ ...latitudeDMS, sec: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        select
                        label="Dir"
                        value={latitudeDMS.dir}
                        onChange={(e) => setLatitudeDMS({ ...latitudeDMS, dir: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      >
                        <MenuItem value="N">N</MenuItem>
                        <MenuItem value="S">S</MenuItem>
                      </TextField>
                    </Stack>
                  )}
                </Stack>
                {/* Longitude Block */}
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <TextField
                    select
                    label="Lon Format"
                    value={longitudeFormat}
                    onChange={(e) => setLongitudeFormat(e.target.value)}
                    margin="dense"
                  >
                    <MenuItem value="decimal">Decimal</MenuItem>
                    <MenuItem value="dms">DMS</MenuItem>
                  </TextField>
                  {longitudeFormat === "decimal" ? (
                    <TextField
                      label="Longitude (decimal)"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      fullWidth
                      margin="dense"
                    />
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Deg"
                        value={longitudeDMS.deg}
                        onChange={(e) => setLongitudeDMS({ ...longitudeDMS, deg: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        label="Min"
                        value={longitudeDMS.min}
                        onChange={(e) => setLongitudeDMS({ ...longitudeDMS, min: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        label="Sec"
                        value={longitudeDMS.sec}
                        onChange={(e) => setLongitudeDMS({ ...longitudeDMS, sec: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      />
                      <TextField
                        select
                        label="Dir"
                        value={longitudeDMS.dir}
                        onChange={(e) => setLongitudeDMS({ ...longitudeDMS, dir: e.target.value })}
                        sx={{ width: "70px" }}
                        margin="dense"
                      >
                        <MenuItem value="E">E</MenuItem>
                        <MenuItem value="W">W</MenuItem>
                      </TextField>
                    </Stack>
                  )}
                </Stack>
              </Stack>

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Specimen Condition */}
              <Typography variant="h5">Specimen Condition</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Male Count"
                  type="number"
                  value={record.specimen_count_male}
                  onChange={(e) => handleChange("specimen_count_male", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="Enter number of male specimens (e.g., 2)"
                  placeholder="2"
                />
                <TextField
                  label="Female Count"
                  type="number"
                  value={record.specimen_count_female}
                  onChange={(e) => handleChange("specimen_count_female", e.target.value)}
                  fullWidth
                  margin="dense"
                  helperText="Enter number of female specimens (e.g., 3)"
                  placeholder="3"
                />
              </Stack>
              <Autocomplete
                options={lifeStages}
                getOptionLabel={(s) => s.name}
                value={lifeStages.find(s => s.id === record.life_stage) || null}
                onChange={(e, val) => handleChange("life_stage", val?.id || "")}
                renderInput={(params) => (
                  <TextField {...params} label="Life Stage" margin="dense" fullWidth />
                )}
              />
              <Autocomplete
                options={preservations}
                getOptionLabel={(s) => s.id}
                value={preservations.find(s => s.id === record.preservation_method) || null}
                onChange={(e, val) => handleChange("preservation_method", val?.id || "")}
                renderInput={(params) => (
                  <TextField {...params} label="Preservation Method" margin="dense" fullWidth />
                )}
              />

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Collection */}
              <Typography variant="h5">Collection</Typography>
              <TextField
                label="Collection Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={record.collection_date}
                onChange={(e) => handleChange("collection_date", e.target.value)}
                fullWidth
                margin="dense"
              />
              <Autocomplete
                options={collectionMethods}
                getOptionLabel={(cm) => cm.method_name}
                value={collectionMethods.find(cm => cm.id === record.collection_method_id) || null}
                onChange={(e, val) => handleChange("collection_method_id", val?.id || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Collection Method"
                    margin="dense"
                    fullWidth
                    helperText="Select the method used to collect the specimen"
                    placeholder="Hand collection"
                  />
                )}
              />
              {/* Collectors and Ecological Tags */}
              <Stack spacing={1}>
                <ReactSortable
                  tag="div"
                  list={selectedCollectors}
                  setList={setSelectedCollectors}
                  style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                >
                  {selectedCollectors.map((c) => (
                    <Chip
                      key={c.id}
                      label={`${c.first_name_eng} ${c.last_name_eng}`}
                    />
                  ))}
                </ReactSortable>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <Autocomplete
                      multiple
                      options={collectors}
                      getOptionLabel={(c) => `${c.first_name_eng} ${c.last_name_eng}`}
                      value={selectedCollectors}
                      onChange={(e, val) => setSelectedCollectors(val)}
                      renderInput={(params) => (
                        <TextField {...params} label="Add Collectors" margin="dense" fullWidth />
                      )}
                    />
                  </Box>
                  <IconButton onClick={() => setShowAddCollector(true)} size="large">
                    <AddIcon />
                  </IconButton>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Repository */}
              <Typography variant="h5">Specimen Repository</Typography>
              <Autocomplete
                options={repositories}
                getOptionLabel={(r) => `${r.id} — ${r.full_name}`}
                value={repositories.find(r => r.id === record.depository_id) || null}
                onChange={(e, val) => handleChange("depository_id", val?.id || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Repository"
                    margin="dense"
                    fullWidth
                    helperText="Select the repository that houses the specimen"
                    placeholder="e.g., KMNH"
                  />
                )}
              />

              <Divider sx={{ mb: 3, borderWidth: 1, borderColor: "aquamarine" }} />
              {/* Ecological Note */}
              <Typography variant="h5">Ecological Note</Typography>
              <TextField
                label="Ecology Note"
                value={record.ecology_note}
                onChange={(e) => handleChange("ecology_note", e.target.value)}
                fullWidth
                margin="dense"
                multiline
              />
              <TextField
                label="Remarks"
                value={record.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                fullWidth
                margin="dense"
                multiline
              />

              <Divider sx={{ mb: 3, borderWidth: 2, borderColor: "aquamarine" }} />
              {/* Molecular Data */}
              <Typography variant="h5">Molecular Data</Typography>
              {molecularData.map((mol, index) => (
                <Box key={index} sx={{ border: "1px solid #ddd", borderRadius: 1, p: 1, mb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Autocomplete
                      options={sequenceTypes}
                      getOptionLabel={(st) => st.name}
                      value={sequenceTypes.find(st => st.id === mol.sequence_type_id) || null}
                      onChange={(e, val) =>
                        handleMolecularDataChange(index, "sequence_type_id", val?.id || "")
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Sequence Type" margin="dense" fullWidth />
                      )}
                    />
                    <TextField
                      label="Accession Number"
                      value={mol.accession}
                      onChange={(e) => handleMolecularDataChange(index, "accession", e.target.value)}
                      margin="dense"
                      fullWidth
                      placeholder="e.g., AB123456"
                    />
                    <IconButton onClick={() => removeMolecularDataEntry(index)} size="large">
                      <AddIcon color="error" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
              <Button variant="outlined" onClick={addMolecularDataEntry} sx={{ mt: 1 }}>
                Add Molecular Data Entry
              </Button>

              <Divider sx={{ mb: 3, borderWidth: 2, borderColor: "aquamarine" }} />
              

              <Typography variant="h5" sx={{ mt: 2 }}>Ecological Tags</Typography>
              <Autocomplete
                multiple
                options={ecologicalTags}
                getOptionLabel={(tag) => tag.name}
                value={selectedTags}
                onChange={(e, val) => setSelectedTags(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Ecological Tags" margin="dense" fullWidth />
                )}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          {mode === "delete" ? (
            <Button onClick={handleDelete} variant="contained" color="error">
              Delete
            </Button>
          ) : (
            <Button onClick={handleSave} variant="contained" color="primary">
              {mode === "add" ? "Add Record" : "Save Changes"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Sub-dialogs */}
      {showAddPublication && (
        <AddPublicationDialog
          onClose={() => {
            setShowAddPublication(false);
            fetchInitialData();
          }}
        />
      )}
      {showAddTaxon && (
        <AddTaxonDialog
          onClose={() => {
            setShowAddTaxon(false);
            fetchInitialData();
          }}
        />
      )}
      {showAddCollector && (
        <AddCollectorDialog
          onClose={() => {
            setShowAddCollector(false);
            fetchInitialData();
          }}
        />
      )}
    </>
  );
}
