import React, { forwardRef } from "react";
import ReactECharts from "echarts-for-react";

const BaseMatrixEngine = forwardRef(({ data, height = 400 }, ref) => {
  if (!data?.labels || !data?.series) {
    return <div>No data available</div>;
  }

  const heatData = [];

  data.series.forEach((s, yIndex) => {
    s.data.forEach((v, xIndex) => {
      heatData.push([xIndex, yIndex, v]);
    });
  });

  const option = {
    tooltip: { position: "top" },
    xAxis: { type: "category", data: data.labels },
    yAxis: { type: "category", data: data.series.map(s => s.name) },
    visualMap: {
      min: 0,
      max: Math.max(...heatData.map(d => d[2])),
      calculable: true,
      orient: "horizontal",
      left: "center"
    },
    series: [
      {
        type: "heatmap",
        data: heatData
      }
    ]
  };

  return (
    <ReactECharts
      ref={ref}
      option={option}
      style={{ height }}
    />
  );
});

export default BaseMatrixEngine;
