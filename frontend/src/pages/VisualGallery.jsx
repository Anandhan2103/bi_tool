import React from 'react';
import {
  BarChart,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Target,
  Network,
  GitBranch,
  ArrowRightLeft,
  CircleDot,
  LayoutGrid,
  ScatterChart
} from 'lucide-react';

import '../styles/visual-gallery.css';

const VisualIcon = ({ type }) => {
  const t = type.toLowerCase();

  if (t.includes('column')) return <BarChart3 size={24} />;
  if (t.includes('bar')) return <BarChart size={24} className="rotate-90" />;
  if (t.includes('line')) return <LineChart size={24} />;
  if (t.includes('pie') || t.includes('donut')) return <PieChart size={24} />;
  if (t.includes('scatter') || t.includes('dot')) return <ScatterChart size={24} />;
  if (t.includes('network')) return <Network size={24} />;
  if (t.includes('tree') || t.includes('structural')) return <GitBranch size={24} />;
  if (t.includes('flow')) return <ArrowRightLeft size={24} />;
  if (t.includes('gauge')) return <CircleDot size={24} />;
  if (t.includes('kpi') || t.includes('indicator')) return <Target size={24} />;
  if (t.includes('table')) return <LayoutGrid size={24} />;

  return <Activity size={24} />;
};

const Category = ({ title, items }) => (
  <section className="vg-category">
    <h3 className="vg-category-title">{title}</h3>

    <div className="vg-grid">
      {items.map((item, index) => (
        <div key={index} className="vg-card">
          <div className="vg-icon">
            <VisualIcon type={item} />
          </div>
          <span className="vg-label">{item}</span>
        </div>
      ))}
    </div>
  </section>
);

const VisualGallery = () => {
  const categories = [
    { title: 'Comparison', items: ['Column Chart', 'Bar Chart', 'Line Chart'] },
    { title: 'Correlational', items: ['Euler Diagram', 'Correlogram', 'Speed Curve', 'Fan Chart'] },
    { title: 'Trend', items: ['Area Chart', 'Timeline', 'Cycle', 'Streamgraph', 'Run Chart', 'Spark Line'] },
    { title: 'Composition', items: ['Stacked Column', 'Stacked Area', 'Pie Chart', 'Donut Chart', 'Treemap', 'Sunburst', 'Waterfall'] },
    { title: 'Density', items: ['Hexbin Plot', 'Dot Density', 'Contour'] },
    { title: 'Distribution', items: ['Histogram', 'Scatter Chart', 'Bubble Timeline'] },
    { title: 'Gauge / Indicator', items: ['Gauge Chart', 'Progress Bar', 'Bullet Graph'] },
    { title: 'Ranking', items: ['Step Chart', 'Slope Chart'] },
    { title: 'Flow', items: ['Sankey Diagram', 'Alluvial Diagram', 'Chord Diagram'] },
    { title: 'Structural', items: ['Organization Chart', 'ER Diagram'] }
  ];

  return (
    <div className="visual-gallery">

      {/* HEADER */}
      <header className="vg-header">
        <div className="vg-brand">
          <BarChart3 size={32} />
          <span>NutMeg Standards</span>
        </div>

        <h1 className="vg-title">
          50 Ways to Visualize Data<span>.</span>
        </h1>

        <p className="vg-subtitle">
          Explore our comprehensive library of visualization methodologies
          optimized for enterprise-grade business intelligence.
        </p>
      </header>

      {/* CATEGORIES */}
      <div className="vg-content">
        {categories.map((category, index) => (
          <Category
            key={index}
            title={category.title}
            items={category.items}
          />
        ))}
      </div>

      {/* FOOTER */}
      <footer className="vg-footer">
        <span>v1.4 Enterprise Pack</span>
        <span>© 2024 NutMeg Systems Inc.</span>
      </footer>

    </div>
  );
};

export default VisualGallery;
