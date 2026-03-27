export function recommendCharts({ xAxis, yAxis = [], dimensions = [] }) {
  const hasX = !!xAxis;
  const measureCount = yAxis.length;
  const hasMeasure = measureCount >= 1;
  const hasDimension = dimensions.includes(xAxis);

  const charts = [];

  // CARTESIAN
  if (hasX && hasMeasure) {
    charts.push(
      { type: "bar", label: "Bar" },
      { type: "stacked_bar", label: "Stacked Bar" },
      { type: "line", label: "Line" },
      { type: "area", label: "Area" },
      { type: "heatmap", label: "Heatmap" }
    );
  }

  // PIE
  if (hasDimension && measureCount === 1) {
    charts.push(
      { type: "pie", label: "Pie" },
      { type: "donut", label: "Donut" },
      { type: "rose", label: "Rose" }
    );
  }

  // HIERARCHY
  if (dimensions.length >= 2 && measureCount >= 1) {
    charts.push(
      { type: "treemap", label: "Treemap" },
      { type: "sunburst", label: "Sunburst" }
    );
  }

  // KPI
  if (!hasX && measureCount >= 1) {
    charts.push(
      { type: "gauge", label: "Gauge" }
    );
  }

  return charts;
}
