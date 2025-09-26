-- ================================
-- 科学名 (scientific_names)
-- ================================
CREATE INDEX idx_scientific_names_id ON scientific_names(id);
CREATE INDEX idx_scientific_names_name_spell_original ON scientific_names(name_spell_original);
CREATE INDEX idx_scientific_names_name_spell_valid ON scientific_names(name_spell_valid);
CREATE INDEX idx_scientific_names_valid_name_id ON scientific_names(valid_name_id);

-- (全文検索用。将来必要なら)
-- CREATE INDEX idx_scientific_names_name_spell_original_gin ON scientific_names USING GIN (name_spell_original gin_trgm_ops);

-- ================================
-- 文献 (publications)
-- ================================
CREATE INDEX idx_publications_id ON publications(id);
CREATE UNIQUE INDEX idx_publications_doi ON publications(doi) WHERE doi IS NOT NULL;
CREATE INDEX idx_publications_journal_id ON publications(journal_id);
CREATE INDEX idx_publications_publication_date ON publications(publication_date);

-- ================================
-- 分布記録 (distribution_records)
-- ================================
CREATE INDEX idx_distribution_records_id ON distribution_records(id);
CREATE INDEX idx_distribution_records_taxon_id ON distribution_records(taxon_id);
CREATE INDEX idx_distribution_records_publication_id ON distribution_records(publication_id);
CREATE INDEX idx_distribution_records_country_id ON distribution_records(country_id);
CREATE INDEX idx_distribution_records_city ON distribution_records(city);
CREATE INDEX idx_distribution_records_host_id ON distribution_records(host_id);

-- (緯度経度での空間検索用、PostGISインストール後)
-- CREATE INDEX idx_distribution_records_location ON distribution_records USING GIST (point(longitude, latitude));

-- ================================
-- 分布配列 (distribution_sequences)
-- ================================
CREATE INDEX idx_distribution_sequences_distribution_record_id ON distribution_sequences(distribution_record_id);
CREATE INDEX idx_distribution_sequences_sequence_type_id ON distribution_sequences(sequence_type_id);

-- ================================
-- 和名 (vernacular_names)
-- ================================
CREATE INDEX idx_vernacular_names_scientific_name_id ON vernacular_names(scientific_name_id);

-- ================================
-- 都市・国 (cities, countries)
-- ================================
CREATE INDEX idx_cities_id ON cities(id);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_countries_id ON countries(id);
CREATE INDEX idx_countries_name ON countries(name);

-- ================================
-- 著者 (authors)
-- ================================
CREATE INDEX idx_authors_id ON authors(id);
CREATE INDEX idx_authors_name_eng ON authors(first_name_eng, last_name_eng);
CREATE INDEX idx_authors_orcid ON authors(orcid);

-- ================================
-- 標本画像 (specimen_images)
-- ================================
CREATE INDEX idx_specimen_images_scientific_name_id ON specimen_images(scientific_name_id);

-- ================================
-- その他
-- ================================
CREATE INDEX idx_repositories_id ON repositories(id);
CREATE INDEX idx_repositories_country ON repositories(country);

CREATE INDEX idx_journals_id ON journals(id);
CREATE INDEX idx_journals_issn ON journals(issn);
















-- まずは必要な拡張機能を有効に（まだなら）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- bionomic_recordsテーブル
CREATE TABLE public.bionomic_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), -- 自動UUID
    created_at timestamp with time zone DEFAULT now(), -- 自動タイムスタンプ
    source_publication_id text REFERENCES publications(id) ON DELETE SET NULL, -- 文献参照
    page_start integer, -- 開始ページ
    page_end integer,   -- 終了ページ
    target_taxa_id text REFERENCES scientific_names(id) ON DELETE CASCADE, -- 学名参照
    data_type text REFERENCES bionomic_record_type(name) ON DELETE SET NULL, -- 生態/分布タイプ（別テーブル参照）
    country_id uuid REFERENCES countries(id) ON DELETE SET NULL, -- 国参照
    state text, -- 州・県
    county text, -- 郡
    city text, -- 市
    latitude numeric(9,6), -- 緯度
    longitude numeric(9,6), -- 経度
    ecological_tags jsonb, -- 生態タグ（複数可）
    remark text -- 備考
);

-- インデックス最適化（高速検索用）
CREATE INDEX idx_bionomic_records_target_taxa ON public.bionomic_records (target_taxa_id);
CREATE INDEX idx_bionomic_records_country_id ON public.bionomic_records (country_id);
CREATE INDEX idx_bionomic_records_data_type ON public.bionomic_records (data_type);
CREATE INDEX idx_bionomic_records_ecological_tags ON public.bionomic_records USING gin (ecological_tags);
