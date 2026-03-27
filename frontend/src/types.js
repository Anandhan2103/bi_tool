export const CHART_CAPABILITIES = {
  bar: {
    label: "Bar",
    requires: { x: 1, y: 1 },
    category: "cartesian"
  },
  line: {
    label: "Line",
    requires: { x: 1, y: 1 },
    category: "cartesian"
  },
  area: {
    label: "Area",
    requires: { x: 1, y: 1 },
    category: "cartesian"
  },
  grouped_bar: {
    label: "Grouped Bar",
    requires: { x: 1, y: 2 },
    category: "cartesian"
  },
  multi_line: {
    label: "Multi Line",
    requires: { x: 1, y: 2 },
    category: "cartesian"
  },
  pie: {
    label: "Pie",
    requires: { x: 1, y: 1 },
    category: "distribution"
  },
  donut: {
    label: "Donut",
    requires: { x: 1, y: 1 },
    category: "distribution"
  },
  treemap: {
    label: "Treemap",
    requires: { dimensions: 2, y: 1 },
    category: "hierarchy"
  },
  sunburst: {
    label: "Sunburst",
    requires: { dimensions: 2, y: 1 },
    category: "hierarchy"
  },
  kpi: {
    label: "KPI",
    requires: { y: 1 },
    category: "kpi"
  },
  table: {
    label: "Table",
    requires: { dataset: true },
    category: "table"
  }
};
