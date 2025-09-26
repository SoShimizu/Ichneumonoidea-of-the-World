// src/components/ProtectedRoute/Admin/myHooks/useFetchScientificNames.js
import { useState, useEffect, useCallback } from "react";
import fetchSupabaseAll from "../../../../utils/fetchSupabaseAll";

/**
 * 学名テーブルを一度だけ取得し、結果を返すフック
 */
export default function useFetchScientificNames() {
  const [scientificNames, setScientificNames] = useState([]);

  const fetchNames = useCallback(async () => {
    const list = await fetchSupabaseAll(
      "scientific_names",
      "id, name_spell_valid, current_rank, current_parent"
    );
    if (!list.error) {
      setScientificNames(list);
    } else {
      console.error("Failed to fetch scientific_names:", list.error);
    }
  }, []);

  // マウント時に一度だけ取得
  useEffect(() => {
    fetchNames();
  }, [fetchNames]);

  return {
    scientificNames,
    refresh: fetchNames,  // 追加ダイアログ後に再取得したい場合に使える
  };
}
