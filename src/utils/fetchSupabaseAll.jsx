// src/utils/fetchSupabaseAll.js
import supabase from './supabase';

export default async function fetchSupabaseAll(tableName, selectQuery, limit = 1000) {
  let allData = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: chunk, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    allData = allData.concat(chunk);
    offset += limit;
    if (!chunk || chunk.length < limit) hasMore = false;
  }

  return allData;
}
