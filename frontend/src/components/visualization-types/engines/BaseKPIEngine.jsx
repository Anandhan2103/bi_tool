import React, { forwardRef } from "react";
import ReactECharts from "echarts-for-react";

const BaseKPIEngine = forwardRef(({ data, height = 300 }, ref) => {
  const value =
    data?.series?.[0]?.data?.[0] ??
    0;

  const option = {
    series: [
      {
        type: "gauge",
        progress: { show: true },
        detail: { valueAnimation: true },
        data: [{ value }]
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

export default BaseKPIEngine;
