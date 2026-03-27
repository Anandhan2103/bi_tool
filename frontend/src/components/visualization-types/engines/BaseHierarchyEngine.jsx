import React, { forwardRef } from "react";
import ReactECharts from "echarts-for-react";

const BaseHierarchyEngine = forwardRef(
  ({ data, type, height = 400 }, ref) => {
    if (!data?.labels || !data?.series) {
      return <div>No hierarchy data available</div>;
    }

    // 🔥 Convert flat data → hierarchy format
    const treeData = data.labels.map((label, index) => ({
      name: label,
      value: data.series[0]?.data[index] || 0
    }));

    const option = {
      tooltip: { trigger: "item" },
      series: [
        {
          type,
          data: treeData,
          radius: type === "sunburst" ? "80%" : undefined
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

export default BaseHierarchyEngine;
