// src/admin/console/data/crud.js
import supabase from "../../../../../utils/supabase";

export async function upsertRow(table, payload) {
  const { data, error } = await supabase.from(table).upsert(payload).select().single();
  if (error) throw error; return data;
}
export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error; return true;
}

export function exportCsv(rows, filename = "export.csv") {
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v).replaceAll('"', '""');
    if (/[",\n]/.test(s)) return '"' + s + '"';
    return s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
