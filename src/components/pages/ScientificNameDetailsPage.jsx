import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import supabase from "../../utils/supabase";
import DialogDisplayScientificNameDetails from "../Dialogs/DialogDisplayScientificNameDetails/DialogDisplayScientificNameDetails";
import fetchSupabaseAll from "../../utils/fetchSupabaseAll";

export default function ScientificNameDetailsPage() {
  const { id } = useParams();
  const location = useLocation();

  // 前ページから initial を受け取れる：なければ undefined
  const passedInitial = location.state?.initialScientificName;

  const [initialScientificName, setInitialScientificName] = useState(passedInitial || null);
  const [allScientificNames, setAllScientificNames] = useState([]);
  const [allAuthorsData, setAllAuthorsData] = useState([]);
  const [allPublications, setAllPublications] = useState({ data: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // (1) 学名一覧・著者・文献一覧は常にロード
  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      try {
        const namesRes = await fetchSupabaseAll("scientific_names", `*`);
        const authorsRes = await fetchSupabaseAll(
          "scientific_name_and_author",
          `*, author:author_id (id, first_name_eng, last_name_eng)`
        );
        const pubsRes = await supabase
          .from("publications")
          .select(`*, journal:journal_id(*), publications_authors(author_order, author:author_id(*))`);

        setAllScientificNames(namesRes);
        setAllAuthorsData(authorsRes);
        setAllPublications({ data: pubsRes.data });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // 一度だけ実行
    if (!allScientificNames.length) {
      fetchLists();
    }
  }, []);

  // (2) initialScientificName が渡されていなければ
  //     namesRes から探してセット
  useEffect(() => {
    if (initialScientificName) return;
    const found = allScientificNames.find((sn) => sn.id === id);
    setInitialScientificName(found || null);
  }, [allScientificNames, id, initialScientificName]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!initialScientificName) return <div>No data found.</div>;

  return (
    <DialogDisplayScientificNameDetails
      initialScientificName={initialScientificName}
      allScientificNames={allScientificNames}
      scientificNameAuthors={allAuthorsData}
      allTaxonomicActs={[]}
      allReferences={allPublications}
    />
  );
}
