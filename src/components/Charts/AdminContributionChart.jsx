// src/components/ProtectedRoute/Admin/AdminContributionChart.jsx
"use client";

import React, { useMemo } from "react";
import { Typography, Paper } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from "recharts";

export default function AdminContributionChart({ logs, lang }) {
  // 管理者ごとのログ件数とパーセンテージを集計
  const data = useMemo(() => {
    const counts = {};
    logs.forEach(({ changed_by }) => {
      const user = changed_by || "Unknown";
      counts[user] = (counts[user] || 0) + 1;
    });
    const entries = Object.entries(counts).map(([user, count]) => ({ user, count }));
    const total = entries.reduce((sum, { count }) => sum + count, 0) || 1;

    return entries
      .map(({ user, count }) => {
        const percentValue = (count / total) * 100;
        const percent = percentValue.toFixed(1); // 小数第一位まで
        return {
          user,
          count,
          percent, // 数値的なパーセンテージ
          label: `${count} (${percent}%)`
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  // lang によるタイトルと言語切替
  const chartTitle = lang === "ja" ? "データ管理における管理者貢献度" : "Admin Contributions on Data Manegement";
  const chartDescription = lang === "ja"
    ? "データベースへのデータ追加や修正などの作業件数をログ情報に基づいて表示しています。貢献度は、全作業件数に対する各ユーザーによる作業件数の割合で算出しています。"
    : "This chart displays the number of database operations—such as data additions and modifications—based on audit logs. Contribution percentages represent each user's share of the total log entries.";
  const barName     = lang === "ja" ? "変更数"       : "Changes";

  return (
    <Paper sx={{ p: 2, my: 4, backgroundColor: "#1e1e1e" }}>
      <Typography
        variant="h6"
        sx={{ color: "#fff", mb: 2, textAlign: "center" }}
      >
        {chartTitle}
      </Typography>

      <Typography variant="body2">
        {chartDescription}
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 20, bottom: 20, left: 120 }}
          barCategoryGap={8}
        >
          <CartesianGrid stroke="#444" vertical={false} strokeDasharray="3 3" />

          <XAxis
            type="number"
            tick={{ fill: "#ddd", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            dataKey="user"
            type="category"
            width={120}
            tick={{ fill: "#ddd", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#222",
              border: "1px solid #555",
              borderRadius: 4,
              color: "#fff",
              fontSize: 13
            }}
            cursor={{ fill: "rgba(255,255,255,0.1)" }}
            formatter={(value, name, props) => {
              // value: count, props.payload.percent にパーセント
              const pct = props.payload.percent;
              return [`${value} (${pct}%)`, name];
            }}
          />

          <Bar
            dataKey="count"
            name={barName}
            fill="#82ca9d"
            barSize={24}
          >
            <LabelList
              dataKey="label"
              position="right"
              style={{ fill: "#fff", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
