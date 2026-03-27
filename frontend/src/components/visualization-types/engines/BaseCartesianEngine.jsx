import React, { forwardRef } from "react";
import ReactECharts from "echarts-for-react";

const BaseCartesianEngine = forwardRef(
  (
    {
      data,
      height = 400,
      type = "bar",
      stacked = false,
      area = false,
      step = false,
      horizontal = false
    },
    ref
  ) => {
    if (!data?.labels || !data?.series) {
      return <div>No data available</div>;
    }

    const option = {
      tooltip: { trigger: "axis" },
      legend: { top: 10 },

      xAxis: horizontal
        ? { type: "value" }
        : { type: "category", data: data.labels },

      yAxis: horizontal
        ? { type: "category", data: data.labels }
        : { type: "value" },

      series: data.series.map(s => ({
        name: s.name,
        type,
        data: s.data,
        stack: stacked ? "total" : undefined,
        areaStyle: area ? {} : undefined,
        step: step ? true : undefined
      }))
    };

    return (
      <ReactECharts
        ref={ref}
        option={option}
        style={{ height }}
        notMerge
        lazyUpdate
      />
    );
  }
);

export default BaseCartesianEngine;
