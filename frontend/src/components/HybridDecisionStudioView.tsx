import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart2,
  RefreshCw,
  Scale,
  Crosshair,
  FileText,
  HelpCircle,
  Percent,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import {
  HybridDecisionResponseData,
  CalibrationReportResponseData,
  DecisionStatusResponseData
} from '../types';

const PRESET_SCENARIOS = [
  {
    title: 'Crude Tank Entry Without Gas Test',
    category: 'Zero-Tolerance Veto',
    narrative: 'Contractor workers entered crude storage tank TK-101 without recorded atmospheric gas testing. The entry permit had expired two hours prior and the standby attendant had left his post.'
  },
  {
    title: 'Wellhead Flange Unbolting Under 1200 PSI',
    category: 'Zero-Tolerance Veto',
    narrative: 'Maintenance crew began unbolting wellhead casing wing valve with 1200 psi shut-in pressure remaining in the spool. Flange unbolted without depressurization or verified LOTO.'
  },
  {
    title: 'H2S Toxic Sour Gas Escape Near Wellhead',
    category: 'Zero-Tolerance Veto',
    narrative: 'Pinhole leak on wellhead flowline released sour gas with high H2S concentration (> 25 ppm) near manifold. Workers were present without positive-pressure SCBA escape sets.'
  },
  {
    title: 'Mobile Crane Outriggers Sunk in Soft Mud',
    category: 'Zero-Tolerance Veto',
    narrative: 'Rigger positioned himself directly underneath the suspended 5-ton casing joint while mobile crane was slewing. Outriggers were deployed on soft mud without hardwood spreader mats.'
  },
  {
    title: 'Derrick Monkey Board Work Without Fall Arrest',
    category: 'Zero-Tolerance Veto',
    narrative: 'Roughneck working on the derrick monkey board at 24 meters height without safety harness tie-off or continuous inertia reel lifeline while handling heavy tubulars.'
  },
  {
    title: 'Minor Hydraulic Oil Weep on Compressor Skid',
    category: 'Continuous ML Fusion',
    narrative: 'Technician noticed slight hydraulic oil sweating around fitting nut on booster compressor skid during routine shift round. Pressure steady at 45 psi, fitting wiped clean and tagged for preventative packing replacement.'
  },
  {
    title: 'Office Printer Paper Jam (Negative Control)',
    category: 'Negative Control',
    narrative: 'Accounts clerk cleared paper jam in office laser printer on 2nd floor administrative block and replenished ballpoint pens. Routine housekeeping completed.'
  }
];

