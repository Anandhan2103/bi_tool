// frontend/src/constants/chartCapabilities.js

export const CHART_CAPABILITIES = {
  // CARTESIAN
  bar:            { x: 1, y: [1, Infinity], series: true },
  stacked_bar:    { x: 1, y: [1, Infinity], series: true },
  grouped_bar:    { x: 1, y: [1, Infinity], series: true },
  line:           { x: 1, y: [1, Infinity], series: true },
  multi_line:     { x: 1, y: [2, Infinity], series: true },
  area:           { x: 1, y: [1, Infinity], series: true },
  stacked_area:   { x: 1, y: [1, Infinity], series: true },
  scatter:        { x: 1, y: [2, 2], series: false },
  bubble:         { x: 1, y: [3, 3], series: false },
  heatmap:        { x: 1, y: [1, 1], series: true },
  radar:          { x: 1, y: [2, Infinity], series: false },

  // DISTRIBUTION
  pie:            { x: 1, y: [1, 1], series: false },
  donut:          { x: 1, y: [1, 1], series: false },
  rose:           { x: 1, y: [1, 1], series: false },
  funnel:         { x: 1, y: [1, 1], series: false },

  // KPI / TABLE
  kpi:            { x: 0, y: [1, 1], series: false },
  gauge:          { x: 0, y: [1, 1], series: false },
  table:          { x: 0, y: [1, Infinity], series: false },

  // HIERARCHY
  treemap:        { dimensions: [2, Infinity], y: [1, 1] },
  sunburst:       { dimensions: [2, Infinity], y: [1, 1] },
  icicle:         { dimensions: [2, Infinity], y: [1, 1] }
};
