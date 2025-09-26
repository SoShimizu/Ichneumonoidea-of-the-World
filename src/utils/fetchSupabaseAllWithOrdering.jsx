// utils/fetchSupabaseAllWithOrdering.js
import supabase from './supabase';

export default async function fetchSupabaseAllWithOrdering({ tableName, selectQuery, orderOptions = [], limit = 1000 }) {
  let allData = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select(selectQuery)
      .range(offset, offset + limit - 1);

    // Apply ordering
    for (const order of orderOptions) {
      const { column, ascending = true, referencedTable } = order;
      if (referencedTable) {
        query = query.order(column, { foreignTable: referencedTable, ascending });
      } else {
        query = query.order(column, { ascending });
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    allData = allData.concat(data);
    offset += limit;
    if (!data || data.length < limit) hasMore = false;
  }

  return allData;
}
