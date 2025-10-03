// src/components/ProtectedRoute/Admin/Consoles/Data/useConsoleData.js
import { useEffect, useMemo, useState } from "react";
import supabase from "../../../../../utils/supabase";

/**
 * 汎用データ取得フック（拡張版）
 * - plugin.fetch があればそれを優先（ページング/ソート/検索を自前実装可能）
 * - なければ select + or() + normalize() で取得
 * - 詳細ログを常時出力し、エラー原因を特定しやすく
 */
export default function useConsoleData({
  plugin,            // { table, select, normalize, defaultSort, or, fetch? }
  page = 0,
  pageSize = 25,
  sortModel = [],
  search = "",
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // 並び替え
  const { orderBy, ascending } = useMemo(() => {
    if (Array.isArray(sortModel) && sortModel.length > 0) {
      const s = sortModel[0];
      return { orderBy: s.field, ascending: s.sort !== "desc" };
    }
    const def = plugin?.defaultSort ?? { field: "publication_date", sort: "desc" };
    return { orderBy: def.field, ascending: def.sort !== "desc" };
  }, [sortModel, plugin]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!plugin) return;
      setLoading(true);

      // 1) plugin.fetch がある場合はそれを使用
      if (typeof plugin.fetch === "function") {
        try {
          console.debug("[useConsoleData] plugin.fetch start", {
            table: plugin.table,
            page,
            pageSize,
            orderBy,
            ascending,
            search,
          });
          const { rows: fetchedRows = [], total: fetchedTotal = 0 } =
            (await plugin.fetch({ page, pageSize, orderBy, ascending, search })) || {};

          if (!isMounted) return;
          setRows(fetchedRows);
          setTotal(fetchedTotal);
        } catch (err) {
          console.error("[useConsoleData] plugin.fetch error", err);
          if (isMounted) {
            setRows([]);
            setTotal(0);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      // 2) 通常モード（select + or + normalize）
      try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        // 検索（プラグイン提供 or を優先）
        const selectStr = plugin?.select || "*";
        let query = supabase
          .from(plugin.table)
          .select(selectStr, { count: "exact" })
          .range(from, to);

        const orExpr = typeof plugin?.or === "function" ? plugin.or(search) : undefined;
        if (orExpr) query = query.or(orExpr);

        try {
          query = query.order(orderBy, { ascending });
        } catch {
          query = query.order("created_at", { ascending: false });
        }

        console.debug("[useConsoleData] default fetch start", {
          table: plugin.table,
          from,
          to,
          orderBy,
          ascending,
          search,
          select: selectStr,
          or: orExpr,
        });

        const { data, error, count } = await query;
        if (error) {
          console.error("[useConsoleData] default fetch error", error);
          throw error;
        }

        let mapped = data ?? [];
        if (typeof plugin?.normalize === "function") {
          try {
            mapped = mapped.map(plugin.normalize);
          } catch (normErr) {
            console.error("[useConsoleData] normalize error", normErr);
          }
        }

        if (!isMounted) return;
        setRows(mapped);
        setTotal(count ?? mapped.length);
      } catch (err) {
        console.error("[useConsoleData] fatal error", err);
        if (!isMounted) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [plugin, page, pageSize, orderBy, ascending, search]);

  return { rows, total, loading };
}
