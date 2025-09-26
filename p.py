import pandas as pd

# さっき使ったCSVファイルを読み込み
csv_file = "sc.csv"  # ←ファイル名書き換えてね
df = pd.read_csv(csv_file)

# 削除対象のIDリストだけ取得
ids = df["id"].dropna().unique().tolist()

# 出力ファイルを分割用に
batch_size = 2500  # 1ファイルあたり500行ずつに分割
for i in range(0, len(ids), batch_size):
    batch = ids[i : i + batch_size]
    filename = f"delete_batch_{i // batch_size + 1}.sql"

    with open(filename, "w", encoding="utf-8") as f:
        for id_val in batch:
            id_val = str(id_val).strip()  # 空白除去
            if id_val:  # 空じゃないなら
                # 存在チェックしてから削除するSQLを出力
                f.write(
                    f"""DELETE FROM scientific_names WHERE id = '{id_val}' AND id IN (SELECT id FROM scientific_names);\n"""
                )
    print(f"作成完了: {filename}")
