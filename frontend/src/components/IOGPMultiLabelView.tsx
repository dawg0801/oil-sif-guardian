import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Zap,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Crosshair,
  Maximize2,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Search,
  Filter,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import {
  IOGPMultiLabelResponseData,
  IOGPMatrixResponseData,
  IOGPEvaluationReportResponseData,
  IOGPStatusResponseData
} from '../types';

const SAMPLE_NARRATIVES = [
  {
    title: 'Confined Space + Work Auth (Separator Entry)',
    narrative: 'Fitter entered the interior of test separator vessel through open manway to clean heavy sludge without atmospheric gas test or standby attendant. The PTW was expired and entry log was blank.'
  },
  {
    title: 'Energy Isolation + Line of Fire (Wellhead Unbolting)',
    narrative: 'Maintenance crew unbolted wellhead casing wing valve with 1200 psi shut-in casing pressure. Stored energy blew flange open, projecting heavy studs directly across the rig cellar floor.'
  },
  {
    title: 'Safe Lifting + Line of Fire (Drop Zone Rigging)',
    narrative: 'A 50-ton hydraulic mobile crane set outriggers directly on soft mud without mats. While hoisting 8-ton casing joint, synthetic sling parted and load plummeted into active worker transit corridor.'
  },
  {
    title: 'Height + Lifting (Crane Man-Riding Defect)',
    narrative: 'NDT inspector hoisted in a custom fabricated steel box suspended from crane hook at 18 meters. The crane was not certified for man-riding and lacked anti-two-block limit switch.'
  },
  {
    title: 'Negative Control (Routine Office Paper Jam)',
    narrative: 'Accounts clerk cleared paper jam in office laser printer on second floor administrative block. Used ballpoint pen to unstick roller. No injury reported.'
  }
];

const RULE_ICONS: Record<string, string> = {
  'Bypassing Safety Controls': '⚙️',
  'Confined Space': '🕳️',
  'Driving': '🚚',
  'Energy Isolation': '⚡',
  'Hot Work': '🔥',
  'Line of Fire': '🎯',
  'Safe Mechanical Lifting': '🏗️',
  'Work Authorization': '📋',
  'Working at Height': '🧗'
};

