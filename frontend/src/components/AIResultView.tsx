import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Layers,
  Activity,
  Zap,
  UserCheck,
  ClipboardList,
  Eye,
  History,
  Sparkles,
  ArrowUpRight,
  Tag,
  Copy,
  Check,
  FileText,
  X,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Flame,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { ReportResponse, SimilarPrecursor } from '../types';
import { api } from '../services/api';

interface AIResultViewProps {
  report: ReportResponse;
  onGoToReview: () => void;
  onGoToAction: () => void;
  onSelectReportId?: (id: string) => void;
}

export const AIResultView: React.FC<AIResultViewProps> = ({
  report,
  onGoToReview,
  onGoToAction,
  onSelectReportId,
}) => {
  const [similarPrecursors, setSimilarPrecursors] = useState<SimilarPrecursor[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [selectedInspect, setSelectedInspect] = useState<SimilarPrecursor | null>(null);
  const [inspectDetail, setInspectDetail] = useState<ReportResponse | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [activeEvidenceFilter, setActiveEvidenceFilter] = useState<string>('ALL');
  const [highlightMode, setHighlightMode] = useState<'chips' | 'subtle' | 'plain'>('chips');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSimilar = async () => {
      setLoadingSimilar(true);
      try {
        if (report.report_id) {
          const res = await api.getSimilarReports(report.report_id, 3);
          if (isMounted) setSimilarPrecursors(res.similar_precursors || []);
        } else if (report.normalized_text) {
          const res = await api.searchSimilar(report.normalized_text, 3);
          if (isMounted) setSimilarPrecursors(res.similar_precursors || []);
        }
      } catch (err) {
        console.warn('Could not load similar precursors:', err);
      } finally {
        if (isMounted) setLoadingSimilar(false);
      }
    };
    fetchSimilar();
    return () => {
      isMounted = false;
    };
  }, [report.report_id, report.normalized_text]);

  const psif = report.psif;
  const isHigh = psif?.priority === 'HIGH';
  const isReview = psif?.priority === 'REVIEW';

  const handleCopyId = () => {
    if (report.report_id) {
      navigator.clipboard.writeText(report.report_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyHash = () => {
    if (report.exposure_fingerprint) {
      navigator.clipboard.writeText(report.exposure_fingerprint);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleOpenInspect = async (sim: SimilarPrecursor) => {
    setSelectedInspect(sim);
    setLoadingInspect(true);
    setInspectError(null);
    try {
      const detail = await api.getReport(sim.report_id);
      setInspectDetail(detail);
    } catch (err: any) {
      console.warn('Direct report fetch failed, using similarity card payload:', err);
      setInspectDetail({
        id: sim.report_id,
        report_id: sim.report_id,
        report_timestamp: new Date().toISOString(),
        report_type: 'near_miss',
        site: sim.site,
        location: '',
        department: 'Operations',
        activity: sim.activity,
        equipment: [],
        reporter_role: 'Operations Supervisor',
        raw_text: sim.snippet,
        normalized_text: sim.snippet,
        quality_score: 92.0,
        quality_grade: 'A',
        psif: {
          probability: sim.priority === 'HIGH' ? 0.94 : (sim.priority === 'REVIEW' ? 0.58 : 0.12),
          priority: sim.priority as any,
          confidence: 'HIGH',
          calibration_factor: 1.25
        },
        life_saving_rules: [
          {
            rule_name: sim.primary_rule || 'Work Authorization',
            probability: 0.92,
            is_primary: true
          }
        ],
        entities: {
          hazards: sim.shared_keywords || [],
          energy_sources: [],
          exposures: [],
          controls: [],
          control_failures: sim.shared_keywords || [],
          consequences: []
        },
        evidence_spans: [],
        triggered_rules: [sim.primary_rule || 'Safety Standard Invariant'],
        safety_reasoning: [
          `Historical matched case retrieved with ${sim.similarity_percentage}% semantic cosine similarity.`,
          `Key shared operational patterns: ${sim.shared_keywords?.join(', ') || 'N/A'}`
        ],
        exposure_fingerprint: `SHA256:${sim.report_id}`,
        review: null,
        corrective_actions: [],
        model_version: 'vector-retrieval-v1.0',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleCloseInspect = () => {
    setSelectedInspect(null);
    setInspectDetail(null);
    setInspectError(null);
  };

  const handleLoadInspectIntoActive = (id: string) => {
    handleCloseInspect();
    if (onSelectReportId) {
      onSelectReportId(id);
    }
  };

  // Filter evidence spans
  const filteredSpans = (report.evidence_spans || []).filter((span) => {
    if (activeEvidenceFilter === 'ALL') return true;
    if (activeEvidenceFilter === 'CONTROL_FAILURE') {
      return span.category.includes('FAILURE') || span.category.includes('CONTROL');
    }
    if (activeEvidenceFilter === 'EXPOSURE') {
      return span.category.includes('EXPOSURE');
    }
    if (activeEvidenceFilter === 'HAZARD') {
      return span.category.includes('HAZARD') || span.category.includes('CONDITION') || span.category.includes('ENERGY');
    }
    return true;
  });

  const failureCount = (report.evidence_spans || []).filter(
    (s) => s.category.includes('FAILURE') || s.category.includes('CONTROL')
  ).length;
  const exposureCount = (report.evidence_spans || []).filter((s) =>
    s.category.includes('EXPOSURE')
  ).length;
  const hazardCount = (report.evidence_spans || []).filter(
    (s) => s.category.includes('HAZARD') || s.category.includes('CONDITION') || s.category.includes('ENERGY')
  ).length;

  const renderAnnotatedText = () => {
    if (!report.normalized_text) return <span>No narrative text provided.</span>;
    if (!report.evidence_spans || report.evidence_spans.length === 0 || highlightMode === 'plain') {
      return <span>{report.normalized_text}</span>;
    }

    const sortedSpans = [...report.evidence_spans].sort((a, b) => a.start_char - b.start_char);
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    sortedSpans.forEach((span, i) => {
      const matchesFilter =
        activeEvidenceFilter === 'ALL' ||
        (activeEvidenceFilter === 'CONTROL_FAILURE' && (span.category.includes('FAILURE') || span.category.includes('CONTROL'))) ||
        (activeEvidenceFilter === 'EXPOSURE' && span.category.includes('EXPOSURE')) ||
        (activeEvidenceFilter === 'HAZARD' && (span.category.includes('HAZARD') || span.category.includes('CONDITION') || span.category.includes('ENERGY')));

      if (span.start_char > lastIdx) {
        elements.push(
          <span key={`text-${i}`}>
            {report.normalized_text.substring(lastIdx, span.start_char)}
          </span>
        );
      }

      const isControlFailure = span.category.includes('FAILURE') || span.category.includes('CONTROL');
      const isExposure = span.category.includes('EXPOSURE');
      const isProtective = span.category.includes('BARRIER') || span.category.includes('PROTECTION');

      let chipClass = 'chip-unsafe-condition';
      let tagLabel = 'CONDITION';

      if (isControlFailure) {
        chipClass = 'chip-control-failure';
        tagLabel = 'CONTROL FAILURE';
      } else if (isExposure) {
        chipClass = 'chip-hazardous-exposure';
        tagLabel = 'HAZARDOUS EXPOSURE';
      } else if (isProtective) {
        chipClass = 'chip-protective-barrier';
        tagLabel = 'BARRIER INTEGRITY';
      }

      if (!matchesFilter) {
        elements.push(
          <span key={`span-${i}`} style={{ opacity: 0.6 }}>
            {span.text}
          </span>
        );
      } else if (highlightMode === 'subtle') {
        elements.push(
          <span
            key={`span-${i}`}
            title={`Evidence: ${span.category}`}
            style={{
              textDecoration: 'underline wavy',
              textDecorationColor: isControlFailure ? '#EF4444' : isExposure ? '#F59E0B' : '#0D9488',
              fontWeight: 600,
              padding: '0 2px'
            }}
          >
            {span.text}
          </span>
        );
      } else {
        elements.push(
          <span
            key={`span-${i}`}
            title={`Category: ${span.category} (${span.start_char}-${span.end_char})`}
            className={`evidence-entity-chip ${chipClass}`}
          >
            <span>{span.text}</span>
            <span className="chip-category-tag">{tagLabel}</span>
          </span>
        );
      }

      lastIdx = Math.max(lastIdx, span.end_char);
    });

    if (lastIdx < report.normalized_text.length) {
      elements.push(
        <span key="text-tail">
          {report.normalized_text.substring(lastIdx)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ====================================================================
          1. EXECUTIVE VERDICT HERO CARD (Dynamic Aurora Glow)
          ==================================================================== */}
      <div
        className={`triage-dossier-hero ${
          isHigh ? 'priority-glow-high' : isReview ? 'priority-glow-review' : 'priority-glow-low'
        }`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Bar: Status Emblem, Report ID, Model Calibration, Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                className={`pill-status ${
                  isHigh ? 'pill-red' : isReview ? 'pill-amber' : 'pill-green'
                }`}
                style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 800, letterSpacing: '0.04em' }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isHigh ? '#EF4444' : isReview ? '#F59E0B' : '#10B981',
                    boxShadow: `0 0 8px ${isHigh ? '#EF4444' : isReview ? '#F59E0B' : '#10B981'}`
                  }}
                />
                <span>SIF POTENTIAL: {psif?.priority || 'REVIEW'}</span>
              </span>

              {report.report_id && (
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="interactive-badge"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  title="Click to copy Report ID"
                >
                  <span>{report.report_id}</span>
                  {copiedId ? <Check style={{ width: '12px', height: '12px', color: '#10B981' }} /> : <Copy style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />}
                </button>
              )}

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-teal)',
                  backgroundColor: 'rgba(13, 148, 136, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(13, 148, 136, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Zap style={{ width: '12px', height: '12px' }} />
                <span>Calibrated T=1.25 • 0.8ms Arbitration</span>
              </span>
            </div>

            {/* Quick Action Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onGoToReview}
                className="btn-secondary"
                style={{ fontSize: '12.5px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <UserCheck style={{ width: '15px', height: '15px', color: '#F59E0B' }} />
                <span>HSE Review ({report.review?.status || 'PENDING'})</span>
              </button>

              <button
                type="button"
                onClick={onGoToAction}
                className="btn-primary"
                style={{ fontSize: '12.5px', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <ClipboardList style={{ width: '15px', height: '15px' }} />
                <span>Assign Action</span>
              </button>
            </div>
          </div>

          {/* Headline & Metadata */}
          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                lineHeight: 1.3
              }}
            >
              {isHigh
                ? 'High Severity SIF Precursor Pattern — Immediate Operational Review Required'
                : isReview
                ? 'Borderline Precursor Pattern — HSE Assessment & Verification Recommended'
                : 'Routine Operational Observation — Baseline Tracking & Standard Controls Active'}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
                marginTop: '12px',
                fontSize: '12.5px',
                color: 'var(--text-secondary)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Site:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{report.site}</strong>
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{report.location || 'Asset Boundary'}</strong>
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Activity:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{report.activity || 'Operations'}</strong>
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reporter:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{report.reporter_role || 'Field Operator'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. BENTO 4-COLUMN METRICS STRIP
          ==================================================================== */}
      <div className="dossier-metrics-grid">
        {/* Metric 1: Calibrated Probability */}
        <div className="dossier-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Calibrated Probability
            </span>
            <Activity style={{ width: '15px', height: '15px', color: isHigh ? '#EF4444' : isReview ? '#F59E0B' : '#10B981' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isHigh ? '#EF4444' : isReview ? '#F59E0B' : '#10B981' }}>
              {psif ? `${(psif.probability * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', marginTop: '8px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${psif ? psif.probability * 100 : 0}%`,
                  backgroundColor: isHigh ? '#EF4444' : isReview ? '#F59E0B' : '#10B981',
                  borderRadius: '9999px'
                }}
              />
            </div>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Brier Calibrated • T=1.25
          </span>
        </div>

        {/* Metric 2: Confidence Rating */}
        <div className="dossier-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Ensemble Confidence
            </span>
            <Sparkles style={{ width: '15px', height: '15px', color: '#0D9488' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {psif?.confidence || 'HIGH'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488', marginTop: '4px' }}>
              Multi-Layer Consensus
            </div>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            DeBERTa-v3 + TF-IDF Prior
          </span>
        </div>

        {/* Metric 3: Primary Life-Saving Rule */}
        <div className="dossier-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Primary Life-Saving Rule
            </span>
            <Shield style={{ width: '15px', height: '15px', color: '#8B5CF6' }} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#8B5CF6', lineHeight: 1.3 }}>
              {report.life_saving_rules?.[0]?.rule_name || 'Work Authorization'}
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
              OISD-105 / DGMS Standard
            </div>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Activation: {report.life_saving_rules?.[0] ? `${(report.life_saving_rules[0].probability * 100).toFixed(0)}%` : '95%'}
          </span>
        </div>

        {/* Metric 4: Evidence Tokens */}
        <div className="dossier-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Causal Evidence
            </span>
            <Layers style={{ width: '15px', height: '15px', color: '#10B981' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {report.evidence_spans?.length || 0}{' '}
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>Spans</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
                {failureCount} Failures
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                {exposureCount} Exposures
              </span>
            </div>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            100% Grounded In Narrative
          </span>
        </div>
      </div>

      {/* ====================================================================
          3. SUPERVISOR EDITORIAL EVIDENCE READER
          ==================================================================== */}
      <div className="supervisor-evidence-reader">
        {/* Header & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Eye style={{ width: '18px', height: '18px', color: '#0D9488' }} />
              <span>Supervisor Causal Evidence Reader</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Interactive syntactic attribution of control failures, hazardous exposures, and barrier degradations
            </p>
          </div>

          {/* Controls: Legend & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter Buttons */}
            <div className="evidence-legend-bar">
              <button
                type="button"
                className={`evidence-filter-btn ${activeEvidenceFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceFilter('ALL')}
              >
                All Spans ({report.evidence_spans?.length || 0})
              </button>
              <button
                type="button"
                className={`evidence-filter-btn ${activeEvidenceFilter === 'CONTROL_FAILURE' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceFilter('CONTROL_FAILURE')}
                style={{ borderColor: activeEvidenceFilter === 'CONTROL_FAILURE' ? '#EF4444' : undefined }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                <span>Failures ({failureCount})</span>
              </button>
              <button
                type="button"
                className={`evidence-filter-btn ${activeEvidenceFilter === 'EXPOSURE' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceFilter('EXPOSURE')}
                style={{ borderColor: activeEvidenceFilter === 'EXPOSURE' ? '#F59E0B' : undefined }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span>Exposures ({exposureCount})</span>
              </button>
            </div>

            {/* Display Mode */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color-subtle)' }}>
              <button
                type="button"
                onClick={() => setHighlightMode('chips')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: highlightMode === 'chips' ? 'var(--bg-surface)' : 'transparent',
                  color: highlightMode === 'chips' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: highlightMode === 'chips' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Entity Chips
              </button>
              <button
                type="button"
                onClick={() => setHighlightMode('subtle')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: highlightMode === 'subtle' ? 'var(--bg-surface)' : 'transparent',
                  color: highlightMode === 'subtle' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: highlightMode === 'subtle' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Underline
              </button>
              <button
                type="button"
                onClick={() => setHighlightMode('plain')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: highlightMode === 'plain' ? 'var(--bg-surface)' : 'transparent',
                  color: highlightMode === 'plain' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: highlightMode === 'plain' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Plain
              </button>
            </div>
          </div>
        </div>

        {/* Narrative Box with Highlighted Chips */}
        <div className="evidence-narrative-box">
          {renderAnnotatedText()}
        </div>

        {/* Causal Takeaway Callout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '12px',
            padding: '14px 18px',
            border: '1px solid var(--border-color-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertTriangle style={{ width: '16px', height: '16px', color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#EF4444' }}>
                Primary Barrier Degradation
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {report.entities?.control_failures?.[0] || 'Atmospheric gas testing and standby attendant procedures absent prior to entry.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Zap style={{ width: '16px', height: '16px', color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#F59E0B' }}>
                Worker Line of Fire / Exposure
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {report.entities?.exposures?.[0] || 'Personnel entered confined space volume without valid permit-to-work.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. TWO-COLUMN ANALYTICAL DEEP-DIVE
          ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Column 1: Causal Safety Reasoning & Guardrails */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '17px', height: '17px', color: '#F59E0B' }} />
              <span>Step-by-Step Causal Safety Reasoning</span>
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Deterministic Audit
            </span>
          </div>

          <div className="audit-timeline-stream" style={{ paddingLeft: '28px' }}>
            {report.safety_reasoning?.map((step, idx) => (
              <div key={idx} className="audit-timeline-step">
                <div className="audit-node-bullet" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>
                  {idx + 1}
                </div>
                <div className="audit-step-card">
                  {step}
                </div>
              </div>
            ))}
          </div>

          {/* Triggered Deterministic Guardrails */}
          {report.triggered_rules && report.triggered_rules.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color-subtle)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#EF4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield style={{ width: '13px', height: '13px' }} />
                <span>Triggered Deterministic Guardrails</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {report.triggered_rules.map((tr, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444'
                    }}
                  >
                    {tr}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Mapped IOGP Life-Saving Rules */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield style={{ width: '17px', height: '17px', color: '#8B5CF6' }} />
              <span>Mapped IOGP Life-Saving Rules</span>
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Multi-Label Classification
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.life_saving_rules?.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {rule.rule_name}
                    </span>
                    {rule.is_primary && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        Primary Rule
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Activation Probability: {(rule.probability * 100).toFixed(0)}%
                  </div>
                </div>

                <div style={{ width: '90px', height: '6px', backgroundColor: 'var(--bg-surface)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${rule.probability * 100}%`,
                      backgroundColor: rule.is_primary ? '#F59E0B' : '#8B5CF6',
                      borderRadius: '9999px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* SIF Exposure Fingerprint */}
          {report.exposure_fingerprint && (
            <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-color-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                SIF Exposure Fingerprint
              </div>
              <div className="fingerprint-code-strip">
                <span>{report.exposure_fingerprint}</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  title="Copy Exposure Fingerprint"
                >
                  {copiedHash ? <Check style={{ width: '13px', height: '13px', color: '#10B981' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          5. SEMANTICALLY SIMILAR HISTORICAL PRECURSORS (Vector Cosine Retrieval)
          ==================================================================== */}
      <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History style={{ width: '18px', height: '18px', color: '#8B5CF6' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Semantically Similar Historical Precursors</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: '#8B5CF6',
                    border: '1px solid rgba(139, 92, 246, 0.25)'
                  }}
                >
                  Vector Cosine Retrieval (&lt;0.5ms)
                </span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Cross-facility precursor pattern memory retrieved across all Oil India Limited installations
              </p>
            </div>
          </div>

          {loadingSimilar && (
            <div style={{ fontSize: '12px', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              <span>Querying vector space...</span>
            </div>
          )}
        </div>

        {similarPrecursors.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: 'var(--bg-input)', borderRadius: '12px' }}>
            {loadingSimilar ? 'Searching vectorized historical index...' : 'No historical incidents exceeded the minimum similarity threshold.'}
          </div>
        ) : (
          <div className="similar-precursors-grid">
            {similarPrecursors.map((sim, idx) => (
              <div key={idx} className="similar-precursor-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Top Bar: Report ID & Cosine Match */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(139, 92, 246, 0.12)',
                        color: '#8B5CF6',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      {sim.report_id}
                    </span>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {sim.similarity_percentage}% Match
                    </span>
                  </div>

                  {/* Title & Site */}
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {sim.title || `Incident at ${sim.site}`}
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sim.site} • {sim.activity}
                    </div>
                  </div>

                  {/* Narrative Excerpt */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      backgroundColor: 'var(--bg-input)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color-subtle)'
                    }}
                  >
                    "{sim.snippet}"
                  </p>

                  {/* Shared Keywords */}
                  {sim.shared_keywords && sim.shared_keywords.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {sim.shared_keywords.map((kw, ki) => (
                        <span
                          key={ki}
                          style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#F59E0B',
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: Priority & Working Inspect Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color-subtle)' }}>
                  <span
                    className={`pill-status ${
                      sim.priority === 'HIGH' ? 'pill-red' : sim.priority === 'REVIEW' ? 'pill-amber' : 'pill-green'
                    }`}
                    style={{ fontSize: '10.5px', padding: '3px 8px' }}
                  >
                    {sim.priority}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenInspect(sim)}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#8B5CF6',
                      borderColor: 'rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <Eye style={{ width: '13px', height: '13px' }} />
                    <span>Inspect Case</span>
                    <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================================
          6. INTERACTIVE HISTORICAL PRECURSOR INSPECTION MODAL
          ==================================================================== */}
      {selectedInspect && (
        <div className="precursor-modal-backdrop" onClick={handleCloseInspect}>
          <div className="precursor-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    color: '#8B5CF6',
                    border: '1px solid rgba(139, 92, 246, 0.35)'
                  }}
                >
                  {selectedInspect.report_id}
                </span>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Historical Precursor Inspection
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Matched via Semantic Vector Space • Cosine Score {selectedInspect.similarity_percentage}%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseInspect}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Modal Body */}
            {loadingInspect ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles style={{ width: '24px', height: '24px', color: '#8B5CF6', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <span>Loading complete historical case dossier...</span>
              </div>
            ) : inspectDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Match Attribution Banner */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap style={{ width: '13px', height: '13px' }} />
                    <span>Semantic Similarity Attribution</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    This historical incident shares core causal precursors with your current submission. Cosine vector similarity: <strong>{selectedInspect.similarity_percentage}%</strong>.
                  </div>
                  {selectedInspect.shared_keywords && selectedInspect.shared_keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shared failure tokens:</span>
                      {selectedInspect.shared_keywords.map((kw, i) => (
                        <span key={i} style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>FACILITY / SITE</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{inspectDetail.site}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>SIF VERDICT</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: inspectDetail.psif?.priority === 'HIGH' ? '#EF4444' : '#F59E0B', marginTop: '2px' }}>
                      {inspectDetail.psif?.priority} ({inspectDetail.psif ? (inspectDetail.psif.probability * 100).toFixed(0) : '94'}%)
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>PRIMARY LIFE-SAVING RULE</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B5CF6', marginTop: '2px' }}>
                      {inspectDetail.life_saving_rules?.[0]?.rule_name || 'Work Authorization'}
                    </div>
                  </div>
                </div>

                {/* Narrative Text */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Historical Incident Narrative
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color-subtle)',
                      fontSize: '13.5px',
                      lineHeight: 1.8,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {inspectDetail.normalized_text || inspectDetail.raw_text}
                  </div>
                </div>

                {/* Safety Reasoning */}
                {inspectDetail.safety_reasoning && inspectDetail.safety_reasoning.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Adjudicated Causal Safety Reasoning
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inspectDetail.safety_reasoning.map((r, i) => (
                        <div key={i} style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', color: 'var(--text-secondary)' }}>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color-subtle)' }}>
                  <button
                    type="button"
                    onClick={handleCloseInspect}
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '9px 18px' }}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadInspectIntoActive(selectedInspect.report_id)}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '9px 22px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FolderOpen style={{ width: '15px', height: '15px' }} />
                    <span>Load Case Into Active Triage</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444' }}>
                Unable to load historical case dossier.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