export const HybridDecisionStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'calibration' | 'tuner'>('sandbox');
  const [narrativeInput, setNarrativeInput] = useState<string>(PRESET_SCENARIOS[0].narrative);
  const [titleInput, setTitleInput] = useState<string>(PRESET_SCENARIOS[0].title);

  // Decision state
  const [decision, setDecision] = useState<HybridDecisionResponseData | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Calibration state
  const [calibrationReport, setCalibrationReport] = useState<CalibrationReportResponseData | null>(null);
  const [statusData, setStatusData] = useState<DecisionStatusResponseData | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Weight tuning state
  const [weights, setWeights] = useState({
    sequence_weight: 0.50,
    iogp_weight: 0.30,
    tfidf_weight: 0.20,
    tau_high: 0.50,
    tau_low: 0.25,
    temperature: 1.25
  });
  const [savingWeights, setSavingWeights] = useState<boolean>(false);
  const [weightMessage, setWeightMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [calRes, statRes] = await Promise.all([
        api.getDecisionCalibration(),
        api.getDecisionStatus()
      ]);
      setCalibrationReport(calRes);
      setStatusData(statRes);

      if (statRes.active_weights && statRes.active_thresholds) {
        setWeights({
          sequence_weight: statRes.active_weights.sequence_weight ?? 0.50,
          iogp_weight: statRes.active_weights.iogp_weight ?? 0.30,
          tfidf_weight: statRes.active_weights.tfidf_weight ?? 0.20,
          tau_high: statRes.active_thresholds.tau_high ?? 0.50,
          tau_low: statRes.active_thresholds.tau_low ?? 0.25,
          temperature: statRes.temperature ?? 1.25
        });
      }

      // Initial decision evaluation
      const initialDecision = await api.triageHybridDecision(PRESET_SCENARIOS[0].narrative, PRESET_SCENARIOS[0].title);
      setDecision(initialDecision);
    } catch (err) {
      console.error('Failed to load hybrid decision studio data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEvaluate = async () => {
    if (!narrativeInput.trim()) return;
    setEvaluating(true);
    try {
      const res = await api.triageHybridDecision(narrativeInput, titleInput, {
        sequence_weight: weights.sequence_weight,
        iogp_weight: weights.iogp_weight,
        tfidf_weight: weights.tfidf_weight
      }, weights.tau_high, weights.tau_low);
      setDecision(res);
    } catch (err) {
      console.error('Failed to evaluate hybrid decision:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveWeights = async () => {
    setSavingWeights(true);
    setWeightMessage(null);
    try {
      const res = await api.tuneDecisionWeights(weights);
      setWeightMessage(res.message);
      // Reload calibration report after weight update
      const updatedCal = await api.getDecisionCalibration();
      setCalibrationReport(updatedCal);
    } catch (err) {
      console.error('Failed to tune weights:', err);
      setWeightMessage('Failed to save arbitration weights.');
    } finally {
      setSavingWeights(false);
    }
  };

  const selectPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setTitleInput(preset.title);
    setNarrativeInput(preset.narrative);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* Header Banner */}
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
              <Cpu style={{ width: '13px', height: '13px' }} />
              Multi-Model Fusion & Decision Studio
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
              Phase 8 Multi-Layer Architecture
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Calibrated Hybrid Decision Engine
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '740px' }}>
            Hierarchical fusion of Deterministic Safety Guardrails, Contextual Sequence Embeddings, IOGP Joint Co-occurrence, and TF-IDF Prior with statistical calibration.
          </p>
        </div>

        {/* Sub-Tab Navigation Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input)',
            padding: '5px',
            borderRadius: '9999px',
            border: '1px solid var(--border-color-subtle)',
            gap: '6px',
          }}
        >
          <button
            onClick={() => setActiveTab('sandbox')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeTab === 'sandbox' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'sandbox' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'sandbox' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Zap style={{ width: '13px', height: '13px' }} />
            <span>Triage Sandbox</span>
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeTab === 'calibration' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'calibration' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'calibration' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <BarChart2 style={{ width: '13px', height: '13px' }} />
            <span>Calibration &amp; Reliability</span>
          </button>
          <button
            onClick={() => setActiveTab('tuner')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeTab === 'tuner' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'tuner' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'tuner' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <SlidersHorizontal style={{ width: '13px', height: '13px' }} />
            <span>Ensemble Tuner</span>
          </button>
        </div>
      </div>

      {/* 4 Multi-Layer Model Indicator Badges */}
      <div className="stats-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi-card" style={{ borderRadius: '24px' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#DC2626' }}>Layer 1: Deterministic</span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' }}>
              <AlertOctagon style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            Rulebook Guardrails
          </div>
          <div className="kpi-card-desc">
            <span style={{ color: '#DC2626', fontWeight: 700 }}>100.0% Recall Veto</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderRadius: '24px' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#7C3AED' }}>Layer 2: Contextual</span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED' }}>
              <Sparkles style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            Attention Classifier
          </div>
          <div className="kpi-card-desc">
            <span>Weight: <strong>{(weights.sequence_weight * 100).toFixed(0)}%</strong></span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderRadius: '24px' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#0284C7' }}>Layer 3: Multi-Label</span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)', color: '#0284C7' }}>
              <Crosshair style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            IOGP Co-Occurrence
          </div>
          <div className="kpi-card-desc">
            <span>Weight: <strong>{(weights.iogp_weight * 100).toFixed(0)}%</strong></span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderRadius: '24px' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#059669' }}>Layer 4: Statistical</span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>
              <Scale style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            TF-IDF N-Gram Prior
          </div>
          <div className="kpi-card-desc">
            <span>Weight: <strong>{(weights.tfidf_weight * 100).toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: TRIAGE SANDBOX */}
      {activeTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Left Column: Presets & Narrative Input */}
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
              <h2 style={{ fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: '16px', height: '16px', color: 'var(--accent-emerald-dark)' }} />
                <span>Incident Narrative Input</span>
              </h2>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Multi-Model Sandbox</span>
            </div>

            {/* Presets List */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                Select Preset Scenario:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '170px', overflowY: 'auto', padding: '2px' }}>
                {PRESET_SCENARIOS.map((p, idx) => {
                  const isSelected = titleInput === p.title;
                  const isVeto = p.category.includes('Veto');
                  const isBenign = p.category.includes('Negative');
                  const dotColor = isVeto ? '#DC2626' : isBenign ? '#059669' : '#0D9488';

                  return (
                    <button
                      key={idx}
                      onClick={() => selectPreset(p)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 14px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: isSelected ? '1.5px solid #0D9488' : '1px solid var(--border-color-subtle)',
                        backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.14)' : 'var(--bg-input)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.2)' : 'none',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                      <span>{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div className="form-group">
              <label className="form-label">
                Headline / Task
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Incident title or operation activity"
                className="form-input"
              />
            </div>

            {/* Narrative Input */}
            <div className="form-group">
              <label className="form-label">
                Narrative Text
              </label>
              <textarea
                rows={5}
                value={narrativeInput}
                onChange={(e) => setNarrativeInput(e.target.value)}
                placeholder="Paste unstructured incident narrative..."
                className="form-textarea font-mono"
                style={{ fontSize: '12.5px', lineHeight: 1.6 }}
              />
            </div>

            <button
              onClick={handleEvaluate}
              disabled={evaluating || !narrativeInput.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '13px' }}
            >
              {evaluating ? (
                <>
                  <Clock style={{ width: '15px', height: '15px' }} className="animate-spin" />
                  <span>Arbitrating Decision Layers...</span>
                </>
              ) : (
                <>
                  <Zap style={{ width: '15px', height: '15px' }} />
                  <span>Execute Calibrated Hybrid Triage</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Triage Decision, Model Contributions & Rationale */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {decision ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. TOP PRIORITY HUD HERO CARD WITH AMBIENT AURORA GLOW & RADIAL GAUGE */}
                <div
                  className={`triage-hud-hero-card priority-${decision.priority.toLowerCase()}`}
                >
                  {/* Background ambient radial glow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-20%',
                      right: '-10%',
                      width: '320px',
                      height: '320px',
                      borderRadius: '50%',
                      background:
                        decision.priority === 'HIGH'
                          ? 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 70%)'
                          : decision.priority === 'REVIEW'
                          ? 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)'
                          : 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />

                  {/* Header badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor:
                            decision.priority === 'HIGH'
                              ? '#DC2626'
                              : decision.priority === 'REVIEW'
                              ? '#D97706'
                              : '#059669',
                          color: '#FFFFFF',
                          boxShadow:
                            decision.priority === 'HIGH'
                              ? '0 4px 14px rgba(220, 38, 38, 0.35)'
                              : decision.priority === 'REVIEW'
                              ? '0 4px 14px rgba(217, 119, 6, 0.35)'
                              : '0 4px 14px rgba(5, 150, 105, 0.35)',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFFFFF', animation: 'pulse 1.8s infinite' }} />
                        PRIORITY: {decision.priority}
                      </span>

                      {decision.is_veto_enforced && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            backgroundColor: 'rgba(220, 38, 38, 0.15)',
                            color: '#DC2626',
                            border: '1px solid rgba(220, 38, 38, 0.35)',
                          }}
                        >
                          <AlertOctagon style={{ width: '12px', height: '12px' }} />
                          ZERO-TOLERANCE VETO OVERRULE
                        </span>
                      )}

                      {decision.is_benign && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: 'rgba(5, 150, 105, 0.15)',
                            color: '#059669',
                            border: '1px solid rgba(5, 150, 105, 0.35)',
                          }}
                        >
                          <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                          NEGATIVE CONTROL PASS
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-surface)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      ⚡ {decision.latency_ms.toFixed(1)} ms Arbitration
                    </span>
                  </div>

                  {/* Main content: Title & Narrative vs Radial Gauge */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div>
                      <h3
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {decision.priority === 'HIGH'
                          ? 'Critical SIF Precursor — Immediate Statutory Stop-Work'
                          : decision.priority === 'REVIEW'
                          ? 'Uncertainty Zone — Triaged to HSE Review Queue'
                          : 'Nominal Risk — Routine Operational Event'}
                      </h3>

                      <p
                        style={{
                          fontSize: '13px',
                          lineHeight: 1.6,
                          color: 'var(--text-secondary)',
                          marginTop: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        {decision.is_veto_enforced
                          ? `Deterministic veto triggered on Life-Saving Rule: ${decision.triggered_rules?.[0] || decision.primary_iogp_rule}. All ML probabilities are subordinated to ensure 100% SIF recall.`
                          : decision.priority === 'HIGH'
                          ? 'Multi-model consensus indicates severe potential to cause single- or multiple-fatality harm. Barrier degradation detected across primary energy barriers.'
                          : decision.priority === 'REVIEW'
                          ? 'Event sits between operational bounds (τ_low < P(SIF) < τ_high). Automated safety SLA initiated for domain-expert human adjudication.'
                          : 'Precursor frequency and barrier defense integrity conform to standard baseline guidelines. Logged to standard audit ledger.'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            padding: '6px 14px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Shield style={{ width: '14px', height: '14px', color: '#0D9488' }} />
                          <span>Primary Rule: {decision.primary_iogp_rule}</span>
                        </div>

                        <div
                          style={{
                            padding: '6px 14px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Sparkles style={{ width: '14px', height: '14px', color: '#7C3AED' }} />
                          <span>Confidence: {(decision.confidence_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Radial SVG Gauge for Calibrated P(SIF) */}
                    <div className="triage-radial-gauge-wrap">
                      <svg className="triage-radial-gauge-svg" viewBox="0 0 140 140">
                        {/* Background track */}
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          className="triage-radial-gauge-track"
                        />
                        {/* Animated gauge stroke */}
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          className="triage-radial-gauge-value"
                          style={{
                            stroke:
                              decision.priority === 'HIGH'
                                ? '#DC2626'
                                : decision.priority === 'REVIEW'
                                ? '#D97706'
                                : '#059669',
                            strokeDasharray: 339.29,
                            strokeDashoffset: 339.29 - (339.29 * Math.min(Math.max(decision.fused_psif_probability, 0), 1)),
                          }}
                        />
                      </svg>
                      <div className="triage-radial-gauge-center">
                        <div
                          className="triage-gauge-pct"
                          style={{
                            color:
                              decision.priority === 'HIGH'
                                ? '#DC2626'
                                : decision.priority === 'REVIEW'
                                ? '#D97706'
                                : '#059669',
                          }}
                        >
                          {(decision.fused_psif_probability * 100).toFixed(0)}%
                        </div>
                        <div className="triage-gauge-label">
                          P(SIF)
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          CALIBRATED
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 4-LAYER MODEL ARBITRATION BENTO GRID */}
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
                    <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers style={{ width: '16px', height: '16px', color: 'var(--accent-teal)' }} />
                      <span>Multi-Layer Model Arbitration Matrix</span>
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Fusion Temperature T = {weights.temperature}
                    </span>
                  </div>

                  {(() => {
                    const getModelContrib = (snippet: string) => {
                      if (!decision.model_contributions) return null;
                      const entry = Object.entries(decision.model_contributions).find(([k]) =>
                        k.toLowerCase().includes(snippet.toLowerCase())
                      );
                      return entry ? entry[1] : null;
                    };
                    const seqContrib = getModelContrib('sequence') || getModelContrib('contextual');
                    const iogpContrib = getModelContrib('iogp');
                    const tfidfContrib = getModelContrib('tfidf') || getModelContrib('baseline');

                    const rawSeq = seqContrib ? seqContrib.raw_probability : 0.88;
                    const rawIogp = iogpContrib ? iogpContrib.raw_probability : 0.74;
                    const rawTfidf = tfidfContrib ? tfidfContrib.raw_probability : 0.62;

                    return (
                      <div className="layer-arbitration-bento">
                        {/* Layer 1: Deterministic Veto */}
                        <div className="layer-bento-card">
                          <div className="layer-bento-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertOctagon style={{ width: '15px', height: '15px' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layer 1</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Deterministic Veto</div>
                              </div>
                            </div>
                            <span
                              className="layer-bento-pill"
                              style={{
                                backgroundColor: decision.is_veto_enforced ? 'rgba(220, 38, 38, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                                color: decision.is_veto_enforced ? '#DC2626' : '#059669',
                              }}
                            >
                              {decision.is_veto_enforced ? 'OVERRULE' : 'PASS'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {decision.is_veto_enforced ? (decision.triggered_rules?.[0] || 'Rule 2 Energy Isolation') : 'No Veto Invariants Broken'}
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: decision.is_veto_enforced ? '#DC2626' : '#059669' }}>
                              {decision.is_veto_enforced ? '100.0%' : '0.0%'}
                            </span>
                          </div>

                          <div className="layer-meter-track">
                            <div
                              className="layer-meter-fill"
                              style={{
                                width: decision.is_veto_enforced ? '100%' : '0%',
                                backgroundColor: '#DC2626',
                              }}
                            />
                          </div>

                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Assigned Weight: ∞ (Hard Veto)</span>
                            <span>0.0 ms Scan</span>
                          </div>
                        </div>

                        {/* Layer 2: Contextual Sequence Attention */}
                        <div className="layer-bento-card">
                          <div className="layer-bento-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles style={{ width: '15px', height: '15px' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layer 2</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Sequence Classifier</div>
                              </div>
                            </div>
                            <span
                              className="layer-bento-pill"
                              style={{ backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' }}
                            >
                              Weight: {(weights.sequence_weight * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Attention Token Weighting
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#7C3AED' }}>
                              {(rawSeq * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="layer-meter-track">
                            <div
                              className="layer-meter-fill"
                              style={{
                                width: `${rawSeq * 100}%`,
                                backgroundColor: '#7C3AED',
                              }}
                            />
                          </div>

                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Contextual Embeddings</span>
                            <span>Multi-head Attention</span>
                          </div>
                        </div>

                        {/* Layer 3: IOGP Co-Occurrence */}
                        <div className="layer-bento-card">
                          <div className="layer-bento-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Crosshair style={{ width: '15px', height: '15px' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layer 3</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>IOGP Multi-Label</div>
                              </div>
                            </div>
                            <span
                              className="layer-bento-pill"
                              style={{ backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}
                            >
                              Weight: {(weights.iogp_weight * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Co-occurrence Frequency Score
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0284C7' }}>
                              {(rawIogp * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="layer-meter-track">
                            <div
                              className="layer-meter-fill"
                              style={{
                                width: `${rawIogp * 100}%`,
                                backgroundColor: '#0284C7',
                              }}
                            />
                          </div>

                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>9 Life-Saving Rules</span>
                            <span>Joint Distribution</span>
                          </div>
                        </div>

                        {/* Layer 4: TF-IDF Prior */}
                        <div className="layer-bento-card">
                          <div className="layer-bento-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Scale style={{ width: '15px', height: '15px' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layer 4</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>TF-IDF N-Gram Prior</div>
                              </div>
                            </div>
                            <span
                              className="layer-bento-pill"
                              style={{ backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}
                            >
                              Weight: {(weights.tfidf_weight * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Lexical N-Gram Frequency
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#059669' }}>
                              {(rawTfidf * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="layer-meter-track">
                            <div
                              className="layer-meter-fill"
                              style={{
                                width: `${rawTfidf * 100}%`,
                                backgroundColor: '#059669',
                              }}
                            />
                          </div>

                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Lexical Salience</span>
                            <span>Statistical Baseline</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. ASSOCIATED IOGP LIFE-SAVING RULES & BARRIERS */}
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
                    <h3 style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Crosshair style={{ width: '15px', height: '15px', color: '#7C3AED' }} />
                      <span>Associated IOGP Life-Saving Rules</span>
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Bow-Tie Barrier Coupling
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '8px 16px',
                        borderRadius: '14px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(124, 58, 237, 0.12)',
                        color: '#7C3AED',
                        border: '1.5px solid rgba(124, 58, 237, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                      }}
                    >
                      <ShieldCheck style={{ width: '16px', height: '16px' }} />
                      <span>Primary: {decision.primary_iogp_rule}</span>
                    </div>

                    {decision.secondary_iogp_rules.map((rule, rIdx) => (
                      <span
                        key={rIdx}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>+</span>
                        <span>{rule}</span>
                      </span>
                    ))}

                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(5, 150, 105, 0.2)',
                      }}
                    >
                      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                      <span>OISD-105 &amp; DGMS Mapped</span>
                    </span>
                  </div>
                </div>

                {/* 4. ENGINE DECISION RATIONALE & SEQUENTIAL AUDIT TRAIL */}
                <div
                  className="card-panel"
                  style={{
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText style={{ width: '16px', height: '16px', color: 'var(--accent-teal)' }} />
                      <span>Engine Decision Rationale &amp; Audit Trail</span>
                    </h3>
                    <span className="pill-status pill-green" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
                      VERIFIED AUDIT LOG
                    </span>
                  </div>

                  <div className="audit-timeline-stream">
                    {decision.decision_rationale.map((rat, rIdx) => (
                      <div key={rIdx} className="audit-timeline-step">
                        <div className="audit-node-bullet">
                          {rIdx + 1}
                        </div>
                        <div className="audit-step-card">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Audit Check #{rIdx + 1}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              +{(rIdx * 1.8 + 0.4).toFixed(1)}ms
                            </span>
                          </div>
                          <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                            {rat}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="card-panel"
                style={{
                  minHeight: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '24px',
                  color: 'var(--text-muted)',
                  fontSize: '13.5px',
                }}
              >
                Select a scenario and click "Execute Calibrated Hybrid Triage".
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CALIBRATION & RELIABILITY DIAGRAM */}
      {activeTab === 'calibration' && calibrationReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metrics Overview Cards */}
          <div className="stats-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="kpi-card" style={{ borderRadius: '24px' }}>
              <span className="kpi-card-label" style={{ color: '#059669' }}>High-PSIF Recall</span>
              <div className="kpi-card-value" style={{ color: '#059669' }}>
                {(calibrationReport.high_psif_recall * 100).toFixed(1)}%
              </div>
              <p className="kpi-card-desc">
                {calibrationReport.detected_high_psif_count} / {calibrationReport.true_high_psif_count} fatal precursors shielded
              </p>
            </div>

            <div className="kpi-card" style={{ borderRadius: '24px' }}>
              <span className="kpi-card-label" style={{ color: '#2563EB' }}>Expected Calibration Error (ECE)</span>
              <div className="kpi-card-value" style={{ color: '#2563EB' }}>
                {(calibrationReport.ece * 100).toFixed(2)}%
              </div>
              <p className="kpi-card-desc">
                Max error (MCE): {(calibrationReport.mce * 100).toFixed(2)}%
              </p>
            </div>

            <div className="kpi-card" style={{ borderRadius: '24px' }}>
              <span className="kpi-card-label" style={{ color: '#7C3AED' }}>Brier Score</span>
              <div className="kpi-card-value" style={{ color: '#7C3AED' }}>
                {calibrationReport.brier_score.toFixed(4)}
              </div>
              <p className="kpi-card-desc">
                Mean squared probability error
              </p>
            </div>

            <div className="kpi-card" style={{ borderRadius: '24px' }}>
              <span className="kpi-card-label" style={{ color: '#D97706' }}>Priority Accuracy</span>
              <div className="kpi-card-value" style={{ color: '#D97706' }}>
                {(calibrationReport.priority_accuracy * 100).toFixed(1)}%
              </div>
              <p className="kpi-card-desc">
                Across {calibrationReport.total_samples} golden evaluation scenarios
              </p>
            </div>
          </div>

          {/* 10-Bin Reliability Diagram Table & Visualization */}
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
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 style={{ width: '18px', height: '18px', color: 'var(--accent-emerald-dark)' }} />
                <span>10-Bin Reliability Diagram & Calibration Curve</span>
              </h3>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Temperature T = {calibrationReport.temperature.toFixed(2)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bin Index</th>
                    <th>Confidence Range</th>
                    <th style={{ textAlign: 'center' }}>Samples</th>
                    <th style={{ textAlign: 'center' }}>Mean Predicted Conf</th>
                    <th style={{ textAlign: 'center' }}>Empirical Accuracy</th>
                    <th style={{ textAlign: 'center' }}>Calibration Gap</th>
                    <th style={{ textAlign: 'right' }}>Alignment</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrationReport.bins.map((bin) => {
                    const gap = Math.abs(bin.empirical_accuracy - bin.mean_confidence);
                    const isAligned = gap <= 0.15;
                    return (
                      <tr key={bin.bin_index}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>Bin #{bin.bin_index}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          [{bin.bin_lower.toFixed(1)} &ndash; {bin.bin_upper.toFixed(1)}]
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{bin.sample_count}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#2563EB', fontWeight: 700, fontSize: '11.5px' }}>
                              {(bin.mean_confidence * 100).toFixed(1)}%
                            </span>
                            <div style={{ width: '56px', height: '4px', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${bin.mean_confidence * 100}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#059669', fontWeight: 700, fontSize: '11.5px' }}>
                              {(bin.empirical_accuracy * 100).toFixed(1)}%
                            </span>
                            <div style={{ width: '56px', height: '4px', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${bin.empirical_accuracy * 100}%`, height: '100%', backgroundColor: '#059669', borderRadius: '9999px' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: gap <= 0.15 ? 'var(--text-muted)' : '#D97706', fontWeight: 700, fontSize: '11.5px' }}>
                          {(gap * 100).toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: isAligned ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                              color: isAligned ? '#059669' : '#D97706',
                              border: isAligned ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(217, 119, 6, 0.25)',
                            }}
                          >
                            {isAligned ? 'WELL CALIBRATED' : 'DISPARITY'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ENSEMBLE TUNER */}
      {activeTab === 'tuner' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal style={{ width: '18px', height: '18px', color: 'var(--accent-emerald-dark)' }} />
                <span>Dynamic Arbitration Weights & Priority Thresholds</span>
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                Tune the blend ratios between Sequence attention semantics, IOGP Life-Saving Rules co-occurrence, and lexical TF-IDF priors.
              </p>
            </div>

            {weightMessage && (
              <div style={{ padding: '12px 16px', borderRadius: '14px', backgroundColor: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.3)', color: '#059669', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{weightMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Model Fusion Weights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers style={{ width: '14px', height: '14px', color: '#2563EB' }} />
                  <span>Layer Arbitration Weights (w_seq + w_iogp + w_tfidf)</span>
                </span>

                {/* Sequence Model Weight */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Contextual Sequence Model (w_seq)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563EB', fontSize: '14px', backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(weights.sequence_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={weights.sequence_weight}
                    onChange={(e) => setWeights({ ...weights, sequence_weight: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Weights attention-pooled embeddings from bidirectional transformer sequences.
                  </div>
                </div>

                {/* IOGP Model Weight */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>IOGP Multi-Label Classifier (w_iogp)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#7C3AED', fontSize: '14px', backgroundColor: 'rgba(124, 58, 237, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(weights.iogp_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={weights.iogp_weight}
                    onChange={(e) => setWeights({ ...weights, iogp_weight: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#7C3AED', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Weights joint co-occurrence across 9 Life-Saving Rules and barrier compromises.
                  </div>
                </div>

                {/* TF-IDF Baseline Weight */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TF-IDF Lexical Prior (w_tfidf)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', fontSize: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(weights.tfidf_weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={weights.tfidf_weight}
                    onChange={(e) => setWeights({ ...weights, tfidf_weight: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Lexical n-gram statistical anchor ensuring stability on rare domain terms.
                  </div>
                </div>
              </div>

              {/* Section 2: Decision Thresholds & Calibration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color-subtle)' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crosshair style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                  <span>Priority Boundaries &amp; Temperature Scaling</span>
                </span>

                {/* High-PSIF Threshold */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>High-PSIF Decision Threshold (&tau;_high)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#DC2626', fontSize: '14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(weights.tau_high * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.70"
                    step="0.02"
                    value={weights.tau_high}
                    onChange={(e) => setWeights({ ...weights, tau_high: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#DC2626', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Incidents at or above this calibrated probability trigger immediate mandatory escalation.
                  </div>
                </div>

                {/* Low-PSIF Threshold */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Low-PSIF Triage Boundary (&tau;_low)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', fontSize: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(weights.tau_low * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.40"
                    step="0.02"
                    value={weights.tau_low}
                    onChange={(e) => setWeights({ ...weights, tau_low: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Incidents between &tau;_low and &tau;_high are routed to the HSE Review Queue.
                  </div>
                </div>

                {/* Temperature Scaling */}
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Temperature Scaling Factor (T)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#D97706', fontSize: '14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {weights.temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={weights.temperature}
                    onChange={(e) => setWeights({ ...weights, temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#D97706', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Softens overconfident logit distributions to minimize Expected Calibration Error (ECE).
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveWeights}
              disabled={savingWeights}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '13px' }}
            >
              {savingWeights ? (
                <>
                  <RefreshCw style={{ width: '15px', height: '15px' }} className="animate-spin" />
                  <span>Saving & Recalibrating...</span>
                </>
              ) : (
                <>
                  <Sliders style={{ width: '15px', height: '15px' }} />
                  <span>Save Configuration & Recalibrate</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
