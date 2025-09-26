import json
from datetime import date

geojson_path = "D:\\DATABASE\\IchneumonoideaOfTheWorld\\src\\data\\custom.geo.json"
today = date.today().isoformat()

plpgsql_blocks = []

with open(geojson_path, encoding="utf-8") as f:
    geojson = json.load(f)

for feature in geojson["features"]:
    props = feature.get("properties", {})
    admin = props.get("admin")
    formal_en = props.get("formal_en")

    if not admin or not formal_en:
        continue

    admin_escaped = admin.replace("'", "''")
    formal_en_escaped = formal_en.replace("'", "''")

    plpgsql = f"""
DO $$
BEGIN
    BEGIN
        INSERT INTO countries (id, name, geojson_name, note)
        VALUES ('{admin_escaped}', '{formal_en_escaped}', '{admin_escaped}', 'Added via Python script on {today}')
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            geojson_name = EXCLUDED.geojson_name,
            note = EXCLUDED.note;
    EXCEPTION 
        WHEN foreign_key_violation THEN
            INSERT INTO update_errors (country_id, error_msg, logged_at)
            VALUES ('{admin_escaped}', 'Foreign key violation during insert/update', now());
        WHEN unique_violation THEN
            INSERT INTO update_errors (country_id, error_msg, logged_at)
            VALUES ('{admin_escaped}', 'Unique constraint violation on name: {formal_en_escaped}', now());
    END;
END $$;
""".strip()

    plpgsql_blocks.append(plpgsql)

# 出力（もしくはファイル出力）
for block in plpgsql_blocks:
    print(block)
