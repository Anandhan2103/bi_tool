import React, { forwardRef } from "react";
import ReactECharts from "echarts-for-react";

const BasePieEngine = forwardRef(
  ({ data, height = 400, donut = false, rose = false }, ref) => {
    if (!data?.labels || !data?.series) {
      return <div>No data available</div>;
    }

    const pieData = data.labels.map((label, i) => ({
      name: label,
      value: data.series[0]?.data[i] || 0
    }));

    const option = {
      tooltip: { trigger: "item" },
      legend: { top: 10 },
      series: [
        {
          type: "pie",
          radius: donut ? ["40%", "70%"] : "70%",
          roseType: rose ? "radius" : undefined,
          data: pieData
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
  }
);

export default BasePieEngine;
