import { useState, useEffect, useMemo } from "react";
import fetchSupabaseAll from "../../../utils/fetchSupabaseAll";
import expectedJson from "./name_number_taxapad.json"; // Taxapad JSON

export default function useSubfamilyComparisonData(selectedFamily) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const expFlat = useMemo(() => {
    const out = {};
    expectedJson.forEach(obj => {
      const fam = Object.keys(obj)[0];
      Object.entries(obj[fam]).forEach(([sub, cnt]) => {
        out[sub.trim()] = { family: fam, gen: cnt.gen, sp: cnt.sp };
      });
    });
    return out;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await fetchSupabaseAll(
        "scientific_names",
        "id, name_spell_valid, current_rank, current_parent"
      );

      if (!Array.isArray(list)) {
        console.error("Data fetch error", list.error);
        setRows([]);
        setLoading(false);
        return;
      }

      const valid = list.filter(n => {
        const r = n.current_rank?.toLowerCase();
        return r !== "synonym" && r !== "homonym";
      });

      const childrenOf = id => valid.filter(n => n.current_parent === id);
      const countDesc = (id, acc = {}) => {
        for (const c of childrenOf(id)) {
          const rank = c.current_rank.toLowerCase();
          acc[rank] = (acc[rank] || 0) + 1;
          countDesc(c.id, acc);
        }
        return acc;
      };

      const result = Object.entries(expFlat)
        .filter(([, v]) => v.family === selectedFamily)
        .map(([sub, exp]) => {
          const node = valid.find(n =>
            n.current_rank.toLowerCase() === "subfamily" &&
            n.name_spell_valid.trim() === sub
          );
          const desc = node ? countDesc(node.id) : {};
          const generaOurDB = desc.genus || 0;
          const speciesOurDB = desc.species || 0;
          return {
            subfamily: sub,
            expectedGenus: exp.gen,
            generaOurDB,
            genusPercent: exp.gen ? +(generaOurDB / exp.gen * 100).toFixed(1) : 0,
            expectedSpecies: exp.sp,
            speciesOurDB,
            speciesPercent: exp.sp ? +(speciesOurDB / exp.sp * 100).toFixed(1) : 0
          };
        });

      setRows(result);
      setLoading(false);
    })();
  }, [selectedFamily, expFlat]);

  return { data: rows, loading };
}
