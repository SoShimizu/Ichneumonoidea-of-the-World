// AuditLogUpdater の修正済みコード（このファイルが別ファイルなら差し替えてください）
import { useEffect, useState } from "react";
import supabase from "../../../utils/supabase"; // パスを調整

export default function AuditLogUpdater({
  tableName,
  rowId,
  action,
  beforeData = null,
  afterData = null,
  onComplete,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let didRun = false; // ⭐ 多重実行を防ぐ
    async function logAudit() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        let changedBy = "unknown";
        if (!userError && user) {
          changedBy = user.user_metadata?.display_name || user.email || "unknown";
        }

        const { error: insertError } = await supabase.from("audit_log").insert([{
          table_name: tableName,
          row_id: rowId,
          action,
          changed_by: changedBy,
          before_data: beforeData,
          after_data: afterData,
        }]);

        if (insertError) {
          setError(insertError.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        if (!didRun && onComplete) {
          didRun = true;
          onComplete();
        }
      }
    }
    logAudit();
  }, [tableName, rowId, action, beforeData, afterData, onComplete]);

  if (loading) return null;
  if (error) return <div style={{ color: "red" }}>Audit log error: {error}</div>;
  return null;
}
