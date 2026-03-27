// frontend/src/utils/isChartValid.js

import { CHART_CAPABILITIES } from "../constants/chartCapabilities";

export function isChartValid({
  chartType,
  xAxis,
  yAxis = [],
  dimensions = [],
  series
}) {
  const rule = CHART_CAPABILITIES[chartType];
  if (!rule) return false;

  // Hierarchy charts
  if (rule.dimensions) {
    return (
      dimensions.length >= rule.dimensions[0] &&
      yAxis.length >= rule.y[0]
    );
  }

  // X-axis requirement
  if (rule.x === 1 && !xAxis) return false;
  if (rule.x === 0 && xAxis) return false;

  // Y-axis requirement
  const [minY, maxY] = rule.y;
  if (yAxis.length < minY) return false;
  if (yAxis.length > maxY) return false;

  // Series support
  if (series && rule.series === false) return false;

  return true;
}
