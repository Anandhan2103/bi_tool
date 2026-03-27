/* ================= IMPORTS ================= */
import BarChart from "./cartesian/BarChart";
import GroupedBarChart from "./cartesian/GroupedBarChart";
import LineChart from "./cartesian/LineChart";
import AreaChart from "./cartesian/AreaChart";
import SplineChart from "./cartesian/SplineChart";
import StepLineChart from "./cartesian/StepLineChart";
import StackedBarChart from "./cartesian/StackedBarChart";
import StackedAreaChart from "./cartesian/StackedAreaChart";
import RangeBarChart from "./cartesian/RangeBarChart";
import HorizontalBarChart from "./cartesian/HorizontalBarChart";
import PercentageStackedBarChart from "./cartesian/PercentageStackedBarChart";
import MultiLineChart from "./cartesian/MultiLineChart";
import AreaSplineChart from "./cartesian/AreaSplineChart";
import DualAxisChart from "./cartesian/DualAxisChart";
import WaterfallChart from "./cartesian/WaterfallChart";
import RangeAreaChart from "./cartesian/RangeAreaChart";
import StackedLineChart from "./cartesian/StackedLineChart";

import ScatterPlot from "./comparison/ScatterPlot";
import BubbleChart from "./comparison/BubbleChart";
import RadarChart from "./comparison/RadarChart";
import HeatmapChart from "./comparison/HeatmapChart";
import CorrelationMatrix from "./comparison/CorrelationMatrix";

import PieChart from "./distribution/PieChart";
import DonutChart from "./distribution/DonutChart";
import SemiDonutChart from "./distribution/SemiDonutChart";
import RoseChart from "./distribution/RoseChart";
import FunnelChart from "./distribution/FunnelChart";
import PyramidChart from "./distribution/PyramidChart";
import Sunburst from "./distribution/Sunburst";

import Treemap from "./maps/Treemap";

import DataTable from "./tables/DataTable";

/* ================= CHART TYPE MAP ================= */

const visualizationMap = {
  // BASIC
  bar: BarChart,
  line: LineChart,
  area: AreaChart,
  spline: SplineChart,

  // BAR VARIANTS
  grouped_bar: GroupedBarChart,
  stacked_bar: StackedBarChart,
  horizontal_bar: HorizontalBarChart,
  percent_stacked_bar: PercentageStackedBarChart,

  // LINE VARIANTS
  multi_line: MultiLineChart,
  step_line: StepLineChart,
  stacked_line: StackedLineChart,
  area_spline: AreaSplineChart,
  stacked_area: StackedAreaChart,
  range_bar: RangeBarChart,
  range_area: RangeAreaChart,
  dual_axis: DualAxisChart,
  waterfall: WaterfallChart,

  // DISTRIBUTION
  pie: PieChart,
  donut: DonutChart,
  semi_donut: SemiDonutChart,
  rose: RoseChart,
  funnel: FunnelChart,
  pyramid: PyramidChart,
  sunburst: Sunburst,

  // COMPARISON
  scatter: ScatterPlot,
  bubble: BubbleChart,
  radar: RadarChart,
  heatmap: HeatmapChart,
  correlation_matrix: CorrelationMatrix,

  // MAPS
  treemap: Treemap,

  // TABLE
  table: DataTable
};

export default visualizationMap;
