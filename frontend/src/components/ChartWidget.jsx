import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState
} from "react";
import ChartRegistry from "./visualization-types/ChartRegistry";
import api from "../api/api";

const ChartWidget = forwardRef(
  (
    {
      chartType,
      data,
      reportId,
      filters = {},
      height = "100%"
    },
    ref
  ) => {
    const internalRef = useRef(null);
    const [loadedData, setLoadedData] = useState(null);
    const [loadedChartType, setLoadedChartType] = useState(null);
    const [loading, setLoading] = useState(false);

    useImperativeHandle(ref, () => ({
      getImage: () => {
        if (!internalRef.current?.getEchartsInstance) return null;
        return internalRef.current.getEchartsInstance().getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff"
        });
      }
    }));

    // ✅ Dashboard mode → fetch from backend
useEffect(() => {
  if (!reportId) return;

  const fetchReport = async () => {
    try {
      setLoading(true);

      const res = await api.post("/reports/run", {
        report_id: reportId,
        filters: filters || {}
      });

      // small delay for smoother shimmer UX
      setTimeout(() => {
        setLoadedChartType(res.data.config.chartType);
        setLoadedData(res.data.data);
        setLoading(false);
      }, 400);

    } catch (err) {
      console.error("Failed to load report:", err.response?.data || err.message);
      setLoading(false);
    }
  };

  fetchReport();
}, [reportId, JSON.stringify(filters)]);

    // Decide final values
    const finalChartType =
      reportId && loadedChartType ? loadedChartType : chartType;

    const finalData =
      reportId && loadedData ? loadedData : data;

    if (!finalChartType) {
      return <div style={{ padding: 20 }}>No chart type selected</div>;
    }

    const SelectedChart = ChartRegistry[finalChartType];

    if (!SelectedChart) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          Chart type not implemented: {finalChartType}
        </div>
      );
    }

if (loading || !finalData) {
  return <ChartSkeleton />;
}

    return (
      <SelectedChart
        ref={internalRef}
        data={finalData}
        height={height}
      />
    );
  }
);
const ChartSkeleton = () => {
  return (
    <div className="chart-skeleton">
      <div className="skeleton-header"></div>
      <div className="skeleton-body"></div>
    </div>
  );
};

export default ChartWidget;
