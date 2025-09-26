// src/components/Charts/MyPieChart.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MyPieChart = ({
  data,
  dataKey = "value",
  nameKey = "name",
  outerRadius = 150,
  innerRadius = 0,
  colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#FF5E57", "#845EC2"],
  label, // ラベル描画用の関数
  ...rest
}) => {
  return (
    <ResponsiveContainer width="100%" height={500}>
      <PieChart {...rest}>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          label={label}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: "14px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default MyPieChart;
