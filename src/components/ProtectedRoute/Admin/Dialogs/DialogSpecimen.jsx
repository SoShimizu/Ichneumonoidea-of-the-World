import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, TextField, Button, Stack, Autocomplete, Chip,
  IconButton, MenuItem, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Supabase & Utils
import supabase from "../../../../utils/supabase";

// Reusable Selector Components
import PublicationSelector from "./parts/PublicationSelector";
import ScientificNameSelector from "./parts/ScientificNameSelector";
import ResearcherSelector from "./parts/ResearcherSelector";
import RepositorySelector from "./parts/RepositorySelector";

// Sub-Dialogs (for adding new master data)
import DialogPublicationAdd from "./DialogPublicationAdd";
import DialogScientificNameAdd from "./DialogScientificNameAdd/DialogScientificNameAdd";
import DialogResearcher from "./DialogResearcher";
import LoadingScreen from "../../../LoadingScreen";
import AuditLogUpdater from "../../AuditLogUpdater/AuditLogUpdater";


// --- Helper: Coordinate Conversion ---
const dmsToDecimal = (deg, min, sec, dir) => {
  const d = parseFloat(deg) || 0;
  const m = parseFloat(min) || 0;
  const s = parseFloat(sec) || 0;
  let decimal = d + m / 60 + s / 3600;
  return (dir === "S" || dir === "W") ? -decimal : decimal;
};

