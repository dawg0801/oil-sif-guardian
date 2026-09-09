import React, { useState } from 'react';

interface DataPoint {
  month: string;
  precursors: number;
  highPsif: number;
  mitigated: number;
}

const DATA_POINTS: DataPoint[] = [
  { month: 'Jan', precursors: 85, highPsif: 14, mitigated: 78 },
  { month: 'Feb', precursors: 92, highPsif: 18, mitigated: 86 },
  { month: 'Mar', precursors: 110, highPsif: 24, mitigated: 98 },
  { month: 'Apr', precursors: 105, highPsif: 19, mitigated: 101 },
  { month: 'May', precursors: 125, highPsif: 28, mitigated: 115 },
  { month: 'Jun', precursors: 118, highPsif: 22, mitigated: 112 },
  { month: 'Jul', precursors: 135, highPsif: 31, mitigated: 128 },
  { month: 'Aug', precursors: 142, highPsif: 34, mitigated: 136 },
  { month: 'Sep', precursors: 130, highPsif: 23, mitigated: 124 },
  { month: 'Oct', precursors: 122, highPsif: 20, mitigated: 118 },
  { month: 'Nov', precursors: 115, highPsif: 18, mitigated: 110 },
  { month: 'Dec', precursors: 128, highPsif: 22, mitigated: 122 },
];

export const PrecursorTrendChart: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(7); // Default hover on Aug (peak)
  const [timeframe, setTimeframe] = useState<'1M' | '6M' | '1Y'>('1Y');

  // Chart dimensions with extra top padding so tooltips never clip
  const width = 760;
  const height = 270;
  const paddingX = 40;
  const paddingY = 40;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const maxVal = 160;

  // Calculate SVG points
  const points = DATA_POINTS.map((d, i) => {
    const x = paddingX + (i / (DATA_POINTS.length - 1)) * graphWidth;
    const y = height - paddingY - (d.precursors / maxVal) * graphHeight;
    return { x, y, ...d };
  });

  const mitigatedPoints = DATA_POINTS.map((d, i) => {
    const x = paddingX + (i / (DATA_POINTS.length - 1)) * graphWidth;
    const y = height - paddingY - (d.mitigated / maxVal) * graphHeight;
    return { x, y, ...d };
  });

  // Bezier curve string generator
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;
  const mitigatedLinePath = createSmoothPath(mitigatedPoints);

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  // Smart Tooltip Orientation to prevent top cut-off & edge clipping
  const isFlippedBelow = activePoint ? activePoint.y < 95 : false;

  const getTooltipTransform = () => {
    if (hoveredIdx === null) return isFlippedBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)';
    if (hoveredIdx <= 1) {
      return isFlippedBelow ? 'translateX(10px)' : 'translate(10px, -100%)';
    }
    if (hoveredIdx >= points.length - 2) {
      return isFlippedBelow ? 'translateX(calc(-100% - 10px))' : 'translate(calc(-100% - 10px), -100%)';
    }
    return isFlippedBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)';
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Chart Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color-subtle)',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Precursor Ingestion vs Mitigated Barriers
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--accent-emerald-light)',
                color: '#0D9488',
              }}
            >
              Live Telemetry
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            12-month trajectory calibrated under IOGP Life-Saving Rules
          </p>
        </div>

        {/* Legend & Timeframe controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0D9488' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Precursors</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFB020' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Mitigated</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid var(--border-color-subtle)',
            }}
          >
            {(['1M', '6M', '1Y'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: timeframe === t ? 'var(--accent-emerald-dark)' : 'transparent',
                  color: timeframe === t ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas Container with ample top padding for tooltip */}
      <div style={{ position: 'relative', width: '100%', overflow: 'visible', paddingTop: '10px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible', userSelect: 'none' }}
        >
          <defs>
            <linearGradient id="precursorTealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="mitigatedGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB020" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FFB020" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 40, 80, 120, 160].map((val) => {
            const y = height - paddingY - (val / maxVal) * graphHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--border-color-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 12}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-dim)"
                  fontFamily="var(--font-mono)"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#precursorTealGrad)" />

          {/* Smooth Lines */}
          <path
            d={mitigatedLinePath}
            fill="none"
            stroke="#FFB020"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={linePath}
            fill="none"
            stroke="#0D9488"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Interactive Month Columns */}
          {points.map((pt, i) => (
            <g
              key={i}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
            >
              {/* Wide invisible hit area */}
              <rect
                x={pt.x - 22}
                y={paddingY}
                width={44}
                height={graphHeight + 20}
                fill="transparent"
              />

              {/* Month label */}
              <text
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fontWeight={hoveredIdx === i ? '800' : '600'}
                fill={hoveredIdx === i ? 'var(--accent-emerald-dark)' : 'var(--text-muted)'}
                fontFamily="var(--font-sans)"
              >
                {pt.month}
              </text>

              {/* Highlight guide & points */}
              {hoveredIdx === i && (
                <>
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={height - paddingY}
                    stroke="#0D9488"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.5"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="6.5"
                    fill="#0D9488"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={pt.x}
                    cy={mitigatedPoints[i].y}
                    r="5"
                    fill="#FFB020"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Floating Tooltip - Fixed against clipping & edge cutoff */}
        {activePoint && (
          <div
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              transform: getTooltipTransform(),
              paddingBottom: isFlippedBelow ? '0' : '12px',
              paddingTop: isFlippedBelow ? '12px' : '0',
              left: `${(activePoint.x / width) * 100}%`,
              top: isFlippedBelow
                ? `calc(${(activePoint.y / height) * 100}% + 10px)`
                : `${(activePoint.y / height) * 100}%`,
              transition: 'left 0.12s ease, top 0.12s ease',
              zIndex: 30,
            }}
          >
            <div
              style={{
                backgroundColor: '#07382F',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: '12px',
                boxShadow: '0 12px 28px -4px rgba(7, 56, 47, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
            >
              {/* Top arrow if flipped below */}
              {isFlippedBelow && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#07382F',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0D9488' }} />
                <span>{activePoint.precursors} Precursors Ingested</span>
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#FFB020', marginTop: '3px' }}>
                {activePoint.highPsif} High-PSIF • {activePoint.mitigated} Barriers Mitigated
              </span>

              {/* Bottom arrow if flipped above */}
              {!isFlippedBelow && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#07382F',
                    borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
