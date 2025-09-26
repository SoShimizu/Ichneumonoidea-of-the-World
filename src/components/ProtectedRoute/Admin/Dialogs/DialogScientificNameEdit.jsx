import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  MenuItem,
  Chip,
  Stack,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ReactSortable } from "react-sortablejs";
import supabase from "../../../../utils/supabase";
import DialogAuthorAdd from "./DialogAuthorAdd";
// ADDED: Import AuditLogUpdater component (パスは適宜調整)
import AuditLogUpdater from "../../AuditLogUpdater/AuditLogUpdater";
import LoadingScreen from "../../../LoadingScreen";
import fetchSupabaseAll from "../../../../utils/fetchSupabaseAll";

export default function DialogScientificNameEdit({ scientificName, onClose }) {
  const [loading, setLoading] = useState(true); 

  // フォーム初期値（DBから取得した scientificName レコード）
  const [form, setForm] = useState(() => ({ ...scientificName }));

  // ADDED: 監査ログ更新用の状態（audit_log の挿入情報）
  const [auditLogProps, setAuditLogProps] = useState(null);

  // 著者 (M2M) 管理
  const [allAuthors, setAllAuthors] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [authorInputValue, setAuthorInputValue] = useState("");

  // DialogAuthorAdd の表示制御
  const [showAddAuthor, setShowAddAuthor] = useState(false);

  // Autocomplete 用データ
  const [ranks, setRanks] = useState([]);
  const [names, setNames] = useState([]); // scientific_names の id 一覧（自己参照用）
  const [statuses, setStatuses] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [publications, setPublications] = useState([]);
  const [countriesList, setCountriesList] = useState([]);

  // authority_year 用：例として現在の年から過去100年分
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => `${currentYear - i}`);
  }, []);

  const [typeCategories, setTypeCategories] = useState([]);


  // scientificName が変わるたびにフォーム更新
  useEffect(() => {
    setForm({ ...scientificName });
  }, [scientificName]);

  // 関連データ取得（各テーブルから必要な情報を取得）
  useEffect(() => {
    (async () => {
      const s = await fetchSupabaseAll("scientific_names", "id");
      if (s && Array.isArray(s)) {
        console.log("data: ",s)
        setNames(s.map(d => d.id));
      }
      const [r, st, rep, pub, auth, c, tc] = await Promise.all([
        supabase.from("rank").select("id"),
        supabase.from("extant_fossil").select("id"),
        supabase.from("Repositories").select("id, full_name"),
        supabase
          .from("publications")
          .select(`
            id,
            title_english,
            publication_date,
            volume,
            number,
            page,
            journal:journal_id(name_english),
            publications_authors(
              author_order,
              authors(last_name_eng)
            )
          `),
        supabase.from("authors").select("id, first_name_eng, last_name_eng"),
        supabase.from("countries").select("id"),
        supabase.from("type_categories").select("*"),
      ]);

      if (!r.error) setRanks(r.data.map(d => d.id));
      if (!st.error) setStatuses(st.data.map(d => d.id));
      if (!rep.error) setRepositories(rep.data);
      if (!pub.error) setPublications(pub.data);
      if (!auth.error) setAllAuthors(auth.data);
      if (!c.error && c.data) setCountriesList(c.data);
      if (!tc.error && tc.data) setTypeCategories(tc.data);
      // ★ データ取得完了後に loading を false にする
    setLoading(false);
    })();
  }, []);

  // 中間テーブルから、この学名に紐づく著者を取得
  useEffect(() => {
    if (!scientificName?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("scientific_name_and_author")
        .select(`
          author_order,
          authors:author_id (id, first_name_eng, last_name_eng)
        `)
        .eq("scientific_name_id", scientificName.id)
        .order("author_order", { ascending: true });
      if (error) {
        console.error("Failed to fetch name_authors:", error);
        return;
      }
      const mapped = data.map(d => ({
        id: d.authors?.id,
        first_name_eng: d.authors?.first_name_eng,
        last_name_eng: d.authors?.last_name_eng,
      }));
      setSelectedAuthors(mapped);
    })();
  }, [scientificName?.id]);

  // 自分のIDがまだ DB に存在しない場合、Autocomplete の候補に一時追加
  const combinedNames = useMemo(() => {
    if (form.id && !names.includes(form.id)) {
      return [...names, form.id];
    }
    return names;
  }, [names, form.id]);

  // フォーム変更ハンドラ
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 著者追加ダイアログからのコールバック
  const handleAuthorAdd = (newAuthor) => {
    setAllAuthors(prev => [...prev, newAuthor]);
    setSelectedAuthors(prev => [...prev, newAuthor]);
  };

  // 著者削除
  const handleAuthorRemove = (id) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== id));
  };

  // ------------------- Authority 表示文字列生成 -------------------
  const authorityString = useMemo(() => {
    if (!selectedAuthors || selectedAuthors.length === 0) return "";
    const sorted = [...selectedAuthors]; // 既に順序は取得済み
    if (sorted.length <= 3) {
      return sorted.map(a => a.last_name_eng).join(", ");
    }
    return `${sorted.slice(0, 3).map(a => a.last_name_eng).join(", ")} & others`;
  }, [selectedAuthors]);

  // 保存 (Update)
  const handleSave = async () => {
    if (!window.confirm("Are you sure you want to update?")) return;
    if (!form.id?.trim() || !form.name_spell_valid?.trim()) {
      alert("Required fields are missing (id or valid name).");
      return;
    }

    // ----- subgenus以上の場合は type_locality を null にする -----
    const ranksNoLocality = ["subgenus", "genus", "family", "order", "class", "phylum", "kingdom"];
    if (ranksNoLocality.includes((form.current_rank || "").toLowerCase())) {
      handleChange("type_locality", null);
    }

    // scientific_names テーブルに存在するカラムのみ抽出（余計なキーは除外）
    const {
      id,
      name_spell_valid,
      name_spell_original,
      current_rank,
      original_rank,
      current_parent,
      original_parent,
      valid_name_id,
      type_taxa_id,
      extant_fossil,
      authority_year,
      type_sex,
      page,
      type_locality,
      type_repository,
      type_host,
      remark,
      source_of_original_description,
    } = form;

    const payload = {
      id,
      name_spell_valid,
      name_spell_original,
      current_rank: current_rank || null,
      original_rank: original_rank || null,
      current_parent: current_parent || null,
      original_parent: original_parent || null,
      valid_name_id: valid_name_id || null,
      type_taxa_id: type_taxa_id || null,
      extant_fossil: extant_fossil || null,
      authority_year: authority_year || null,
      type_sex: type_sex || null,
      page: page || null,
      type_locality: type_locality || null,
      type_repository: type_repository || null,
      type_host: type_host || null,
      remark: remark || null,
      source_of_original_description: source_of_original_description || null,
      last_update: new Date().toISOString(),
      type_category: form.type_category || null,
    };

    // 1) scientific_names を更新
    const { error: snError } = await supabase
      .from("scientific_names")
      .update(payload)
      .eq("id", form.id);
    if (snError) {
      alert("Update failed: " + snError.message);
      return;
    }

    // 2) 中間テーブル（著者）を一旦削除して再挿入
    const { error: delError } = await supabase
      .from("scientific_name_and_author")
      .delete()
      .eq("scientific_name_id", form.id);
    if (delError) {
      alert("Failed to clear existing authors: " + delError.message);
      return;
    }
    if (selectedAuthors.length > 0) {
      const authorLinks = selectedAuthors.map((a, index) => ({
        scientific_name_id: form.id,
        author_id: a.id,
        author_order: index + 1,
      }));
      const { error: insError } = await supabase
        .from("scientific_name_and_author")
        .insert(authorLinks);
      if (insError) {
        alert("Failed to link authors: " + insError.message);
        return;
      }
    }

    // ADDED: 更新処理が成功したら、AuditLogUpdater 用の props をセットする
    setAuditLogProps({
      tableName: "scientific_names", // 変更対象テーブル
      rowId: form.id.toString(),      // 対象レコードのID（文字列）
      action: "UPDATE",               // 操作種別
      beforeData: scientificName,     // 変更前のデータ（props の scientificName を利用）
      afterData: form,                // 変更後のデータ（更新後の form）
      onComplete: () => {
        alert("Update successful and audit log recorded!");
        onClose();
      }
    });
    // ※ ここでは onClose() を直接呼ばず、AuditLogUpdater の onComplete で呼ぶ

    // 削除処理は handleDelete 内で行うので、ここでは何もせずに終了
  };

  // 削除処理
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    await supabase
      .from("scientific_name_and_author")
      .delete()
      .eq("scientific_name_id", form.id);
    const { error } = await supabase
      .from("scientific_names")
      .delete()
      .eq("id", form.id);
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      alert("Deleted successfully.");
      onClose();
    }
  };

  // publication 表示用ラベル生成
  const renderPublicationLabel = (p) => {
    if (!p) return "";
    const pubAuthors = (p.publications_authors || [])
      .sort((a, b) => a.author_order - b.author_order)
      .map(pa => pa.authors?.last_name_eng)
      .filter(Boolean);
    let authorStr = pubAuthors.slice(0, 3).join(", ");
    if (pubAuthors.length > 3) authorStr += ", et al";
    const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
    const journal = p.journal?.name_english || "";
    const volume = p.volume ? ` ${p.volume}` : "";
    const number = p.number ? `(${p.number})` : "";
    const page = p.page ? `: ${p.page}` : "";
    const journalInfo = journal ? ` — ${journal}${volume}${number}${page}` : "";
    return `${authorStr} (${year}) ${p.title_english}${journalInfo}`;
  };

  if (loading) {
  return <LoadingScreen message="Loading data from database..." />;
}

  return (
    <>
          <Dialog open onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Edit Scientific Name</DialogTitle>
            <DialogContent dividers>
              {/* ID (編集不可) */}
              <TextField
                label="ID"
                value={form.id || ""}
                fullWidth
                margin="dense"
                disabled
              />

              {/* Valid Name */}
              <TextField
                label="Valid Name"
                value={form.name_spell_valid || ""}
                onChange={(e) => handleChange("name_spell_valid", e.target.value)}
                fullWidth
                margin="dense"
              />

              {/* Original Spelling */}
              <TextField
                label="Original Spelling"
                value={form.name_spell_original || ""}
                onChange={(e) => handleChange("name_spell_original", e.target.value)}
                fullWidth
                margin="dense"
              />

              {/* Authority（表示用：中間テーブルからの著者情報の組み合わせ） */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}>
                <Typography variant="subtitle2">Authority:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {authorityString || "—"}
                </Typography>
              </Stack>

              {/* 著者 (M2M) */}
              <Autocomplete
                options={allAuthors}
                getOptionLabel={(a) => `${a.last_name_eng}, ${a.first_name_eng}`}
                inputValue={authorInputValue}
                onInputChange={(e, val) => setAuthorInputValue(val)}
                onChange={(e, val) => {
                  if (val && !selectedAuthors.find(x => x.id === val.id)) {
                    setSelectedAuthors(prev => [...prev, val]);
                    setAuthorInputValue("");
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Add Author" margin="dense" />
                )}
              />
              <ReactSortable list={selectedAuthors} setList={setSelectedAuthors}>
                {selectedAuthors.map((a, i) => (
                  <Chip
                    key={a.id}
                    label={`${i + 1}. ${a.last_name_eng}, ${a.first_name_eng}`}
                    onDelete={() => handleAuthorRemove(a.id)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </ReactSortable>
              <Stack direction="row" justifyContent="flex-end" mt={1}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddAuthor(true)}
                >
                  + Add/Edit Author
                </Button>
              </Stack>

              {/* current_rank */}
              <Autocomplete
                options={ranks}
                value={form.current_rank || null}
                onChange={(e, v) => handleChange("current_rank", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Current Rank" margin="dense" fullWidth />
                )}
              />

              {/* original_rank */}
              <Autocomplete
                options={ranks}
                value={form.original_rank || null}
                onChange={(e, v) => handleChange("original_rank", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Original Rank" margin="dense" fullWidth />
                )}
              />

              {/* current_parent */}
              <Autocomplete
                options={combinedNames}
                value={form.current_parent || null}
                onChange={(e, v) => handleChange("current_parent", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Current Parent" margin="dense" fullWidth />
                )}
              />

              {/* original_parent */}
              <Autocomplete
                options={combinedNames}
                value={form.original_parent || null}
                onChange={(e, v) => handleChange("original_parent", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Original Parent" margin="dense" fullWidth />
                )}
              />

              {/* valid_name_id */}
              <Autocomplete
                options={combinedNames}
                value={form.valid_name_id || null}
                onChange={(e, v) => handleChange("valid_name_id", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Valid Name ID" margin="dense" fullWidth />
                )}
              />

              {/* type_taxa_id */}
              <Autocomplete
                options={combinedNames}
                value={form.type_taxa_id || null}
                onChange={(e, v) => handleChange("type_taxa_id", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Type Taxa ID" margin="dense" fullWidth />
                )}
              />

              {/* extant_fossil */}
              <Autocomplete
                options={statuses}
                value={form.extant_fossil || null}
                onChange={(e, v) => handleChange("extant_fossil", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Extant/Fossil" margin="dense" fullWidth />
                )}
              />

              {/* authority_year → Autocomplete で年を選択 */}
              <Autocomplete
                options={yearOptions}
                value={form.authority_year || null}
                onChange={(e, v) => handleChange("authority_year", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Authority Year" margin="dense" fullWidth />
                )}
              />

          {/* Type Category (Holotype, Lectotypeなど) */}
<Autocomplete
  options={typeCategories.map(tc => tc.id)}
  value={form.type_category || ""}
  onChange={(e, v) => handleChange("type_category", v || "")}
  renderInput={(params) => (
    <TextField {...params} label="Type Category (e.g., Holotype)" margin="dense" fullWidth />
  )}
  sx={{ mt: 2 }}
          />
          
              {/* type_sex */}
              <TextField
                select
                label="Type Sex"
                value={form.type_sex || ""}
                onChange={(e) => handleChange("type_sex", e.target.value)}
                fullWidth
                margin="dense"
              >
                <MenuItem value="">(none)</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Unknown">Unknown</MenuItem>
              </TextField>

              {/* page */}
              <TextField
                label="Page"
                value={form.page || ""}
                onChange={(e) => handleChange("page", e.target.value)}
                fullWidth
                margin="dense"
              />

              {/* type_locality → Autocomplete from countries */}
              <Autocomplete
                options={countriesList}
                getOptionLabel={(c) => c.id}
                value={countriesList.find(c => c.id === form.type_locality) || null}
                onChange={(e, v) => handleChange("type_locality", v?.id || "")}
                renderInput={(params) => (
                  <TextField {...params} label="Type Locality (Country)" margin="dense" fullWidth />
                )}
              />

              {/* type_repository */}
              <Autocomplete
                options={repositories}
                getOptionLabel={(r) => `${r.id} — ${r.full_name}`}
                value={repositories.find(r => r.id === form.type_repository) || null}
                onChange={(e, v) => handleChange("type_repository", v?.id || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Type Repository" margin="dense" fullWidth />
                )}
              />

              {/* type_host */}
              <Autocomplete
                options={combinedNames}
                value={form.type_host || null}
                onChange={(e, v) => handleChange("type_host", v || null)}
                renderInput={(params) => (
                  <TextField {...params} label="Type Host" margin="dense" fullWidth />
                )}
              />

              {/* Remark */}
              <TextField
                label="Remark"
                value={form.Remark || form.remark || ""}
                onChange={(e) => handleChange("Remark", e.target.value)}
                fullWidth
                margin="dense"
                multiline
              />

              {/* Source of Original Description */}
              <Autocomplete
                options={publications}
                value={publications.find(p => p.id === form.source_of_original_description) || null}
                onChange={(e, v) =>
                  handleChange("source_of_original_description", v?.id || "")
                }
                getOptionLabel={(p) => {
                  if (!p) return "";
                  const pubAuthors = (p.publications_authors || [])
                    .sort((a, b) => a.author_order - b.author_order)
                    .map(pa => pa.authors?.last_name_eng)
                    .filter(Boolean);
                  let authorStr = pubAuthors.slice(0, 3).join(", ");
                  if (pubAuthors.length > 3) authorStr += ", et al";
                  const year = p.publication_date ? new Date(p.publication_date).getFullYear() : "n.d.";
                  const journal = p.journal?.name_english || "";
                  const volume = p.volume ? ` ${p.volume}` : "";
                  const number = p.number ? `(${p.number})` : "";
                  const page = p.page ? `: ${p.page}` : "";
                  const journalInfo = journal ? ` — ${journal}${volume}${number}${page}` : "";
                  return `${authorStr} (${year}) ${p.title_english}${journalInfo}`;
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Source of Original Description" margin="dense" fullWidth />
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button variant="contained" color="primary" onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" color="error" onClick={handleDelete}>
                Delete
              </Button>
              <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
          </Dialog>

          {/* DialogAuthorAdd の配置 */}
          <DialogAuthorAdd
            open={showAddAuthor}
            onClose={() => setShowAddAuthor(false)}
            onAdd={handleAuthorAdd}
          />

          {/* ADDED: AuditLogUpdater コンポーネントを条件付きでレンダリング */}
          {auditLogProps && <AuditLogUpdater {...auditLogProps} />}

      </>
  );
}
