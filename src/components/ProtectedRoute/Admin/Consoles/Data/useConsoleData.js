// Consoles/Data/useConsoleData.js
import { useEffect, useMemo, useState } from "react";
import supabase from "../../../../../utils/supabase";

export default function useConsoleData({
  plugin,
  page = 0,
  pageSize = 25,
  sortModel = [],
  search = "",
  refreshKey = 0, // ← 追加：保存後のリロード用
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const { orderBy, ascending } = useMemo(() => {
    if (Array.isArray(sortModel) && sortModel.length > 0) {
      const s = sortModel[0];
      return { orderBy: s.field, ascending: s.sort !== "desc" };
    }
    const def = plugin?.defaultSort ?? { field: "publication_date", sort: "desc" };
    return { orderBy: def.field, ascending: def.sort !== "desc" };
  }, [sortModel, plugin]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const selectStr = plugin?.select || "*";
        let query = supabase
          .from(plugin.table)
          .select(selectStr, { count: "exact" })
          .range(from, to);

        // ✅ サーバー側検索（.or には 'or=(...)' を渡さない）
        const orExpr = plugin?.or?.(search);
        if (orExpr) query = query.or(orExpr);

        // 並び替え
        try {
          query = query.order(orderBy, { ascending });
        } catch {
          query = query.order("created_at", { ascending: false });
        }

        const { data, error, count } = await query;
        if (error) throw error;

        let mapped = (data || []).map((r) =>
          typeof plugin?.normalize === "function" ? plugin.normalize(r) : r
        );

        // 追加のクライアント側検索（HTMLタグ除去・著者・ジャーナル名など）
        if (typeof plugin?.searchLocal === "function") {
          mapped = plugin.searchLocal(mapped, search);
        }

        if (!alive) return;
        setRows(mapped);
        setTotal(typeof count === "number" ? count : mapped.length);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // ← refreshKey を依存に入れる
  }, [plugin, page, pageSize, orderBy, ascending, search, refreshKey]);

  return { rows, total, loading };
}
