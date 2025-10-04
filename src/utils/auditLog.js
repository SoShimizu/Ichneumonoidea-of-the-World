// src/utils/auditLog.js
// Production-friendly audit logger for Supabase (created_at サーバー自動付与)

import supabase from "./supabase";

const DEFAULT_IGNORED_KEYS = new Set(["last_update", "updated_at", "created_at"]);

function diffDeep(a, b, path = "", out = [], ignore = DEFAULT_IGNORED_KEYS) {
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const isArr = Array.isArray;
  const keys = new Set([
    ...(isObj(a) ? Object.keys(a) : isArr(a) ? a.map((_, i) => String(i)) : []),
    ...(isObj(b) ? Object.keys(b) : isArr(b) ? b.map((_, i) => String(i)) : []),
  ]);

  if (!keys.size) {
    const same = (a === b) || (Number.isNaN(a) && Number.isNaN(b));
    if (!same) out.push({ path, before: a, after: b });
    return out;
  }

  for (const k of keys) {
    if (ignore.has(k)) continue;
    const nextPath = path ? `${path}.${k}` : k;
    const av = isObj(a) ? a[k] : isArr(a) ? a[Number(k)] : undefined;
    const bv = isObj(b) ? b[k] : isArr(b) ? b[Number(k)] : undefined;
    const avIsObj = isObj(av) || isArr(av);
    const bvIsObj = isObj(bv) || isArr(bv);

    if (avIsObj || bvIsObj) {
      if ((isArr(av) && isArr(bv) && av.length === bv.length) || (isObj(av) && isObj(bv))) {
        diffDeep(av, bv, nextPath, out, ignore);
      } else if (JSON.stringify(av) !== JSON.stringify(bv)) {
        out.push({ path: nextPath, before: av, after: bv });
      }
    } else {
      const same = (av === bv) || (Number.isNaN(av) && Number.isNaN(bv));
      if (!same) out.push({ path: nextPath, before: av, after: bv });
    }
  }
  return out;
}

function safeStringify(v) {
  const seen = new WeakSet();
  return JSON.stringify(
    v,
    (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    },
    2
  );
}

async function getActor() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return { actor_id: null, actor_display: null };
    const u = data.user;
    return {
      actor_id: u.id || null,
      actor_display:
        u.user_metadata?.display_name ||
        u.user_metadata?.full_name ||
        u.email ||
        null,
    };
  } catch {
    return { actor_id: null, actor_display: null };
  }
}

async function insertAuditRow(payload) {
  const { error } = await supabase.from("audit_log").insert([payload]);
  if (error) console.warn("[audit_log] insert failed:", error.message, payload);
}

const audit = {
  setIgnoredKeys(keys, merge = true) {
    if (!Array.isArray(keys)) return;
    if (!merge) DEFAULT_IGNORED_KEYS.clear();
    keys.forEach((k) => DEFAULT_IGNORED_KEYS.add(String(k)));
  },

  async log({ table, rowId, action, before = null, after = null }) {
    const { actor_id, actor_display } = await getActor();
    const diffs = diffDeep(before, after);
    const payload = {
      table_name: table,
      row_id: String(rowId),
      action,
      actor_id,
      actor_display,
      // created_at は送らない（DB の default now() を使う）
      before_data: before ? JSON.parse(safeStringify(before)) : null,
      after_data: after ? JSON.parse(safeStringify(after)) : null,
      diff: diffs.length ? diffs : null,
    };
    await insertAuditRow(payload);
  },

  async insert(table, rowId, after) {
    await this.log({ table, rowId, action: "insert", before: null, after });
  },
  async update(table, rowId, before, after) {
    await this.log({ table, rowId, action: "update", before, after });
  },
  async remove(table, rowId, before) {
    await this.log({ table, rowId, action: "delete", before, after: null });
  },
};

export default audit;
