import React, { useState, useEffect } from 'react';
import {
  Layers,
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Network,
  Cpu,
  RefreshCw,
  Search,
  Flame,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronRight,
  Sliders,
  Building2,
  Info,
  Check,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import {
  PrecursorCluster,
  ClusterGraphData,
  ClusterGraphNode,
  SIFFingerprintResult,
  BarrierAnalysisResult,
  BaselineComparisonResult
} from '../types';

export const PrecursorClusterView: React.FC = () => {
  const [clusters, setClusters] = useState<PrecursorCluster[]>([]);
  const [graphData, setGraphData] = useState<ClusterGraphData | null>(null);
  const [comparison, setComparison] = useState<BaselineComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<PrecursorCluster | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<ClusterGraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuleFilter, setSelectedRuleFilter] = useState('ALL');

  // Live SIF Fingerprint Analyzer State
  const [analyzerText, setAnalyzerText] = useState(
    'During turnaround maintenance at EPS-1, a contractor entered the crude separator vessel without continuous gas testing and the standby attendant was absent.'
  );
  const [fingerprint, setFingerprint] = useState<SIFFingerprintResult | null>(null);
  const [barrierAnalysis, setBarrierAnalysis] = useState<BarrierAnalysisResult | null>(null);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  useEffect(() => {
    loadData();
    runLiveAnalysis(analyzerText);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clusterList, graph, compData] = await Promise.all([
        api.getPrecursorClusters(),
        api.getPrecursorGraph(),
        api.evaluateBaselineComparison().catch(() => null)
      ]);
      setClusters(clusterList);
      if (clusterList.length > 0) setSelectedCluster(clusterList[0]);
      setGraphData(graph);
      if (compData) setComparison(compData);
    } catch (err) {
      console.error('Error loading precursor cluster data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runLiveAnalysis = async (text: string) => {
    if (!text.trim()) return;
    setAnalyzingText(true);
    try {
      const [fp, barriers] = await Promise.all([
        api.generateFingerprint(text, 'Maintenance', 'EPS-1'),
        api.analyzeBarriers(text)
      ]);
      setFingerprint(fp);
      setBarrierAnalysis(barriers);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzingText(false);
    }
  };

  const handleRunComparativeBenchmark = async () => {
    setEvaluating(true);
    try {
      const res = await api.evaluateBaselineComparison();
      setComparison(res);
    } catch (err) {
      console.error('Error evaluating baseline:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCopyFingerprint = () => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint.fingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const presetScenarios = [
    {
      title: 'Vessel Entry (EPS-1)',
      text: 'During turnaround maintenance at EPS-1, a contractor entered the crude separator vessel without continuous gas testing and the standby attendant was absent.'
    },
    {
      title: 'Wellhead LOTO (Rig OIL-45)',
      text: 'Technician cracked open the casing wing valve on Rig OIL-45 without verifying zero energy state. Residual trapped pressure of 350 psi vented violently.'
    },
    {
      title: 'Crane Drop Zone (Duliajan)',
      text: 'Rigger walked directly under 6-ton drill collar suspended by mobile crane while tag line snapped during high wind gusts at Duliajan yard.'
    },
    {
      title: 'Hot Work Near Flare (OCS-4)',
      text: 'Welder ignited cutting torch 4 meters from flare knock-out drum at OCS-4 Moran without continuous LEL monitoring or fire watch.'
    }
  ];

  const filteredClusters = clusters.filter(c => {
    const matchesSearch =
      c.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.common_failure.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.exposure_fingerprint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRule = selectedRuleFilter === 'ALL' || c.primary_iogp_rule === selectedRuleFilter;
    return matchesSearch && matchesRule;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* ====================================================================
          MASTER HEADER
          ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                color: '#0D9488',
                border: '1px solid rgba(13, 148, 136, 0.2)',
              }}
            >
              <Network style={{ width: '13px', height: '13px' }} />
              Precursor Topology & Barrier Intelligence
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-pill)',
                color: 'var(--text-muted)',
              }}
            >
              Swiss Cheese Model Calibrated
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Systemic Precursor Clusters & Barrier Taxonomy
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '720px' }}>
            Automated SIF Exposure Fingerprinting, Swiss Cheese barrier degradation surveillance & multi-facility network topology.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '9px 16px', fontSize: '12.5px' }}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Clusters</span>
        </button>
      </div>

      {/* ====================================================================
          SECTION 1: Interactive SIF Exposure Fingerprint Analyzer
          ==================================================================== */}
      <div
        className="card-panel"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.6) 0%, var(--bg-surface) 100%)',
          border: '1px solid rgba(13, 148, 136, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D9488',
              }}
            >
              <Zap style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live SIF Exposure Fingerprint & Barrier Analyzer
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontFamily: 'var(--font-mono)' }}>
                Formula: [ACTIVITY] | [ENERGY] | [HAZARD] | [BARRIER_FAILURE] | [IOGP_RULE]
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>OIL Presets:</span>
            {presetScenarios.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setAnalyzerText(p.text);
                  runLiveAnalysis(p.text);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-color-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Narrative Input */}
        <div>
          <textarea
            value={analyzerText}
            onChange={(e) => {
              setAnalyzerText(e.target.value);
              runLiveAnalysis(e.target.value);
            }}
            rows={2}
            className="form-textarea"
            style={{ fontSize: '12.5px', lineHeight: 1.5, resize: 'none' }}
            placeholder="Type any incident narrative to extract SIF Exposure Fingerprint and inspect barrier health..."
          />
        </div>

        {/* 5-Tuple Visual Breakdown */}
        {fingerprint && (
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0D9488', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders style={{ width: '14px', height: '14px' }} />
                <span>Codified 5-Tuple SIF Fingerprint</span>
              </span>

              <button
                onClick={handleCopyFingerprint}
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: '11px' }}
              >
                <Copy style={{ width: '12px', height: '12px' }} />
                <span>{copiedFingerprint ? 'Copied!' : 'Copy Tuple'}</span>
              </button>
            </div>

            {/* 5 Component Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0891B2' }}>Activity</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fingerprint.activity}>
                  {fingerprint.activity}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(147, 51, 234, 0.08)', border: '1px solid rgba(147, 51, 234, 0.25)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#9333EA' }}>Energy</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fingerprint.hazardous_energy}>
                  {fingerprint.hazardous_energy}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#E11D48' }}>Hazard</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fingerprint.hazard}>
                  {fingerprint.hazard}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#DC2626' }}>Barrier Failure</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fingerprint.barrier_failure}>
                  {fingerprint.barrier_failure}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#D97706' }}>IOGP Rule</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fingerprint.iogp_rule}>
                  {fingerprint.iogp_rule}
                </div>
              </div>
            </div>

            {/* Tuple String Badge */}
            <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#0D9488', wordBreak: 'break-all' }}>
              {fingerprint.fingerprint}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              "{fingerprint.explanation}"
            </p>
          </div>
        )}

        {/* Barrier Health & Degradation Status */}
        {barrierAnalysis && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: '16px' }}>
            {/* Barrier Health Score Card */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Barrier Health Index
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '34px',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: barrierAnalysis.barrier_health_score < 0.5 ? '#DC2626' : barrierAnalysis.barrier_health_score < 0.8 ? '#D97706' : '#059669',
                  }}
                >
                  {Math.round(barrierAnalysis.barrier_health_score * 100)}%
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    backgroundColor: barrierAnalysis.sif_barrier_flag === 'CRITICAL_FAILURE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: barrierAnalysis.sif_barrier_flag === 'CRITICAL_FAILURE' ? '#DC2626' : '#059669',
                  }}
                >
                  {barrierAnalysis.sif_barrier_flag}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${barrierAnalysis.barrier_health_score * 100}%`,
                    height: '100%',
                    backgroundColor: barrierAnalysis.barrier_health_score < 0.5 ? '#EF4444' : barrierAnalysis.barrier_health_score < 0.8 ? '#F59E0B' : '#10B981',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {barrierAnalysis.has_critical_failure ? (
                  <span style={{ color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '14px', height: '14px' }} />
                    Critical Barrier Compromised
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px' }} />
                    Barriers Functionally Intact
                  </span>
                )}
              </div>
            </div>

            {/* Manifested Barriers List */}
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Detected Barriers & Degradation States ({barrierAnalysis.detected_barriers.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                {barrierAnalysis.detected_barriers.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                    No specific barrier failures manifested in narrative.
                  </div>
                ) : (
                  barrierAnalysis.detected_barriers.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: '#0D9488', marginRight: '6px' }}>
                            [{b.barrier_id}]
                          </span>
                          {b.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.evidence}</div>
                      </div>

                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: b.state === 'EFFECTIVE' ? 'rgba(16, 185, 129, 0.12)' : b.state === 'DEGRADED' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: b.state === 'EFFECTIVE' ? '#059669' : b.state === 'DEGRADED' ? '#D97706' : '#DC2626',
                        }}
                      >
                        {b.state}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          SECTION 2: Systemic Precursor Clusters Explorer
          ==================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Layers style={{ width: '16px', height: '16px' }} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Recurring Precursor Clusters ({filteredClusters.length})
            </h3>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cluster theme or failure..."
                style={{
                  width: '100%',
                  height: '34px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: '9999px',
                  padding: '0 12px 0 30px',
                  fontSize: '11.5px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={selectedRuleFilter}
              onChange={(e) => setSelectedRuleFilter(e.target.value)}
              className="form-select"
              style={{ height: '34px', fontSize: '11.5px', padding: '0 26px 0 10px' }}
            >
              <option value="ALL">All IOGP Rules</option>
              <option value="Confined Space">Confined Space</option>
              <option value="Energy Isolation">Energy Isolation</option>
              <option value="Safe Mechanical Lifting">Safe Mechanical Lifting</option>
              <option value="Working at Height">Working at Height</option>
              <option value="Hot Work">Hot Work</option>
              <option value="Line of Fire">Line of Fire</option>
              <option value="Bypassing Safety Controls">Bypassing Safety Controls</option>
              <option value="Driving">Driving</option>
              <option value="Work Authorization">Work Authorization</option>
            </select>
          </div>
        </div>

        {/* Clusters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredClusters.map((c) => {
            const isSelected = selectedCluster?.cluster_id === c.cluster_id;
            return (
              <div
                key={c.cluster_id}
                onClick={() => setSelectedCluster(c)}
                className={`precursor-cluster-card ${isSelected ? 'active' : ''}`}
                style={{
                  border: isSelected ? '2px solid var(--accent-emerald-dark)' : '1px solid var(--border-color-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color-subtle)' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(13, 148, 136, 0.1)',
                        color: '#0D9488',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {c.cluster_id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Flame style={{ width: '13px', height: '13px' }} />
                        {c.reports_count} Incidents
                      </span>
                      {c.high_psif_count > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#DC2626',
                          }}
                        >
                          {c.high_psif_count} PSIF
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 8px 0', lineHeight: 1.35 }}>
                    {c.theme}
                  </h4>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Common Failure: </span>
                      <strong style={{ color: '#B91C1C' }}>{c.common_failure}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Hazard: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.hazard}</span>
                    </div>
                  </div>

                  {/* Fingerprint Box */}
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color-subtle)',
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono)',
                      color: '#0D9488',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Zap style={{ width: '11px', height: '11px', display: 'inline', marginRight: '4px', color: '#D97706' }} />
                    {c.exposure_fingerprint}
                  </div>
                </div>

                {/* Facilities & Recurrence */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 style={{ width: '13px', height: '13px' }} />
                    {c.facility_count} Facilities
                  </span>
                  <span style={{ fontWeight: 700, color: '#D97706', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
                    Recurrence Score: {c.recurrence_score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          SECTION 3: Statistical Baseline Benchmark
          ==================================================================== */}
      {comparison && (
        <div className="card-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <Cpu style={{ width: '16px', height: '16px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Scientific Baseline Benchmark & Guardrail Verification
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Comparing Deterministic Guardrail vs TF-IDF Classifier vs Calibrated Hybrid Engine
                </p>
              </div>
            </div>

            <button
              onClick={handleRunComparativeBenchmark}
              disabled={evaluating}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '11.5px' }}
            >
              <RefreshCw style={{ width: '12px', height: '12px' }} className={evaluating ? 'animate-spin' : ''} />
              <span>{evaluating ? 'Re-benchmarking...' : 'Re-run Benchmark'}</span>
            </button>
          </div>

          {/* Benchmark Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Model Architecture</th>
                  <th style={{ padding: '10px 14px' }}>High-PSIF Recall</th>
                  <th style={{ padding: '10px 14px' }}>Precision</th>
                  <th style={{ padding: '10px 14px' }}>F1 Score</th>
                  <th style={{ padding: '10px 14px' }}>Accuracy</th>
                  <th style={{ padding: '10px 14px' }}>Rule Match %</th>
                  <th style={{ padding: '10px 14px' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Deterministic Rule Veto Engine
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>
                    {(comparison.deterministic_rule_engine.high_psif_recall * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {(comparison.deterministic_rule_engine.high_psif_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {comparison.deterministic_rule_engine.high_psif_f1.toFixed(3)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {(comparison.deterministic_rule_engine.overall_accuracy * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: '#D97706', fontWeight: 700 }}>
                    {(comparison.deterministic_rule_engine.iogp_rule_match_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {comparison.deterministic_rule_engine.average_latency_ms} ms
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-color-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    TF-IDF Statistical Baseline
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284C7' }}>
                    {(comparison.tfidf_baseline.high_psif_recall * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {(comparison.tfidf_baseline.high_psif_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {comparison.tfidf_baseline.high_psif_f1.toFixed(3)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {(comparison.tfidf_baseline.overall_accuracy * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: '#0284C7', fontWeight: 700 }}>
                    {(comparison.tfidf_baseline.iogp_rule_match_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {comparison.tfidf_baseline.average_latency_ms} ms
                  </td>
                </tr>

                <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid var(--border-color-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 style={{ width: '14px', height: '14px', color: '#10B981' }} />
                    <span>Calibrated Hybrid Engine (Rule + AI)</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 900, color: '#047857' }}>
                    {(comparison.calibrated_hybrid.high_psif_recall * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#047857' }}>
                    {(comparison.calibrated_hybrid.high_psif_precision * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#047857' }}>
                    {comparison.calibrated_hybrid.high_psif_f1.toFixed(3)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#047857' }}>
                    {(comparison.calibrated_hybrid.overall_accuracy * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#047857' }}>
                    {(comparison.calibrated_hybrid.iogp_rule_match_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {comparison.calibrated_hybrid.average_latency_ms} ms
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key Findings */}
          <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Info style={{ width: '13px', height: '13px' }} />
              <span>Benchmark Findings & Guardrail Verification</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {comparison.key_findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
