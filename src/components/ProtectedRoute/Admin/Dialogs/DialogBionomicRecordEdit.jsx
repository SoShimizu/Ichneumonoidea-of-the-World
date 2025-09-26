// DialogBionomicRecordEdit.jsx
import React, { useState, useEffect, useCallback } from "react";
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
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,                // 追加
  CircularProgress, // 追加
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import supabase from "../../../../utils/supabase"; // ← パスを確認・修正してください
import fetchSupabaseAllWithOrdering from "../../../../utils/fetchSupabaseAllWithOrdering";

/**
 * bionomic_records テーブルの既存レコードを編集するダイアログ
 */
export default function DialogBionomicRecordEdit({
  open,
  onClose,
  recordData,       // 既存のbionomic_records (1レコード)
  allPublications,  // Consoleから渡される全Publicationsリスト (props)
}) {
  // --- State Definitions ---
  const initialFormState = { // フォームの初期状態
    id: null,
    source_publication: null, // オブジェクト {id, title_english} or null
    page_start: "",
    page_end: "",
    target_taxa_id: "",       // ID (文字列)
    data_type: "",
    ecological_tags: [],       // オブジェクトの配列 [{id, name}]
    host_taxon_id: "",         // ID (文字列)
    other_related_taxon_id: "",// ID (文字列)
    remark: "",
    distribution: [],          // 配列 [{ country, state, ... }]
    data_origin_id: "",        // ID (文字列)
    reliability_id: "",        // ID (文字列)
    verification_status_id: "",// ID (文字列)
  };
  const [form, setForm] = useState(initialFormState);
  const [loadingSave, setLoadingSave] = useState(false); // 保存処理中のローディング
  const [loadingOptions, setLoadingOptions] = useState(true); // ★ 選択肢読み込み中のローディング

  // --- Master Data States ---
  const [countries, setCountries] = useState([]);
  const [scientificNames, setScientificNames] = useState([]); // { id: string } の配列
  const [allEcologicalTags, setAllEcologicalTags] = useState([]); // { id: string, name: string } の配列
  const [dataOrigins, setDataOrigins] = useState([]);
  const [reliabilities, setReliabilities] = useState([]);
  const [verificationStatuses, setVerificationStatuses] = useState([]);

  // --- Distribution Dialog States ---
  const initialTempDistributionState = { // Distributionサブダイアログの初期値
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
  };
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [distributionEditIndex, setDistributionEditIndex] = useState(null); // null: 新規追加, 数値: 編集対象index
  const [tempDistribution, setTempDistribution] = useState(initialTempDistributionState);


  // --- Initialize Form Function ---
  // マスターデータが読み込まれた後に呼び出される
  const initializeForm = useCallback((rec, loadedEcoTags, loadedPublications) => {
    if (!rec) return;

    // source_publication オブジェクトを検索
    let pubObj = null;
    if (rec.source_publication_id && loadedPublications) {
      // propsで渡されたリストからIDで検索
      pubObj = loadedPublications.find(p => p.id === rec.source_publication_id) || null;
    }

    // ecological_tags オブジェクトを検索・変換
    let ecoTags = [];
    if (Array.isArray(rec.ecological_tags) && loadedEcoTags) {
      ecoTags = rec.ecological_tags
        .map(tagOrId => {
          // 既にオブジェクト形式の場合
          if (typeof tagOrId === 'object' && tagOrId?.id && tagOrId?.name) return tagOrId;
          // ID の場合、マスターリストから検索
          if (typeof tagOrId === 'string' || typeof tagOrId === 'number') {
            return loadedEcoTags.find(et => et.id === tagOrId);
          }
          return null; // 不明な形式は無視
        })
        .filter(Boolean); // null を除去
    }

    setForm({
      id: rec.id,
      source_publication: pubObj, // Autocompleteがオブジェクトを受け取る
      page_start: rec.page_start ?? "", // nullish coalescing
      page_end: rec.page_end ?? "",
      target_taxa_id: rec.target_taxa_id ?? "", // ID文字列
      data_type: rec.data_type ?? "",
      ecological_tags: ecoTags, // Autocomplete (multiple) がオブジェクト配列を受け取る
      host_taxon_id: rec.host_taxon_id ?? "", // ID文字列
      other_related_taxon_id: rec.other_related_taxon_id ?? "", // ID文字列
      remark: rec.remark ?? "",
      distribution: Array.isArray(rec.distribution) ? rec.distribution : [], // 配列であることを保証
      data_origin_id: rec.data_origin_id ?? "", // ID文字列
      reliability_id: rec.reliability_id ?? "", // ID文字列
      verification_status_id: rec.verification_status_id ?? "", // ID文字列
    });
  }, []); // この関数自体は外部のstateに依存しない


  // --- Fetch Master Data Function ---
  const fetchSelectOptions = useCallback(async () => {
    try {
      // Promise.allで関連データを並行取得
      const snRes = await fetchSupabaseAllWithOrdering({
              tableName: "scientific_names",
              selectQuery: `id`,
              orderOptions: [{ column: "id" }]
      });
      const [cRes, ecoRes, doRes, reRes, vsRes] = await Promise.all([
        supabase.from("countries").select("*").order("id", { ascending: true }),
        supabase.from("ecological_tags").select("id, name").order("name", { ascending: true }),
        supabase.from("data_origins").select("id, name").order("id", { ascending: true }),
        supabase.from("data_reliabilities").select("id, name").order("id", { ascending: true }),
        supabase.from("verification_statuses").select("id, name").order("id", { ascending: true }),
      ]);

      // エラーチェックと State 更新 (エラーがあっても処理は続行)
      if (cRes.error) console.error("Error fetching countries:", cRes.error.message);
      else setCountries(cRes.data || []);
      if (snRes.error) console.error("Error fetching scientific_names:", snRes.error.message);
      else setScientificNames(snRes.data || []);
      if (ecoRes.error) console.error("Error fetching ecological_tags:", ecoRes.error.message);
      else setAllEcologicalTags(ecoRes.data || []);
      if (doRes.error) console.error("Error fetching data_origins:", doRes.error.message);
      else setDataOrigins(doRes.data || []);
      if (reRes.error) console.error("Error fetching data_reliabilities:", reRes.error.message);
      else setReliabilities(reRes.data || []);
      if (vsRes.error) console.error("Error fetching verification_statuses:", vsRes.error.message);
      else setVerificationStatuses(vsRes.data || []);

      // ★ initializeForm で使う ecological_tags データを返す
      return { loadedEcoTags: ecoRes.data || [] };

    } catch (error) {
      console.error("Error in fetchSelectOptions:", error);
      alert("Error loading select options. Check console.");
      return null; // エラー発生を示す
    }
  }, []); // 依存配列は空


  // --- Effect for Initial Data Loading and Form Initialization ---
  useEffect(() => {
    // ダイアログが開かれ、編集対象のデータがある場合に実行
    if (open && recordData) {
      setLoadingOptions(true);    // ★ ローディング開始
      setForm(initialFormState);  // フォームを一旦リセット
      setLoadingSave(false);      // 保存ボタンのローディングもリセット
      setDistributionDialogOpen(false); // サブダイアログも閉じる
      setTempDistribution(initialTempDistributionState); // サブダイアログのstateもリセット

      // 非同期でマスターデータを読み込み、完了後にフォームを初期化
      const loadAndInitialize = async () => {
        const loadedData = await fetchSelectOptions();
        // fetchSelectOptionsが成功した場合のみ初期化を実行
        if (loadedData) {
          // allPublications は props から渡ってきたものを使用
          initializeForm(recordData, loadedData.loadedEcoTags, allPublications || []);
        }
        setLoadingOptions(false); // ★ ローディング完了
      };
      loadAndInitialize();

    } else if (!open) {
      // ダイアログが閉じられたらStateをリセット (任意だが推奨)
      setForm(initialFormState);
      setCountries([]);
      setScientificNames([]);
      setAllEcologicalTags([]);
      setDataOrigins([]);
      setReliabilities([]);
      setVerificationStatuses([]);
      setLoadingOptions(true); // 次回開くときのために true に戻す
    }
  }, [open, recordData, fetchSelectOptions, initializeForm, allPublications]); // 依存配列


  // --- Common Form Handler ---
  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);


  // --- Save (UPDATE) Function ---
  const handleSave = useCallback(async () => {
    if (!form.id) {
      alert("Record ID is missing. Cannot update.");
      return;
    }
    // 必須フィールドのチェック
    if (!form.target_taxa_id) {
      alert("Target Taxon ID is required.");
      return;
    }
    if (!form.data_type) {
      alert("Data Type is required.");
      return;
    }

    setLoadingSave(true); // 保存ローディング開始
    try {
      // ecological_tags はオブジェクト配列なのでIDの配列に変換
      const ecoTagIDs = form.ecological_tags.map((t) => t.id).filter(Boolean);

      // page_start/end は数値またはnullに変換
      const pageStart = form.page_start === "" || form.page_start === null ? null : parseInt(form.page_start, 10);
      const pageEnd = form.page_end === "" || form.page_end === null ? null : parseInt(form.page_end, 10);
      // parseIntがNaNを返す場合も考慮 (NaNならnullにする)
      const finalPageStart = isNaN(pageStart) ? null : pageStart;
      const finalPageEnd = isNaN(pageEnd) ? null : pageEnd;

      // 更新用データオブジェクト
      const updateData = {
        source_publication_id: form.source_publication?.id || null,
        page_start: finalPageStart,
        page_end: finalPageEnd,
        target_taxa_id: form.target_taxa_id.trim() || null, // 空文字列はnullに
        data_type: form.data_type.trim(), // これは必須なのでnullにはしない想定
        ecological_tags: ecoTagIDs.length > 0 ? ecoTagIDs : null, // 空配列ならnull
        remark: form.remark?.trim() || null,
        host_taxon_id: form.host_taxon_id?.trim() || null,
        other_related_taxon_id: form.other_related_taxon_id?.trim() || null,
        distribution: form.distribution?.length ? form.distribution : null, // 空配列ならnull
        data_origin_id: form.data_origin_id || null, // 空文字列はnullとして扱う
        reliability_id: form.reliability_id || null,
        verification_status_id: form.verification_status_id || null,
      };

      // Supabase で更新実行
      const { error } = await supabase
        .from("bionomic_records")
        .update(updateData)
        .eq("id", form.id);

      if (error) {
        console.error("Update failed:", error);
        alert(`Failed to update bionomic record: ${error.message}`);
      } else {
        alert("Bionomic record updated successfully!");
        onClose(true); // 更新成功を親コンポーネントに通知してダイアログを閉じる
      }
    } catch (err) {
      console.error("Error updating bionomic record:", err);
      alert("An unexpected error occurred during update. Check console.");
    } finally {
      setLoadingSave(false); // 保存ローディング終了
    }
  }, [form, onClose]); // form と onClose に依存


  // --- Distribution Sub-Dialog Functions ---
  const handleAddDistribution = useCallback(() => {
    setDistributionEditIndex(null); // 新規追加モード
    setTempDistribution(initialTempDistributionState); // フォームリセット
    setDistributionDialogOpen(true);
  }, []);

  const handleEditDistribution = useCallback((index) => {
    setDistributionEditIndex(index); // 編集モード (indexを指定)
    const dist = form.distribution[index] || {}; // 編集対象データを取得
    setTempDistribution({ // サブダイアログのフォームに値を設定
      country: dist.country ?? "",
      state: dist.state ?? "",
      city: dist.city ?? "",
      detail: dist.detail ?? "",
      latFormat: "decimal", // デフォルトはDecimal（必要なら保存形式に応じて変更）
      lonFormat: "decimal",
      latDecimal: dist.latitude?.toString() ?? "", // 数値を文字列に
      lonDecimal: dist.longitude?.toString() ?? "",
      latDMS: { deg: "", min: "", sec: "", dir: "N" }, // DMSは初期化
      lonDMS: { deg: "", min: "", sec: "", dir: "E" },
    });
    setDistributionDialogOpen(true);
  }, [form.distribution]); // form.distribution が変更されたら再生成

  const handleDeleteDistribution = useCallback((index) => {
    // 確認ダイアログを入れるとより丁寧
    if (window.confirm(`Are you sure you want to delete this distribution entry?`)) {
      const newDist = form.distribution.filter((_, i) => i !== index); // indexが一致しないものだけ残す
      handleChange("distribution", newDist); // メインフォームのstateを更新
    }
  }, [form.distribution, handleChange]);

  // DMS形式からDecimal形式へ変換
  const dmsToDecimal = useCallback(({ deg, min, sec, dir }) => {
    const d = parseFloat(deg) || 0;
    const m = parseFloat(min) || 0;
    const s = parseFloat(sec) || 0;
    // 不正な値が入る可能性を考慮
    if (isNaN(d) || isNaN(m) || isNaN(s)) return null;
    let decimal = Math.abs(d) + m / 60 + s / 3600;
    if (dir === "S" || dir === "W") {
      decimal = -decimal;
    }
    // 有効範囲チェック (例: 緯度は-90～90)
    // if ((dir === 'N' || dir === 'S') && (decimal < -90 || decimal > 90)) return null;
    // if ((dir === 'E' || dir === 'W') && (decimal < -180 || decimal > 180)) return null; // 経度は-180～180
    return decimal;
  }, []);

  // Distributionサブダイアログの保存処理
  const handleDistributionDialogSave = useCallback(() => {
    let finalLat = null;
    let finalLon = null;

    // 緯度を計算
    if (tempDistribution.latFormat === "decimal") {
      const lat = parseFloat(tempDistribution.latDecimal);
      finalLat = isNaN(lat) ? null : lat; // 数値でなければnull
    } else {
      finalLat = dmsToDecimal(tempDistribution.latDMS);
    }

    // 経度を計算
    if (tempDistribution.lonFormat === "decimal") {
      const lon = parseFloat(tempDistribution.lonDecimal);
      finalLon = isNaN(lon) ? null : lon; // 数値でなければnull
    } else {
      finalLon = dmsToDecimal(tempDistribution.lonDMS);
    }

    // 新しい(または更新された)Distribution項目オブジェクト
    const newDistItem = {
      country: tempDistribution.country?.trim() || "", // 空文字許容
      state: tempDistribution.state?.trim() || "",
      city: tempDistribution.city?.trim() || "",
      detail: tempDistribution.detail?.trim() || "",
      latitude: finalLat, // 計算結果 (数値 or null)
      longitude: finalLon,
    };

    const currentDistributions = [...form.distribution]; // 現在の配列をコピー
    if (distributionEditIndex === null) {
      // 新規追加モードの場合：配列の末尾に追加
      currentDistributions.push(newDistItem);
    } else {
      // 編集モードの場合：指定されたindexの要素を置き換え
      currentDistributions[distributionEditIndex] = newDistItem;
    }
    handleChange("distribution", currentDistributions); // メインフォームのstateを更新
    setDistributionDialogOpen(false); // サブダイアログを閉じる
  }, [tempDistribution, form.distribution, distributionEditIndex, handleChange, dmsToDecimal]);


  // --- Rendering ---
  if (!open) {
    return null; // ダイアログが開いていなければ何もレンダリングしない
  }

  return (
    // Dialog コンポーネント
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
      <DialogTitle>Edit Bionomic Record (ID: {recordData?.id})</DialogTitle>

      <DialogContent dividers>
        {/* ★ ローディング表示 */}
        {loadingOptions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading options...</Typography>
          </Box>
        ) : (
          /* ★ フォーム要素 (ローディング完了後に表示) */
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* --- Source & Target --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Source and Target Taxa</Typography>
            <Autocomplete
              options={allPublications || []}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              getOptionLabel={(option) => option?.id ? `${option.id} - ${option.title_english || '(No Title)'}` : ''}
              value={form.source_publication}
              onChange={(e, newVal) => handleChange("source_publication", newVal)}
              renderInput={(params) => <TextField {...params} label="Source Publication" variant="outlined" placeholder="Select or type..." />}
              disabled={loadingSave} // 保存中は無効化
            />
            <Stack direction="row" spacing={2}>
              <TextField label="Page Start" type="number" variant="outlined" value={form.page_start} onChange={(e) => handleChange("page_start", e.target.value)} disabled={loadingSave}/>
              <TextField label="Page End" type="number" variant="outlined" value={form.page_end} onChange={(e) => handleChange("page_end", e.target.value)} disabled={loadingSave}/>
            </Stack>
            <Autocomplete
              freeSolo // IDがリストにない場合も許容する場合
              options={scientificNames.map((sn) => sn.id) || []} // ID文字列の配列
              value={form.target_taxa_id}
              onChange={(event, newValue) => { handleChange("target_taxa_id", newValue || ""); }}
              inputValue={form.target_taxa_id || ''} // null対策
              onInputChange={(event, newInputValue) => { handleChange("target_taxa_id", newInputValue); }}
              renderInput={(params) => <TextField {...params} label="Target Taxon ID (Required)" variant="outlined" required />} // required属性追加
              disabled={loadingSave}
            />

            <Divider sx={{ my: 2 }} />
            {/* --- Data Type --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Data Type</Typography>
            <FormControl component="fieldset" required> {/* required属性追加 */}
              <FormLabel component="legend">Data Type (Required)</FormLabel>
              <RadioGroup row value={form.data_type} onChange={(e) => handleChange("data_type", e.target.value)}>
                <FormControlLabel value="distribution" control={<Radio disabled={loadingSave} />} label="Distribution" />
                <FormControlLabel value="ecology" control={<Radio disabled={loadingSave} />} label="Ecology" />
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 2 }} />
            {/* --- Distribution --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Distribution</Typography>
            <Button variant="outlined" onClick={handleAddDistribution} disabled={loadingSave}>
              Add Distribution Data
            </Button>
            {form.distribution?.length > 0 && (
              <TableContainer sx={{ mt: 1, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <Table size="small" stickyHeader>
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
                      <TableRow key={idx} hover>
                        <TableCell>{dist.country}</TableCell>
                        <TableCell>{dist.state}</TableCell>
                        <TableCell>{dist.city}</TableCell>
                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dist.detail}</TableCell> {/* 長い場合に省略 */}
                        <TableCell>{dist.latitude?.toFixed(6) ?? ''}</TableCell> {/* 小数点以下6桁表示 */}
                        <TableCell>{dist.longitude?.toFixed(6) ?? ''}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleEditDistribution(idx)} disabled={loadingSave}> <EditIcon fontSize="inherit" /> </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteDistribution(idx)} disabled={loadingSave}> <DeleteIcon fontSize="inherit" /> </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider sx={{ my: 2 }} />
            {/* --- Ecological Data --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Ecological Data</Typography>
             <Autocomplete
                freeSolo
                options={scientificNames.map((sn) => sn.id) || []}
                value={form.host_taxon_id}
                onChange={(event, newValue) => { handleChange("host_taxon_id", newValue || ""); }}
                inputValue={form.host_taxon_id || ''}
                onInputChange={(event, newInputValue) => { handleChange("host_taxon_id", newInputValue); }}
                renderInput={(params) => <TextField {...params} label="Host Taxon ID" variant="outlined" />}
                disabled={loadingSave}
             />
             <Autocomplete
                freeSolo
                options={scientificNames.map((sn) => sn.id) || []}
                value={form.other_related_taxon_id}
                onChange={(event, newValue) => { handleChange("other_related_taxon_id", newValue || ""); }}
                inputValue={form.other_related_taxon_id || ''}
                onInputChange={(event, newInputValue) => { handleChange("other_related_taxon_id", newInputValue); }}
                renderInput={(params) => <TextField {...params} label="Other Related Taxon ID" variant="outlined" />}
                disabled={loadingSave}
             />
            <Autocomplete
              multiple
              options={allEcologicalTags || []}
              getOptionLabel={(option) => option?.name || ''}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              value={form.ecological_tags} // オブジェクト配列
              onChange={(e, newVal) => handleChange("ecological_tags", newVal)}
              renderInput={(params) => <TextField {...params} label="Ecological Tags" variant="outlined" placeholder="Select ecological tags..." />}
              disabled={loadingSave}
            />

            <Divider sx={{ my: 2 }} />
            {/* --- Data Origin / Reliability / Verification --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Data Origin and Reliability</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}> {/* レスポンシブ対応 */}
              <TextField select fullWidth label="Data Origin" value={form.data_origin_id} onChange={(e) => handleChange("data_origin_id", e.target.value)} disabled={loadingSave}>
                <MenuItem value="">(None)</MenuItem>
                {dataOrigins.map((o) => (<MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>))}
              </TextField>
              <TextField select fullWidth label="Reliability" value={form.reliability_id} onChange={(e) => handleChange("reliability_id", e.target.value)} disabled={loadingSave}>
                <MenuItem value="">(None)</MenuItem>
                {reliabilities.map((r) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
              </TextField>
              <TextField select fullWidth label="Verification Status" value={form.verification_status_id} onChange={(e) => handleChange("verification_status_id", e.target.value)} disabled={loadingSave}>
                <MenuItem value="">(None)</MenuItem>
                {verificationStatuses.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>))}
              </TextField>
            </Stack>

            <Divider sx={{ my: 2 }} />
            {/* --- Remarks --- */}
            <Typography variant="h6" gutterBottom sx={{ color: "teal" }}>Remarks</Typography>
            <TextField
              label="Remark" value={form.remark}
              onChange={(e) => handleChange("remark", e.target.value)}
              variant="outlined" multiline rows={3}
              disabled={loadingSave}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loadingSave || loadingOptions}> Cancel </Button>
        <Button variant="contained" onClick={handleSave} disabled={loadingSave || loadingOptions}>
          {loadingSave ? "Updating..." : "Update"}
        </Button>
      </DialogActions>

      {/* --- Distribution Sub-Dialog --- */}
      <Dialog open={distributionDialogOpen} onClose={() => setDistributionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {distributionEditIndex === null ? "Add Distribution" : "Edit Distribution"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{pt: 1}}> {/* 上に少しパディング */}
            {/* Country Autocomplete */}
            <Autocomplete
              options={countries || []}
              getOptionLabel={(c) => c.id || ""}
              // value はオブジェクトを探して渡す
              value={countries.find(cn => cn.id === tempDistribution.country) || null}
              onChange={(e, val) => setTempDistribution(prev => ({ ...prev, country: val ? val.id : "" }))}
              renderInput={(params) => <TextField {...params} label="Country" variant="outlined" />}
            />
            <TextField label="State/Prefecture" variant="outlined" value={tempDistribution.state} onChange={(e) => setTempDistribution(prev => ({ ...prev, state: e.target.value }))} />
            <TextField label="City" variant="outlined" value={tempDistribution.city} onChange={(e) => setTempDistribution(prev => ({ ...prev, city: e.target.value }))} />
            <TextField label="Detail Locality" variant="outlined" value={tempDistribution.detail} onChange={(e) => setTempDistribution(prev => ({ ...prev, detail: e.target.value }))} />

            {/* Latitude Input */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField select label="Lat Format" value={tempDistribution.latFormat} onChange={(e) => setTempDistribution(prev => ({ ...prev, latFormat: e.target.value }))} sx={{ minWidth: 120 }}>
                <MenuItem value="decimal">Decimal</MenuItem>
                <MenuItem value="dms">DMS</MenuItem>
              </TextField>
              {tempDistribution.latFormat === "decimal" ? (
                <TextField label="Latitude (decimal)" type="number" step="any" value={tempDistribution.latDecimal} onChange={(e) => setTempDistribution(prev => ({ ...prev, latDecimal: e.target.value }))} fullWidth />
              ) : (
                <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                  <TextField label="Deg" type="number" value={tempDistribution.latDMS.deg} onChange={(e) => setTempDistribution(prev => ({ ...prev, latDMS: { ...prev.latDMS, deg: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField label="Min" type="number" value={tempDistribution.latDMS.min} onChange={(e) => setTempDistribution(prev => ({ ...prev, latDMS: { ...prev.latDMS, min: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField label="Sec" type="number" step="any" value={tempDistribution.latDMS.sec} onChange={(e) => setTempDistribution(prev => ({ ...prev, latDMS: { ...prev.latDMS, sec: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField select label="Dir" value={tempDistribution.latDMS.dir} onChange={(e) => setTempDistribution(prev => ({ ...prev, latDMS: { ...prev.latDMS, dir: e.target.value } }))} sx={{ minWidth: 70 }}>
                    <MenuItem value="N">N</MenuItem>
                    <MenuItem value="S">S</MenuItem>
                  </TextField>
                </Stack>
              )}
            </Stack>

            {/* Longitude Input */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField select label="Lon Format" value={tempDistribution.lonFormat} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonFormat: e.target.value }))} sx={{ minWidth: 120 }}>
                <MenuItem value="decimal">Decimal</MenuItem>
                <MenuItem value="dms">DMS</MenuItem>
              </TextField>
              {tempDistribution.lonFormat === "decimal" ? (
                <TextField label="Longitude (decimal)" type="number" step="any" value={tempDistribution.lonDecimal} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonDecimal: e.target.value }))} fullWidth />
              ) : (
                 <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                  <TextField label="Deg" type="number" value={tempDistribution.lonDMS.deg} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonDMS: { ...prev.lonDMS, deg: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField label="Min" type="number" value={tempDistribution.lonDMS.min} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonDMS: { ...prev.lonDMS, min: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField label="Sec" type="number" step="any" value={tempDistribution.lonDMS.sec} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonDMS: { ...prev.lonDMS, sec: e.target.value } }))} sx={{ width: '20%' }}/>
                  <TextField select label="Dir" value={tempDistribution.lonDMS.dir} onChange={(e) => setTempDistribution(prev => ({ ...prev, lonDMS: { ...prev.lonDMS, dir: e.target.value } }))} sx={{ minWidth: 70 }}>
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
          <Button variant="contained" onClick={handleDistributionDialogSave}> Save </Button>
        </DialogActions>
      </Dialog>

    </Dialog>
  );
}