export const IOGPMultiLabelView: React.FC = () => {
  const [narrativeInput, setNarrativeInput] = useState<string>(SAMPLE_NARRATIVES[0].narrative);
  const [incidentTitle, setIncidentTitle] = useState<string>(SAMPLE_NARRATIVES[0].title);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [prediction, setPrediction] = useState<IOGPMultiLabelResponseData | null>(null);
  const [matrixData, setMatrixData] = useState<IOGPMatrixResponseData | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<IOGPEvaluationReportResponseData | null>(null);
  const [statusData, setStatusData] = useState<IOGPStatusResponseData | null>(null);
  const [loadingPredict, setLoadingPredict] = useState<boolean>(false);
  const [loadingBenchmark, setLoadingBenchmark] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ r1: string; r2: string; count: number } | null>(null);
  const [thresholdSavedNotice, setThresholdSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [status, matrix, bench] = await Promise.all([
        api.getIOGPStatus().catch(() => null),
        api.getIOGPMatrix().catch(() => null),
        api.getIOGPBenchmark().catch(() => null)
      ]);

      if (status) {
        setStatusData(status);
        setThresholds(status.current_thresholds);
      }
      if (matrix) setMatrixData(matrix);
      if (bench) setBenchmarkReport(bench);

      // Run prediction on default sample
      runInference(SAMPLE_NARRATIVES[0].narrative, SAMPLE_NARRATIVES[0].title);
    } catch (e) {
      console.error('Failed to load initial IOGP multi-label data', e);
    }
  };

  const runInference = async (text: string, title?: string, overrideThresh?: Record<string, number>) => {
    setLoadingPredict(true);
    try {
      const pred = await api.predictIOGPMultiLabel(text, title, overrideThresh || thresholds);
      setPrediction(pred);
    } catch (e) {
      console.error('Prediction failed', e);
    } finally {
      setLoadingPredict(false);
    }
  };

  const handleSelectSample = (sample: { title: string; narrative: string }) => {
    setIncidentTitle(sample.title);
    setNarrativeInput(sample.narrative);
    runInference(sample.narrative, sample.title);
  };

  const handleThresholdChange = (ruleName: string, val: number) => {
    const updated = { ...thresholds, [ruleName]: val };
    setThresholds(updated);
    if (narrativeInput) {
      runInference(narrativeInput, incidentTitle, updated);
    }
  };

  const saveThresholdsToBackend = async () => {
    try {
      const res = await api.updateIOGPThresholds(thresholds);
      setThresholdSavedNotice(res.message);
      setTimeout(() => setThresholdSavedNotice(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const rep = await api.getIOGPBenchmark();
      setBenchmarkReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* Top Header */}
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
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#DC2626',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <Crosshair style={{ width: '13px', height: '13px' }} />
              IOGP 9 Life-Saving Rules Multi-Label
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
              {statusData ? `${statusData.rules_count} Rules Locked` : '9 Rules Locked'}
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Multi-Label Classifier & Co-Occurrence Matrix
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '740px' }}>
            Joint barrier degradation intelligence for Oil India Limited. Classifies simultaneous primary and secondary Life-Saving Rules and evaluates empirical 9x9 barrier co-occurrences.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={saveThresholdsToBackend}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '12.5px' }}
          >
            <Sliders style={{ width: '14px', height: '14px' }} />
            <span>Persist Thresholds</span>
          </button>
          <button
            onClick={refreshBenchmark}
            disabled={loadingBenchmark}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '12.5px' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} className={loadingBenchmark ? 'animate-spin' : ''} />
            <span>Run Golden Benchmark</span>
          </button>
        </div>
      </div>

      {thresholdSavedNotice && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#059669',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#059669' }} />
          <span>{thresholdSavedNotice}</span>
        </div>
      )}

      {/* Preset Scenarios Strip */}
      <div
        className="card-panel"
        style={{
          borderRadius: '24px',
          padding: '18px 22px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles style={{ width: '13px', height: '13px', color: '#F59E0B' }} />
          <span>Test Scenarios:</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          {SAMPLE_NARRATIVES.map((s, idx) => {
            const isSelected = incidentTitle === s.title;
            const isNegative = s.title.includes('Negative');
            const dotColor = isNegative ? '#059669' : '#D97706';

            return (
              <button
                key={idx}
                onClick={() => handleSelectSample(s)}
                style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  border: isSelected ? '1.5px solid #0D9488' : '1px solid var(--border-color-subtle)',
                  backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.14)' : 'var(--bg-input)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.25)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Inference Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Left Column: Narrative & Prediction Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: '15px', height: '15px', color: 'var(--accent-emerald-dark)' }} />
                <span>Raw Incident Narrative</span>
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {narrativeInput.length} chars
              </span>
            </div>

            <textarea
              rows={5}
              value={narrativeInput}
              onChange={(e) => setNarrativeInput(e.target.value)}
              placeholder="Enter incident or near-miss report narrative..."
              className="form-textarea font-mono"
              style={{ fontSize: '12.5px', lineHeight: 1.6 }}
            />

            <button
              onClick={() => runInference(narrativeInput, incidentTitle)}
              disabled={loadingPredict || narrativeInput.trim().length < 5}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '13px' }}
            >
              {loadingPredict ? (
                <>
                  <RefreshCw style={{ width: '15px', height: '15px' }} className="animate-spin" />
                  <span>Evaluating Multi-Label Rules...</span>
                </>
              ) : (
                <>
                  <Activity style={{ width: '15px', height: '15px' }} />
                  <span>Execute Multi-Label IOGP Inference</span>
                </>
              )}
            </button>
          </div>

          {/* Inference Decision Output */}
          {prediction && (
            <div
              className="card-panel"
              style={{
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color-subtle)' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert style={{ width: '15px', height: '15px', color: '#D97706' }} />
                  <span>Multi-Label Decision Card</span>
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock style={{ width: '12px', height: '12px' }} />
                  <span>{prediction.latency_ms} ms</span>
                </span>
              </div>

              {/* Primary Rule */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Designated Primary Rule
                </span>
                <div style={{ padding: '14px 18px', borderRadius: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1.5px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{RULE_ICONS[prediction.primary_rule] || '🛡️'}</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706' }}>
                        {prediction.primary_rule}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {prediction.primary_rule === 'None'
                          ? 'Zero industrial Life-Saving Rules breached (Administrative Control)'
                          : `Dominant Precursor Driver (P = ${((prediction.rule_scores[prediction.primary_rule]?.probability || 0) * 100).toFixed(1)}%)`}
                      </div>
                    </div>
                  </div>
                  {prediction.primary_rule !== 'None' && (
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#D97706', color: '#FFFFFF' }}>
                      PRIMARY
                    </span>
                  )}
                </div>
              </div>

              {/* Secondary Rules */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Co-Occurring Secondary Rules ({prediction.secondary_rules.length})
                </span>
                {prediction.secondary_rules.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                    No secondary rules exceeded decision thresholds.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {prediction.secondary_rules.map((ruleName) => {
                      const score = prediction.rule_scores[ruleName];
                      return (
                        <div
                          key={ruleName}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(13, 148, 136, 0.08)',
                            border: '1px solid rgba(13, 148, 136, 0.25)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                          }}
                        >
                          <span>{RULE_ICONS[ruleName] || '🔹'}</span>
                          <span>{ruleName}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-emerald-dark)', fontWeight: 800 }}>
                            {(score.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Co-Occurrence Tags */}
              {prediction.co_occurrence_tags.length > 0 && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color-subtle)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <TrendingUp style={{ width: '13px', height: '13px', color: '#059669' }} />
                    <span>Empirical Barrier Coupling</span>
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {prediction.co_occurrence_tags.map((tag, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '12px',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-color-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span>
                          <strong>{tag.rule_a}</strong> <span style={{ color: 'var(--text-muted)' }}>&harr;</span> <strong>{tag.rule_b}</strong>
                        </span>
                        <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-emerald-dark)' }}>
                          {tag.historical_co_occurrences} Historical Pairs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: 9-Rule Grid with Threshold Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders style={{ width: '15px', height: '15px', color: 'var(--accent-emerald-dark)' }} />
                <span>9 IOGP Life-Saving Rules Activation & Calibration Grid</span>
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Triggered: {prediction ? prediction.triggered_rules.length : 0} / 9
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              {statusData?.canonical_rules.map((ruleName) => {
                const score = prediction?.rule_scores[ruleName];
                const prob = score ? score.probability : 0.0;
                const tau = thresholds[ruleName] ?? 0.40;
                const isTriggered = score ? score.is_triggered : false;
                const isPrimary = prediction?.primary_rule === ruleName;

                return (
                  <div
                    key={ruleName}
                    style={{
                      padding: '16px',
                      borderRadius: '18px',
                      border: isPrimary
                        ? '1.5px solid rgba(245, 158, 11, 0.7)'
                        : isTriggered
                        ? '1.5px solid rgba(13, 148, 136, 0.6)'
                        : '1px solid var(--border-color-subtle)',
                      backgroundColor: isPrimary
                        ? 'rgba(245, 158, 11, 0.08)'
                        : isTriggered
                        ? 'rgba(13, 148, 136, 0.07)'
                        : 'var(--bg-input)',
                      opacity: isPrimary || isTriggered ? 1 : 0.78,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: isPrimary
                        ? '0 4px 14px rgba(245, 158, 11, 0.15)'
                        : isTriggered
                        ? '0 4px 14px rgba(13, 148, 136, 0.12)'
                        : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{RULE_ICONS[ruleName] || '🛡️'}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                          {ruleName}
                        </span>
                      </div>
                      {isPrimary ? (
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '9.5px', fontWeight: 800, backgroundColor: '#D97706', color: '#FFFFFF', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)' }}>PRIMARY</span>
                      ) : isTriggered ? (
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '9.5px', fontWeight: 800, backgroundColor: 'rgba(13, 148, 136, 0.2)', color: '#0D9488', border: '1px solid rgba(13, 148, 136, 0.35)' }}>SECONDARY</span>
                      ) : (
                        <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', padding: '2px 6px' }}>OFF</span>
                      )}
                    </div>

                    {/* Probability Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Activation P</span>
                        <span style={{ fontWeight: 800, color: isPrimary ? '#D97706' : isTriggered ? '#0D9488' : 'var(--text-muted)' }}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-surface)', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color-subtle)' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(2, prob * 100))}%`,
                            backgroundColor: isPrimary ? '#D97706' : isTriggered ? '#0D9488' : 'var(--text-dim)',
                            borderRadius: '9999px',
                            transition: 'all 0.3s ease',
                          }}
                        />
                        {/* Threshold cut-off marker */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            backgroundColor: 'var(--text-primary)',
                            left: `${tau * 100}%`,
                            boxShadow: '0 0 3px rgba(0,0,0,0.4)',
                            zIndex: 2,
                          }}
                          title={`Threshold tau = ${tau}`}
                        />
                      </div>
                    </div>

                    {/* Interactive Threshold Slider */}
                    <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        <span>Threshold (&tau;)</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{(tau * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.85"
                        step="0.01"
                        value={tau}
                        onChange={(e) => handleThresholdChange(ruleName, parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#0D9488', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Evidence Snippets */}
                    {score && score.evidence_spans.length > 0 && (
                      <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {score.evidence_spans.slice(0, 2).map((sp, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '9.5px',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color-subtle)',
                              color: 'var(--text-secondary)',
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            "{sp}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 9x9 Empirical Co-Occurrence Heatmap & Golden Benchmark Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* 9x9 Co-Occurrence Matrix Heatmap */}
        <div
          className="card-panel"
          style={{
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ width: '16px', height: '16px', color: '#059669' }} />
                <span>9x9 Empirical IOGP Barrier Co-Occurrence Matrix</span>
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Evaluates joint frequency of simultaneous control compromises across OIL golden benchmark reports.
              </p>
            </div>
            <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              Empirical Corpus
            </span>
          </div>

          {matrixData && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'center', fontSize: '10.5px', fontFamily: 'var(--font-mono)', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '10px' }}>Rule</th>
                    {matrixData.rules.map((r, i) => (
                      <th key={i} style={{ padding: '6px', color: 'var(--text-secondary)', fontWeight: 700 }} title={r}>
                        {RULE_ICONS[r] || r.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.matrix.map((row, i) => {
                    const r1Name = matrixData.rules[i];
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-color-subtle)' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span>{RULE_ICONS[r1Name]}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r1Name}</span>
                        </td>
                        {row.map((count, j) => {
                          const r2Name = matrixData.rules[j];
                          const isDiagonal = i === j;
                          const intensity = Math.min(1.0, count / 15.0);

                          return (
                            <td
                              key={j}
                              onClick={() => setSelectedCell({ r1: r1Name, r2: r2Name, count })}
                              style={{
                                padding: '8px 4px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontWeight: isDiagonal || count > 0 ? 800 : 400,
                                color: isDiagonal ? '#D97706' : count > 0 ? 'var(--text-primary)' : 'var(--text-dim)',
                                backgroundColor: isDiagonal
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : count > 0
                                  ? `rgba(13, 148, 136, ${0.12 + intensity * 0.55})`
                                  : 'transparent',
                                transition: 'all 0.15s ease',
                              }}
                              title={`${r1Name} + ${r2Name}: ${count} occurrences`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {selectedCell && (
                <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '14px', backgroundColor: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info style={{ width: '16px', height: '16px', color: 'var(--accent-emerald-dark)', flexShrink: 0 }} />
                    <span>
                      <strong>{selectedCell.r1}</strong> and <strong>{selectedCell.r2}</strong> co-occur in{' '}
                      <span style={{ color: '#D97706', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{selectedCell.count}</span> golden evaluation incidents.
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Golden Benchmark Scorecard */}
        <div
          className="card-panel"
          style={{
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 style={{ width: '16px', height: '16px', color: '#059669' }} />
              <span>124-Event Golden Benchmark Scorecard</span>
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {benchmarkReport?.evaluated_at || 'Golden Dataset'}
            </span>
          </div>

          {benchmarkReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 4 KPI Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Subset Accuracy</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', margin: '2px 0' }}>
                    {(benchmarkReport.subset_accuracy * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Exact 9-Rule Match</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Hamming Loss</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', margin: '2px 0' }}>
                    {benchmarkReport.hamming_loss.toFixed(4)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Bit error rate (&lt; 0.08)</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Macro F1 Score</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', margin: '2px 0' }}>
                    {(benchmarkReport.macro_f1 * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Unweighted 9-class mean</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Primary Rule Top-1</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', margin: '2px 0' }}>
                    {(benchmarkReport.primary_rule_accuracy * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Dominant rule accuracy</div>
                </div>
              </div>

              {/* Per-Rule Table */}
              <div style={{ overflowX: 'auto', maxHeight: '240px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 10px' }}>Rule</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Supp</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Prec</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Rec</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(benchmarkReport.per_rule_metrics).map(([rName, m]) => (
                      <tr key={rName}>
                        <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={rName}>
                          {rName}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-muted)' }}>{m.support}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{(m.precision * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{(m.recall * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald-dark)' }}>{(m.f1 * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
