// DialogBionomicRecordAdd.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Button,
  MenuItem,
  TextField,
  Typography,
  Autocomplete,
  Stack,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import supabase from "../../../../utils/supabase"; // ←パスはプロジェクト構成に合わせて修正
import fetchSupabaseAllWithOrdering from "../../../../utils/fetchSupabaseAllWithOrdering";

/**
 * bionomic_records テーブルに新規レコードを追加するダイアログ
 * - distributionカラム(JSONB, 複数の分布情報)
 * - 生態データ用のhost_taxon_id / other_related_taxon_id
 * - 緯度経度のdecimal/DMS入力切替
 * - Data Origin / Reliability / Verification Status の追加
 */
export default function DialogBionomicRecordAdd({ open, onClose }) {

  // メインフォームの状態
  const [form, setForm] = useState({
    source_publication: null,
    page_start: "",
    page_end: "",
    target_taxa_id: "",
    data_type: "",
    ecological_tags: [],
    host_taxon_id: "",
    other_related_taxon_id: "",
    remark: "",
    // ここから: distribution を配列で管理
    distribution: [],
    // Data Origin / Reliability / Verification
    data_origin_id: "",
    reliability_id: "",
    verification_status_id: "",
  });
  const [loading, setLoading] = useState(false);

  // 各種選択肢マスター
  const [countries, setCountries] = useState([]);
  const [scientificNames, setScientificNames] = useState([]);
  const [publications, setPublications] = useState([]);
  const [allEcologicalTags, setAllEcologicalTags] = useState([]);

  // Data Origin & Reliability & Verification
  const [dataOrigins, setDataOrigins] = useState([]);
  const [reliabilities, setReliabilities] = useState([]);
  const [verificationStatuses, setVerificationStatuses] = useState([]);

  // 分布情報サブダイアログの状態
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [distributionEditIndex, setDistributionEditIndex] = useState(null);

  // 分布情報サブダイアログの一時状態
  // latFormat/lonFormat === 'decimal' / 'dms'
  const [tempDistribution, setTempDistribution] = useState({
    country: "",
    state: "",
    city: "",
    detail: "",
    latFormat: "decimal",
    lonFormat: "decimal",
    latDecimal: "",
    lonDecimal: "",
    latDMS: { deg: "", min: "", sec: "", dir: "N" },
    lonDMS: { deg: "", min: "", sec: "", dir: "E" },
  });

  // -------------------------------------------
  // useEffectでダイアログOPEN時に初期化＆マスター取得
  // -------------------------------------------
  useEffect(() => {
    if (open) {
      // フォーム初期化
      setForm({
        source_publication: null,
        page_start: "",
        page_end: "",
        target_taxa_id: "",
        data_type: "",
        ecological_tags: [],
        host_taxon_id: "",
        other_related_taxon_id: "",
        remark: "",
        distribution: [],
        data_origin_id: "",
        reliability_id: "",
        verification_status_id: "",
      });
      fetchSelectOptions();
    }
  }, [open]);

  // -------------------------------------------
  // マスター選択肢をまとめてロード
  // -------------------------------------------
  const fetchSelectOptions = async () => {
    try {
      const snRes = await fetchSupabaseAllWithOrdering({
        tableName: "scientific_names",
        selectQuery: `id`,
        orderOptions: [{ column: "id" }]
      });
      if (snRes.error) console.error(snRes.error);
      else setScientificNames(snRes || [])

      const [cRes, pubRes, ecoRes, doRes, reRes, vsRes] = await Promise.all([
        supabase.from("countries").select("*").order("geojson_name", { ascending: true }),
        supabase.from("publications").select("id, title_english").order("id"),
        supabase.from("ecological_tags").select("id, name").order("name", { ascending: true }),
        supabase.from("data_origins").select("id, name").order("id", { ascending: true }), // 必要なければ削除
        supabase.from("data_reliabilities").select("id, name").order("id", { ascending: true }), // 必要なければ削除
        supabase.from("verification_statuses").select("id, name").order("id", { ascending: true }), // 必要なければ削除
      ]);

      if (cRes.error) console.error(cRes.error);
      else setCountries(cRes.data || []);

      if (pubRes.error) console.error(pubRes.error);
      else setPublications(pubRes.data || []);

      if (ecoRes.error) console.error(ecoRes.error);
      else setAllEcologicalTags(ecoRes.data || []);

      if (doRes.error) console.error(doRes.error);
      else setDataOrigins(doRes.data || []);

      if (reRes.error) console.error(reRes.error);
      else setReliabilities(reRes.data || []);

      if (vsRes.error) console.error(vsRes.error);
      else setVerificationStatuses(vsRes.data || []);
    } catch (err) {
      console.error("Error in fetchSelectOptions:", err);
      alert("Error loading data. Check console for details.");
    }
  };

  // -------------------------------------------
  // フォーム更新 (共通ハンドラ)
  // -------------------------------------------
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------
  // データ保存(メインダイアログのSave)
  // -------------------------------------------
  const handleSave = async () => {
    // 必須チェック
    if (!form.target_taxa_id || !form.data_type) {
      alert("Required fields are missing (at least target_taxa_id & data_type).");
      return;
    }

    setLoading(true);
    try {
      // Ecological Tags はID配列化
      const ecologicalTagIds = form.ecological_tags.map((tag) => tag.id);

      // Insert用オブジェクト
      const insertData = {
        source_publication_id: form.source_publication?.id || null,
        page_start: form.page_start ? parseInt(form.page_start, 10) : null,
        page_end: form.page_end ? parseInt(form.page_end, 10) : null,
        target_taxa_id: form.target_taxa_id.trim(),
        data_type: form.data_type.trim(),
        ecological_tags: ecologicalTagIds.length > 0 ? ecologicalTagIds : null,
        remark: form.remark?.trim() || null,
        host_taxon_id: form.host_taxon_id ? form.host_taxon_id.trim() : null,
        other_related_taxon_id: form.other_related_taxon_id ? form.other_related_taxon_id.trim() : null,

        // Distribution (配列のまま保存)
        distribution: form.distribution && form.distribution.length > 0 ? form.distribution : null,

        // Data Origin / Reliability / Verification
        data_origin_id: form.data_origin_id || null,
        reliability_id: form.reliability_id || null,
        verification_status_id: form.verification_status_id || null,
      };

      const { error } = await supabase.from("bionomic_records").insert([insertData]);
      if (error) {
        console.error("Insert failed:", error);
        alert("Failed to add bionomic record. Check console.");
      } else {
        alert("Bionomic record added successfully!");
        // 成功時はダイアログを閉じる
        onClose(true);
      }
    } catch (err) {
      console.error("Error adding bionomic record:", err);
      alert("Error adding bionomic record. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // Distribution サブダイアログ関連
  // -------------------------------------------
  // 分布情報の「新規追加」ボタン
  const handleAddDistribution = () => {
    setDistributionEditIndex(null);
    setTempDistribution({
      country: "",
      state: "",
      city: "",
      detail: "",
      latFormat: "decimal",
      lonFormat: "decimal",
      latDecimal: "",
      lonDecimal: "",
      latDMS: { deg: "", min: "", sec: "", dir: "N" },
      lonDMS: { deg: "", min: "", sec: "", dir: "E" },
    });
    setDistributionDialogOpen(true);
  };

  // 分布情報の「編集」ボタン
  const handleEditDistribution = (index) => {
    setDistributionEditIndex(index);

    const distItem = form.distribution[index];

    // 既存のlatitude/longitudeはdecimalとして保持している想定なので、
    // 初期表示時は decimalをセットし、DMSは空にする
    const latDecimalStr = distItem.latitude?.toString() || "";
    const lonDecimalStr = distItem.longitude?.toString() || "";

    setTempDistribution({
      country: distItem.country || "",
      state: distItem.state || "",
      city: distItem.city || "",
      detail: distItem.detail || "",
      latFormat: "decimal",
      lonFormat: "decimal",
      latDecimal: latDecimalStr,
      lonDecimal: lonDecimalStr,
      latDMS: { deg: "", min: "", sec: "", dir: "N" },
      lonDMS: { deg: "", min: "", sec: "", dir: "E" },
    });

    setDistributionDialogOpen(true);
  };

  // 分布情報の「削除」ボタン
  const handleDeleteDistribution = (index) => {
    const newDist = [...form.distribution];
    newDist.splice(index, 1);
    handleChange("distribution", newDist);
  };

  // DMS→Decimal変換ユーティリティ
  function dmsToDecimal({ deg, min, sec, dir }) {
    const d = parseFloat(deg) || 0;
    const m = parseFloat(min) || 0;
    const s = parseFloat(sec) || 0;
    let decimal = Math.abs(d) + m / 60 + s / 3600;
    if (dir === "S" || dir === "W") {
      decimal = -decimal;
    }
    return decimal;
  }

  // サブダイアログの「Save」ボタン
  const handleDistributionDialogSave = () => {
    let finalLat = null;
    let finalLon = null;

    // latFormatが"decimal"ならlatDecimalをparse、"dms"ならdmsToDecimal
    if (tempDistribution.latFormat === "decimal") {
      finalLat = tempDistribution.latDecimal
        ? parseFloat(tempDistribution.latDecimal)
        : null;
    } else {
      // dms
      finalLat = dmsToDecimal(tempDistribution.latDMS);
    }

    if (tempDistribution.lonFormat === "decimal") {
      finalLon = tempDistribution.lonDecimal
        ? parseFloat(tempDistribution.lonDecimal)
        : null;
    } else {
      // dms
      finalLon = dmsToDecimal(tempDistribution.lonDMS);
    }

    // distributionオブジェクトを作り直して格納
    const newDistItem = {
      country: tempDistribution.country.trim() || "",
      state: tempDistribution.state.trim() || "",
      city: tempDistribution.city.trim() || "",
      detail: tempDistribution.detail.trim() || "",
      latitude: finalLat,
      longitude: finalLon,
    };

    let newDist = [...form.distribution];
    if (distributionEditIndex == null) {
      // 新規追加
      newDist.push(newDistItem);
    } else {
      // 既存編集
      newDist[distributionEditIndex] = newDistItem;
    }
    handleChange("distribution", newDist);
    setDistributionDialogOpen(false);
  };

  // -------------------------------------------
  // レンダリング開始
  // -------------------------------------------
  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
      <DialogTitle>Add Bionomic Record</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* ---------- Source & Target Taxa ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Source and Target Taxa
          </Typography>

          {/* 論文 */}
          <Autocomplete
            options={publications}
            getOptionLabel={(option) =>
              option.title_english ? `${option.id} - ${option.title_english}` : option.id
            }
            value={form.source_publication}
            onChange={(e, newVal) => handleChange("source_publication", newVal)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Source Publication"
                variant="outlined"
                placeholder="Select or type..."
              />
            )}
          />

          {/* ページ情報 */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Page Start"
              value={form.page_start}
              onChange={(e) => handleChange("page_start", e.target.value)}
              variant="outlined"
              type="number"
            />
            <TextField
              label="Page End"
              value={form.page_end}
              onChange={(e) => handleChange("page_end", e.target.value)}
              variant="outlined"
              type="number"
            />
          </Stack>

          {/* ターゲット学名 (required) */}
          <Autocomplete
            options={scientificNames.map((sn) => sn.id)}
            value={form.target_taxa_id}
            onChange={(e, v) => handleChange("target_taxa_id", v || "")}
            renderInput={(params) => (
              <TextField {...params} label="Target Taxon ID (Required)" variant="outlined" />
            )}
          />

          <Divider sx={{ my: 2 }} />

          {/* ---------- Data Type (radio) ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Data Type
          </Typography>
          <FormControl component="fieldset">
            <FormLabel component="legend">Data Type (Required)</FormLabel>
            <RadioGroup
              row
              value={form.data_type}
              onChange={(e) => handleChange("data_type", e.target.value)}
            >
              <FormControlLabel value="distribution" control={<Radio />} label="Distribution" />
              <FormControlLabel value="ecology" control={<Radio />} label="Ecology" />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* ---------- Distribution ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Distribution
          </Typography>
          <Button variant="outlined" onClick={handleAddDistribution}>
            Add Distribution Data
          </Button>

          {/* 分布一覧表示テーブル */}
          {form.distribution && form.distribution.length > 0 && (
            <Table size="small" sx={{ mt: 2, border: "1px solid #ccc" }}>
              <TableHead>
                <TableRow>
                  <TableCell>Country</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell>Latitude</TableCell>
                  <TableCell>Longitude</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.distribution.map((dist, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{dist.country}</TableCell>
                    <TableCell>{dist.state}</TableCell>
                    <TableCell>{dist.city}</TableCell>
                    <TableCell>{dist.detail}</TableCell>
                    <TableCell>{dist.latitude}</TableCell>
                    <TableCell>{dist.longitude}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEditDistribution(idx)}>
                        <EditIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDistribution(idx)}
                      >
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Divider sx={{ my: 2 }} />

          {/* ---------- Ecological Data ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Ecological Data
          </Typography>

          {/* Host Taxon */}
          <Autocomplete
            options={scientificNames.map((sn) => sn.id)}
            value={form.host_taxon_id}
            onChange={(e, v) => handleChange("host_taxon_id", v || "")}
            renderInput={(params) => (
              <TextField {...params} label="Host Taxon ID" variant="outlined" />
            )}
          />

          {/* Other Related Taxon */}
          <Autocomplete
            options={scientificNames.map((sn) => sn.id)}
            value={form.other_related_taxon_id}
            onChange={(e, v) => handleChange("other_related_taxon_id", v || "")}
            renderInput={(params) => (
              <TextField {...params} label="Other Related Taxon ID" variant="outlined" />
            )}
          />

          {/* Ecological Tags (複数選択) */}
          <Autocomplete
            multiple
            options={allEcologicalTags}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={form.ecological_tags}
            onChange={(e, newVal) => handleChange("ecological_tags", newVal)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ecological Tags"
                variant="outlined"
                placeholder="Select ecological tags..."
              />
            )}
          />

          <Divider sx={{ my: 2 }} />

          {/* ---------- Data Origin / Reliability ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Data Origin and Reliability
          </Typography>
          <Stack direction="row" spacing={2}>
            {/* Data Origin */}
            <TextField
              select
              fullWidth
              label="Data Origin"
              value={form.data_origin_id}
              onChange={(e) => handleChange("data_origin_id", e.target.value)}
            >
              <MenuItem value="">(None)</MenuItem>
              {dataOrigins.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Reliability */}
            <TextField
              select
              fullWidth
              label="Reliability"
              value={form.reliability_id}
              onChange={(e) => handleChange("reliability_id", e.target.value)}
            >
              <MenuItem value="">(None)</MenuItem>
              {reliabilities.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Verification Status */}
            <TextField
              select
              fullWidth
              label="Verification Status"
              value={form.verification_status_id}
              onChange={(e) => handleChange("verification_status_id", e.target.value)}
            >
              <MenuItem value="">(None)</MenuItem>
              {verificationStatuses.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* ---------- Remarks ---------- */}
          <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>
            Remarks
          </Typography>
          <TextField
            label="Remark"
            value={form.remark}
            onChange={(e) => handleChange("remark", e.target.value)}
            variant="outlined"
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>

      {/* ---- ダイアログのアクションボタン ---- */}
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>

      {/* ----------------------------------------------------
         分布情報(Distribution)の追加/編集用サブダイアログ
      ---------------------------------------------------- */}
      <Dialog
        open={distributionDialogOpen}
        onClose={() => setDistributionDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {distributionEditIndex == null ? "Add Distribution" : "Edit Distribution"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Country */}
            <Autocomplete
              options={countries}
              getOptionLabel={(c) => c.id || ""}
              value={
                tempDistribution.country
                  ? countries.find((cn) => cn.id === tempDistribution.country) || null
                  : null
              }
              onChange={(e, val) =>
                setTempDistribution((prev) => ({
                  ...prev,
                  country: val ? val.id : "",
                }))
              }
              renderInput={(params) => <TextField {...params} label="Country" variant="outlined" />}
            />

            {/* State/Pref */}
            <TextField
              label="State/Prefecture"
              variant="outlined"
              value={tempDistribution.state}
              onChange={(e) =>
                setTempDistribution((prev) => ({ ...prev, state: e.target.value }))
              }
            />

            {/* City */}
            <TextField
              label="City"
              variant="outlined"
              value={tempDistribution.city}
              onChange={(e) =>
                setTempDistribution((prev) => ({ ...prev, city: e.target.value }))
              }
            />

            {/* Detail */}
            <TextField
              label="Detail Locality"
              variant="outlined"
              value={tempDistribution.detail}
              onChange={(e) =>
                setTempDistribution((prev) => ({ ...prev, detail: e.target.value }))
              }
            />

            {/* Latitude Block */}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Lat Format"
                value={tempDistribution.latFormat}
                onChange={(e) =>
                  setTempDistribution((prev) => ({ ...prev, latFormat: e.target.value }))
                }
                sx={{ width: 120 }}
              >
                <MenuItem value="decimal">Decimal</MenuItem>
                <MenuItem value="dms">DMS</MenuItem>
              </TextField>

              {tempDistribution.latFormat === "decimal" ? (
                <TextField
                  label="Latitude (decimal)"
                  value={tempDistribution.latDecimal}
                  onChange={(e) =>
                    setTempDistribution((prev) => ({ ...prev, latDecimal: e.target.value }))
                  }
                  fullWidth
                />
              ) : (
                <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                  <TextField
                    label="Deg"
                    value={tempDistribution.latDMS.deg}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        latDMS: { ...prev.latDMS, deg: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    label="Min"
                    value={tempDistribution.latDMS.min}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        latDMS: { ...prev.latDMS, min: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    label="Sec"
                    value={tempDistribution.latDMS.sec}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        latDMS: { ...prev.latDMS, sec: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    select
                    label="Dir"
                    value={tempDistribution.latDMS.dir}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        latDMS: { ...prev.latDMS, dir: e.target.value },
                      }))
                    }
                    sx={{ width: "70px" }}
                  >
                    <MenuItem value="N">N</MenuItem>
                    <MenuItem value="S">S</MenuItem>
                  </TextField>
                </Stack>
              )}
            </Stack>

            {/* Longitude Block */}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Lon Format"
                value={tempDistribution.lonFormat}
                onChange={(e) =>
                  setTempDistribution((prev) => ({ ...prev, lonFormat: e.target.value }))
                }
                sx={{ width: 120 }}
              >
                <MenuItem value="decimal">Decimal</MenuItem>
                <MenuItem value="dms">DMS</MenuItem>
              </TextField>

              {tempDistribution.lonFormat === "decimal" ? (
                <TextField
                  label="Longitude (decimal)"
                  value={tempDistribution.lonDecimal}
                  onChange={(e) =>
                    setTempDistribution((prev) => ({ ...prev, lonDecimal: e.target.value }))
                  }
                  fullWidth
                />
              ) : (
                <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                  <TextField
                    label="Deg"
                    value={tempDistribution.lonDMS.deg}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        lonDMS: { ...prev.lonDMS, deg: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    label="Min"
                    value={tempDistribution.lonDMS.min}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        lonDMS: { ...prev.lonDMS, min: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    label="Sec"
                    value={tempDistribution.lonDMS.sec}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        lonDMS: { ...prev.lonDMS, sec: e.target.value },
                      }))
                    }
                    sx={{ width: "60px" }}
                  />
                  <TextField
                    select
                    label="Dir"
                    value={tempDistribution.lonDMS.dir}
                    onChange={(e) =>
                      setTempDistribution((prev) => ({
                        ...prev,
                        lonDMS: { ...prev.lonDMS, dir: e.target.value },
                      }))
                    }
                    sx={{ width: "70px" }}
                  >
                    <MenuItem value="E">E</MenuItem>
                    <MenuItem value="W">W</MenuItem>
                  </TextField>
                </Stack>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDistributionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDistributionDialogSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
