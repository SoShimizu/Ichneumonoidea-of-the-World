ALTER TABLE scientific_names DROP COLUMN fts;
ALTER TABLE scientific_names
ADD COLUMN fts tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(id, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(name_spell_valid, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(name_spell_original, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(current_rank, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(original_rank, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(current_parent, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(original_parent, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(extant_fossil, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(remark, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(type_locality, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(type_sex, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(type_repository, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(type_host, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(page, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(source_of_original_description, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(col_status, '')), 'D') ||
  setweight(to_tsvector('simple', coalesce(type_category, '')), 'D')
) STORED;
CREATE INDEX fts_idx_scientific_names ON scientific_names USING GIN (fts);
