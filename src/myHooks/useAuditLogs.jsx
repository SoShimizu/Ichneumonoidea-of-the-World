// src/hooks/useAuditLogs.js
import { useState, useEffect } from "react";
import fetchSupabaseAll from "../utils/fetchSupabaseAll";

/**
 * audit_log テーブルをフェッチして
 * { logs, loading, error } を返すカスタムフック
 */
export default function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSupabaseAll("audit_log")
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("failed to fetch audit_log:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { logs, loading, error };
}
