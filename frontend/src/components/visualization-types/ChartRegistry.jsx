import React, { forwardRef } from "react";

import BaseCartesianEngine from "./engines/BaseCartesianEngine";
import BasePieEngine from "./engines/BasePieEngine";
import BaseHierarchyEngine from "./engines/BaseHierarchyEngine";
import BaseMatrixEngine from "./engines/BaseMatrixEngine";
import BaseKPIEngine from "./engines/BaseKPIEngine";

const withRef = (Component, extraProps = {}) =>
  forwardRef((props, ref) => (
    <Component ref={ref} {...props} {...extraProps} />
  ));

const ChartRegistry = {
  // CARTESIAN
  bar: withRef(BaseCartesianEngine, { type: "bar" }),
  stacked_bar: withRef(BaseCartesianEngine, {
    type: "bar",
    stacked: true
  }),
  line: withRef(BaseCartesianEngine, { type: "line" }),
  area: withRef(BaseCartesianEngine, {
    type: "line",
    area: true
  }),

  // PIE
  pie: withRef(BasePieEngine),
  donut: withRef(BasePieEngine, { donut: true }),
  rose: withRef(BasePieEngine, { rose: true }),

  // HIERARCHY
  treemap: withRef(BaseHierarchyEngine, { type: "treemap" }),
  sunburst: withRef(BaseHierarchyEngine, { type: "sunburst" }),

  // MATRIX
  heatmap: withRef(BaseMatrixEngine),

  // KPI
  gauge: withRef(BaseKPIEngine)
};

export default ChartRegistry;