// --- Main Component ---
export default function DialogSpecimen({ onClose, mode = "add", recordId = null }) {
    const [record, setRecord] = useState({
        publication_id: null,
        original_taxon_id: null,
        original_identification_remarks: '',
        latest_taxon_id: null,
        latest_identification_remarks: '',
        country_id: null,
        state_province: '',
        city: '',
        locality_detail: '',
        latitude: null,
        longitude: null,
        specimen_count_male: null,
        specimen_count_female: null,
        life_stage: null,
        preservation_method: null,
        collection_date: null,
        collection_method_id: null,
        depository_id: null,
        host_id: null,
        ecology_note: '',
        remarks: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [auditLogProps, setAuditLogProps] = useState(null);
    const [initialRecordState, setInitialRecordState] = useState(null); // For audit logging

    // --- Related Data States ---
    const [selectedCollectors, setSelectedCollectors] = useState([]);
    const [molecularData, setMolecularData] = useState([{ sequence_type_id: "", accession: "" }]);
    const [ecologicalTags, setEcologicalTags] = useState([]);
    
    // --- Master Data for Autocompletes ---
    const [countries, setCountries] = useState([]);
    const [lifeStages, setLifeStages] = useState([]);
    const [preservations, setPreservations] = useState([]);
    const [collectionMethods, setCollectionMethods] = useState([]);
    const [sequenceTypes, setSequenceTypes] = useState([]);
    const [allEcologicalTags, setAllEcologicalTags] = useState([]);

    // --- Sub-Dialog Controls ---
    const [showAddPublication, setShowAddPublication] = useState(false);
    const [showAddTaxon, setShowAddTaxon] = useState(false);
    const [showAddCollector, setShowAddCollector] = useState(false);

    // --- Coordinate State ---
    const [latitudeFormat, setLatitudeFormat] = useState("decimal");
    const [longitudeFormat, setLongitudeFormat] = useState("decimal");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [latitudeDMS, setLatitudeDMS] = useState({ deg: "", min: "", sec: "", dir: "N" });
    const [longitudeDMS, setLongitudeDMS] = useState({ deg: "", min: "", sec: "", dir: "E" });


    // --- Handlers ---
    const handleChange = useCallback((field, value) => {
        setRecord(prev => ({ ...prev, [field]: value === '' ? null : value }));
    }, []);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                countriesRes, lifeStagesRes, preservationsRes,
                collectionMethodsRes, sequenceTypesRes, ecoTagsRes
            ] = await Promise.all([
                supabase.from("countries").select("id").order("id"),
                supabase.from("life_stages").select("id").order("id"),
                supabase.from("preservation_methods").select("id").order("id"),
                supabase.from("collection_methods").select("id").order("id"),
                supabase.from("sequence_types").select("id").order("id"),
                supabase.from("ecological_tags").select("id").order("id"),
            ]);

            setCountries(countriesRes.data?.map(c => c.id) || []);
            setLifeStages(lifeStagesRes.data?.map(ls => ls.id) || []);
            setPreservations(preservationsRes.data?.map(p => p.id) || []);
            setCollectionMethods(collectionMethodsRes.data?.map(cm => cm.id) || []);
            setSequenceTypes(sequenceTypesRes.data?.map(st => st.id) || []);
            setAllEcologicalTags(ecoTagsRes.data?.map(et => et.id) || []);

            if (mode !== "add" && recordId) {
                const { data: existingRecord, error } = await supabase
                    .from("bionomic_records")
                    .select(`*, bionomics_data_and_collector(collector_order, researchers(*)), bionomics_sequences(*), bionomics_ecological_tags(ecological_tags(*))`)
                    .eq("id", recordId)
                    .single();
                if (error) throw error;
                
                setRecord(existingRecord);
                setInitialRecordState(existingRecord); // For audit log

                const collectors = existingRecord.bionomics_data_and_collector
                    .sort((a, b) => a.collector_order - b.collector_order)
                    .map(item => item.researchers);
                setSelectedCollectors(collectors);

                const sequences = existingRecord.bionomics_sequences.length > 0
                    ? existingRecord.bionomics_sequences
                    : [{ sequence_type_id: "", accession: "" }];
                setMolecularData(sequences);
                
                const tags = existingRecord.bionomics_ecological_tags.map(t => t.ecological_tags.id);
                setEcologicalTags(tags);
                
                setLatitude(existingRecord.latitude || "");
                setLongitude(existingRecord.longitude || "");
            }
        } catch (err) {
            console.error("Error fetching initial data:", err);
            alert("Failed to load data. Please check the console.");
        } finally {
            setLoading(false);
        }
    }, [mode, recordId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Coordinate conversion
            const finalLatitude = latitudeFormat === 'dms' ? dmsToDecimal(latitudeDMS.deg, latitudeDMS.min, latitudeDMS.sec, latitudeDMS.dir) : (parseFloat(latitude) || null);
            const finalLongitude = longitudeFormat === 'dms' ? dmsToDecimal(longitudeDMS.deg, longitudeDMS.min, longitudeDMS.sec, longitudeDMS.dir) : (parseFloat(longitude) || null);

            const payload = { ...record, latitude: finalLatitude, longitude: finalLongitude };
            // Remove junction table data from payload
            delete payload.bionomics_data_and_collector;
            delete payload.bionomics_sequences;
            delete payload.bionomics_ecological_tags;

            let recordIdToUpdate = recordId;
            let action = "UPDATE";

            if (mode === 'add') {
                action = "INSERT";
                const { data: newRecord, error } = await supabase
                    .from('bionomic_records')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                recordIdToUpdate = newRecord.id;
            } else {
                const { error } = await supabase
                    .from('bionomic_records')
                    .update(payload)
                    .eq('id', recordIdToUpdate);
                if (error) throw error;
            }

            // Update M2M tables
            // Collectors
            await supabase.from('bionomics_data_and_collector').delete().eq('bionomics_id', recordIdToUpdate);
            if (selectedCollectors.length > 0) {
                const collectorLinks = selectedCollectors.map((c, i) => ({ bionomics_id: recordIdToUpdate, collector_id: c.id, collector_order: i + 1 }));
                const { error } = await supabase.from('bionomics_data_and_collector').insert(collectorLinks);
                if (error) throw error;
            }

            // Molecular Data
            await supabase.from('bionomics_sequences').delete().eq('bionomics_id', recordIdToUpdate);
            const validMolecularData = molecularData.filter(m => m.sequence_type_id && m.accession);
            if (validMolecularData.length > 0) {
                const sequenceLinks = validMolecularData.map(m => ({ bionomics_id: recordIdToUpdate, ...m }));
                const { error } = await supabase.from('bionomics_sequences').insert(sequenceLinks);
                if (error) throw error;
            }
            
            // Ecological Tags
            await supabase.from('bionomics_ecological_tags').delete().eq('bionomics_id', recordIdToUpdate);
            if(ecologicalTags.length > 0) {
                const tagLinks = ecologicalTags.map(tagId => ({bionomics_id: recordIdToUpdate, ecological_tag_id: tagId}));
                const {error} = await supabase.from('bionomics_ecological_tags').insert(tagLinks);
                if(error) throw error;
            }
            
            // Audit Log
            setAuditLogProps({
                tableName: "bionomic_records",
                rowId: recordIdToUpdate,
                action: action,
                beforeData: mode === 'add' ? null : initialRecordState,
                afterData: payload,
                onComplete: () => {
                    alert('Record saved successfully!');
                    onClose(true);
                }
            });

        } catch (error) {
            console.error('Save error:', error);
            alert(`Error saving record: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
        setSaving(true);
        try {
            await supabase.from('bionomics_data_and_collector').delete().eq('bionomics_id', recordId);
            await supabase.from('bionomics_sequences').delete().eq('bionomics_id', recordId);
            await supabase.from('bionomics_ecological_tags').delete().eq('bionomics_id', recordId);
            const { error } = await supabase.from('bionomic_records').delete().eq('id', recordId);
            if (error) throw error;
            
            setAuditLogProps({
                tableName: "bionomic_records",
                rowId: recordId,
                action: "DELETE",
                beforeData: initialRecordState,
                afterData: null,
                onComplete: () => {
                    alert('Record deleted successfully!');
                    onClose(true);
                }
            });

        } catch (error) {
            alert(`Error deleting record: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };
    
    // --- Molecular Data Handlers ---
    const handleMolecularDataChange = (index, field, value) => {
        const newData = [...molecularData];
        newData[index][field] = value;
        setMolecularData(newData);
    };
    const addMolecularDataRow = () => setMolecularData([...molecularData, { sequence_type_id: "", accession: "" }]);
    const removeMolecularDataRow = (index) => setMolecularData(molecularData.filter((_, i) => i !== index));

    // --- Collector Drag & Drop ---
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(selectedCollectors);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSelectedCollectors(items);
    };

    if (loading) return <LoadingScreen message="Loading specimen data..." />;
    if (auditLogProps) return <AuditLogUpdater {...auditLogProps} />;


    return (
        <>
            <Dialog open onClose={() => onClose(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {mode === 'add' ? 'Add Specimen Record' : `Edit Specimen Record (ID: ${recordId})`}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>

                        {/* --- Source Section --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Source Publication</Typography>
                            <PublicationSelector value={record.publication_id} onChange={(value) => handleChange('publication_id', value)} />
                        </Box>
                        <Divider />

                        {/* --- Identification Section --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Identification</Typography>
                            <ScientificNameSelector label="Original Identification" value={record.original_taxon_id} onChange={(value) => handleChange('original_taxon_id', value)} />
                            <TextField label="Original ID Remarks" value={record.original_identification_remarks || ''} onChange={(e) => handleChange('original_identification_remarks', e.target.value)} fullWidth margin="dense" />
                            <ScientificNameSelector label="Latest Identification" value={record.latest_taxon_id} onChange={(value) => handleChange('latest_taxon_id', value)} />
                            <TextField label="Latest ID Remarks" value={record.latest_identification_remarks || ''} onChange={(e) => handleChange('latest_identification_remarks', e.target.value)} fullWidth margin="dense" />
                        </Box>
                        <Divider />

                        {/* --- Locality Section --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Locality</Typography>
                            <Autocomplete options={countries} value={record.country_id || null} onChange={(e, v) => handleChange('country_id', v)} renderInput={(params) => <TextField {...params} label="Country" margin="dense" fullWidth />} />
                            <TextField label="State/Province" value={record.state_province || ''} onChange={(e) => handleChange('state_province', e.target.value)} fullWidth margin="dense" />
                            <TextField label="City/District" value={record.city || ''} onChange={(e) => handleChange('city', e.target.value)} fullWidth margin="dense" />
                            <TextField label="Detailed Locality" value={record.locality_detail || ''} onChange={(e) => handleChange('locality_detail', e.target.value)} fullWidth margin="dense" multiline rows={2} />
                        </Box>

                        {/* --- Coordinates --- */}
                        <Box>
                             <Typography variant="h6" gutterBottom>Coordinates</Typography>
                             <Stack direction="row" spacing={2}>
                                 <Stack spacing={1} flex={1}>
                                     <TextField select label="Lat Format" value={latitudeFormat} onChange={(e) => setLatitudeFormat(e.target.value)} margin="dense">
                                         <MenuItem value="decimal">Decimal</MenuItem>
                                         <MenuItem value="dms">DMS</MenuItem>
                                     </TextField>
                                     {latitudeFormat === 'decimal' ? (
                                         <TextField label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} fullWidth margin="dense" />
                                     ) : (
                                         <Stack direction="row" spacing={1}>
                                             <TextField label="Deg" value={latitudeDMS.deg} onChange={e => setLatitudeDMS({...latitudeDMS, deg: e.target.value})} sx={{width: '25%'}}/>
                                             <TextField label="Min" value={latitudeDMS.min} onChange={e => setLatitudeDMS({...latitudeDMS, min: e.target.value})} sx={{width: '25%'}}/>
                                             <TextField label="Sec" value={latitudeDMS.sec} onChange={e => setLatitudeDMS({...latitudeDMS, sec: e.target.value})} sx={{width: '25%'}}/>
                                             <TextField select label="Dir" value={latitudeDMS.dir} onChange={e => setLatitudeDMS({...latitudeDMS, dir: e.target.value})} sx={{width: '25%'}}>
                                                 <MenuItem value="N">N</MenuItem>
                                                 <MenuItem value="S">S</MenuItem>
                                             </TextField>
                                         </Stack>
                                     )}
                                 </Stack>
                                 <Stack spacing={1} flex={1}>
                                     <TextField select label="Lon Format" value={longitudeFormat} onChange={(e) => setLongitudeFormat(e.target.value)} margin="dense">
                                         <MenuItem value="decimal">Decimal</MenuItem>
                                         <MenuItem value="dms">DMS</MenuItem>
                                     </TextField>
                                     {longitudeFormat === 'decimal' ? (
                                         <TextField label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} fullWidth margin="dense" />
                                     ) : (
                                        <Stack direction="row" spacing={1}>
                                            <TextField label="Deg" value={longitudeDMS.deg} onChange={e => setLongitudeDMS({...longitudeDMS, deg: e.target.value})} sx={{width: '25%'}}/>
                                            <TextField label="Min" value={longitudeDMS.min} onChange={e => setLongitudeDMS({...longitudeDMS, min: e.target.value})} sx={{width: '25%'}}/>
                                            <TextField label="Sec" value={longitudeDMS.sec} onChange={e => setLongitudeDMS({...longitudeDMS, sec: e.target.value})} sx={{width: '25%'}}/>
                                            <TextField select label="Dir" value={longitudeDMS.dir} onChange={e => setLongitudeDMS({...longitudeDMS, dir: e.target.value})} sx={{width: '25%'}}>
                                                <MenuItem value="E">E</MenuItem>
                                                <MenuItem value="W">W</MenuItem>
                                            </TextField>
                                        </Stack>
                                     )}
                                 </Stack>
                             </Stack>
                        </Box>
                        <Divider />

                        {/* --- Specimen Condition --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Specimen Details</Typography>
                            <Stack direction="row" spacing={2}>
                                <TextField label="Male Count" type="number" value={record.specimen_count_male || ''} onChange={(e) => handleChange('specimen_count_male', e.target.value)} fullWidth margin="dense" />
                                <TextField label="Female Count" type="number" value={record.specimen_count_female || ''} onChange={(e) => handleChange('specimen_count_female', e.target.value)} fullWidth margin="dense" />
                            </Stack>
                            <Autocomplete options={lifeStages} value={record.life_stage || null} onChange={(e, v) => handleChange('life_stage', v)} renderInput={(params) => <TextField {...params} label="Life Stage" margin="dense" fullWidth />} />
                            <Autocomplete options={preservations} value={record.preservation_method || null} onChange={(e, v) => handleChange('preservation_method', v)} renderInput={(params) => <TextField {...params} label="Preservation Method" margin="dense" fullWidth />} />
                        </Box>
                        <Divider />

                        {/* --- Collection Section --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Collection Details</Typography>
                            <TextField label="Collection Date" type="date" InputLabelProps={{ shrink: true }} value={record.collection_date || ''} onChange={(e) => handleChange('collection_date', e.target.value)} fullWidth margin="dense" />
                            <Autocomplete options={collectionMethods} value={record.collection_method_id || null} onChange={(e, v) => handleChange('collection_method_id', v)} renderInput={(params) => <TextField {...params} label="Collection Method" margin="dense" fullWidth />} />
                            <ResearcherSelector label="Add Collector" onChange={(authorId) => {
                                if(authorId && !selectedCollectors.some(c => c.id === authorId)) {
                                    supabase.from('researchers').select('*').eq('id', authorId).single().then(({data}) => {
                                        if (data) setSelectedCollectors(prev => [...prev, data]);
                                    })
                                }
                            }} />
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="collectors">
                                    {(provided) => (
                                        <Box {...provided.droppableProps} ref={provided.innerRef} sx={{p: 1, mt: 1, border: '1px dashed grey', borderRadius: 1}}>
                                            {selectedCollectors.map((c, i) => (
                                                <Draggable key={c.id} draggableId={c.id.toString()} index={i}>
                                                    {(provided) => (
                                                        <Chip
                                                            ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                            label={`${c.last_name_eng}, ${c.first_name_eng}`}
                                                            onDelete={() => setSelectedCollectors(prev => prev.filter(p => p.id !== c.id))}
                                                            sx={{m: 0.5}}
                                                        />
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </Box>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </Box>
                        <Divider />

                        {/* --- Repository --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Depository</Typography>
                            <RepositorySelector value={record.depository_id} onChange={(v) => handleChange('depository_id', v)} />
                        </Box>
                        <Divider />
                        
                        {/* --- Ecology --- */}
                         <Box>
                            <Typography variant="h6" gutterBottom>Ecology</Typography>
                            <ScientificNameSelector label="Host" value={record.host_id} onChange={(v) => handleChange('host_id', v)} />
                            <Autocomplete multiple options={allEcologicalTags} value={ecologicalTags} onChange={(e, v) => setEcologicalTags(v)} renderInput={(params) => <TextField {...params} label="Ecological Tags" margin="dense" fullWidth />} />
                            <TextField label="Ecology Notes" value={record.ecology_note || ''} onChange={(e) => handleChange('ecology_note', e.target.value)} fullWidth margin="dense" multiline rows={3}/>
                        </Box>
                        <Divider />

                        {/* --- Molecular Data --- */}
                        <Box>
                            <Typography variant="h6" gutterBottom>Molecular Data</Typography>
                            {molecularData.map((data, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{mb: 1}}>
                                    <Autocomplete options={sequenceTypes} value={data.sequence_type_id} onChange={(e, v) => handleMolecularDataChange(index, 'sequence_type_id', v)} sx={{flex: 1}} renderInput={(params) => <TextField {...params} label="Sequence Type" />} />
                                    <TextField label="Accession Number" value={data.accession} onChange={(e) => handleMolecularDataChange(index, 'accession', e.target.value)} sx={{flex: 2}}/>
                                    <IconButton onClick={() => removeMolecularDataRow(index)}><DeleteIcon /></IconButton>
                                </Stack>
                            ))}
                            <Button onClick={addMolecularDataRow} startIcon={<AddIcon />}>Add Sequence</Button>
                        </Box>
                        <Divider />
                        
                        {/* --- Remarks --- */}
                         <Box>
                             <Typography variant="h6" gutterBottom>Remarks</Typography>
                             <TextField label="General Remarks" value={record.remarks || ''} onChange={(e) => handleChange('remarks', e.target.value)} fullWidth margin="dense" multiline rows={4}/>
                         </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    {mode === 'edit' && <Button onClick={handleDelete} color="error" variant="outlined" disabled={saving}>Delete</Button>}
                    <Box>
                        <Button onClick={() => onClose(false)} color="secondary">Cancel</Button>
                        <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ml: 1}}>
                            {saving ? 'Saving...' : (mode === 'add' ? 'Add Record' : 'Save Changes')}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* --- Sub-dialogs --- */}
            {showAddPublication && <DialogPublicationAdd open onClose={(shouldRefresh) => { setShowAddPublication(false); if(shouldRefresh) fetchInitialData(); }} />}
            {showAddTaxon && <DialogScientificNameAdd open onClose={(shouldRefresh) => { setShowAddTaxon(false); if(shouldRefresh) fetchInitialData(); }} />}
            {showAddCollector && <DialogResearcher open onClose={(shouldRefresh) => { setShowAddCollector(false); if(shouldRefresh) fetchInitialData(); }} />}
        </>
    );
}