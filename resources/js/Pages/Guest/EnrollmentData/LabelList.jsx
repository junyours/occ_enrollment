<LabelList
  dataKey="fullName"
  position="top"
  content={({ x, y, value }) => (
    <text
      x={x}
      y={y - 10}
      fill="#333"
      textAnchor="middle"
      fontSize={11}
    >
      {value}
    </text>
  )}
/>
