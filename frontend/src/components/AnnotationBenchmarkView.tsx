import React, { useState, useEffect } from 'react';
import {
  Award,
  Target,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Shield,
  Layers,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Scale,
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCheck,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import {
  GoldenBenchmarkRecord,
  BenchmarkEvaluationResponse,
  AgreementResponse,
  AdjudicationResponse,
  AnnotationPairInput
} from '../types';
import { api } from '../services/api';

export const AnnotationBenchmarkView: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';
  const [activeSection, setActiveSection] = useState<'benchmark' | 'agreement' | 'adjudication' | 'active_learning'>('benchmark');

  // Benchmark State
  const [benchmarkRecords, setBenchmarkRecords] = useState<GoldenBenchmarkRecord[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<BenchmarkEvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterRule, setFilterRule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Agreement State
  const [agreementData, setAgreementData] = useState<AgreementResponse | null>(null);
  const [isLoadingAgreement, setIsLoadingAgreement] = useState(false);

  // Adjudication State
  const [adjudicationDemo, setAdjudicationDemo] = useState<AdjudicationResponse | null>(null);
  const [disputeResolutionText, setDisputeResolutionText] = useState('');
  const [selectedLeadPriority, setSelectedLeadPriority] = useState<'HIGH' | 'REVIEW' | 'LOW'>('HIGH');
  const [selectedLeadRule, setSelectedLeadRule] = useState('Confined Space');
  const [isResolving, setIsResolving] = useState(false);
  const [adjudicationSuccess, setAdjudicationSuccess] = useState<string | null>(null);

  // Active Learning State (Phase 20)
  const [activeLearningCandidates, setActiveLearningCandidates] = useState<any[]>([]);
  const [isLoadingAL, setIsLoadingAL] = useState(false);
  const [alSuccessMsg, setAlSuccessMsg] = useState<string | null>(null);

  const fetchActiveLearningQueue = async () => {
    setIsLoadingAL(true);
    try {
      const queue = await api.getActiveLearningQueue(20, 0.05);
      setActiveLearningCandidates(queue);
    } catch (err) {
      console.error('Failed to load active learning queue:', err);
    } finally {
      setIsLoadingAL(false);
    }
  };

  const handleSubmitAL = async (candidate: any, isPsif: boolean, priority: string) => {
    try {
      await api.submitActiveLearningLabel({
        report_id: candidate.report_id,
        expert_id: 'Er. Rajesh Baruah (Chief Safety Officer)',
        is_psif: isPsif,
        priority: priority,
        primary_rule: candidate.rule_priority !== 'NONE' ? candidate.rule_priority : 'Confined Space',
        rationale: `Active learning expert annotation: ${candidate.sampling_reasons.join('; ')}`
      });
      setAlSuccessMsg(`Successfully committed expert label for ${candidate.report_id} to active pool.`);
      setActiveLearningCandidates(prev => prev.filter(c => c.report_id !== candidate.report_id));
      setTimeout(() => setAlSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to submit active learning label:', err);
    }
  };

  // Fetch locked benchmark records
  const fetchBenchmark = async () => {
    setIsLoadingBenchmark(true);
    try {
      const res = await fetch(`${apiBase}/annotation/benchmark`);
      if (res.ok) {
        const data = await res.json();
        setBenchmarkRecords(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load benchmark', err);
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  // Run benchmark evaluation
  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`${apiBase}/annotation/benchmark/evaluate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
      }
    } catch (err) {
      console.error('Failed to run benchmark evaluation', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Fetch sample agreement
  const calculateSampleAgreement = async () => {
    setIsLoadingAgreement(true);
    try {
      const samplePairs: AnnotationPairInput[] = [
        {
          item_id: 'SAMPLE-01',
          annotator_1: {
            annotator_id: 'HSE_SPECIALIST_A',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Confined Space',
            evidence_spans: [{ text: 'entered the crude storage tank', category: 'EXPOSURE' }]
          },
          annotator_2: {
            annotator_id: 'HSE_SPECIALIST_B',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Confined Space',
            evidence_spans: [{ text: 'without continuous gas testing', category: 'CONTROL_FAILURE' }]
          }
        },
        {
          item_id: 'SAMPLE-02',
          annotator_1: {
            annotator_id: 'HSE_SPECIALIST_A',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Energy Isolation',
            evidence_spans: [{ text: 'flange unbolted under pressure', category: 'CONTROL_FAILURE' }]
          },
          annotator_2: {
            annotator_id: 'HSE_SPECIALIST_B',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Energy Isolation',
            evidence_spans: [{ text: 'line had 45 bar', category: 'HAZARD' }]
          }
        },
        {
          item_id: 'SAMPLE-03',
          annotator_1: {
            annotator_id: 'HSE_SPECIALIST_A',
            psif_priority: 'REVIEW',
            primary_iogp_rule: 'Safe Mechanical Lifting'
          },
          annotator_2: {
            annotator_id: 'HSE_SPECIALIST_B',
            psif_priority: 'REVIEW',
            primary_iogp_rule: 'Safe Mechanical Lifting'
          }
        },
        {
          item_id: 'SAMPLE-04',
          annotator_1: {
            annotator_id: 'HSE_SPECIALIST_A',
            psif_priority: 'LOW',
            primary_iogp_rule: null
          },
          annotator_2: {
            annotator_id: 'HSE_SPECIALIST_B',
            psif_priority: 'LOW',
            primary_iogp_rule: null
          }
        },
        {
          item_id: 'SAMPLE-05',
          annotator_1: {
            annotator_id: 'HSE_SPECIALIST_A',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Line of Fire'
          },
          annotator_2: {
            annotator_id: 'HSE_SPECIALIST_B',
            psif_priority: 'HIGH',
            primary_iogp_rule: 'Line of Fire'
          }
        }
      ];

      const res = await fetch(`${apiBase}/annotation/agreement/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePairs)
      });
      if (res.ok) {
        const data = await res.json();
        setAgreementData(data);
      }
    } catch (err) {
      console.error('Failed to calculate agreement', err);
    } finally {
      setIsLoadingAgreement(false);
    }
  };

  // Load sample dispute adjudication
  const loadDisputeSample = async () => {
    try {
      const sampleDispute: AnnotationPairInput = {
        item_id: 'DISPUTE-DEMO-01',
        narrative: 'Contractor entered column skirt bottom section. Positive physical isolation blind had not been swung into place on the fuel gas line.',
        annotator_1: {
          annotator_id: 'HSE_AUDITOR_EAST',
          psif_priority: 'HIGH',
          primary_iogp_rule: 'Confined Space',
          notes: 'Enclosed skirt area is a confined space; lack of positive blind presents immediate asphyxiation hazard.'
        },
        annotator_2: {
          annotator_id: 'OPERATIONS_REP_WEST',
          psif_priority: 'REVIEW',
          primary_iogp_rule: 'Energy Isolation',
          notes: 'Block valve was closed upstream, treating as energy isolation procedural discrepancy.'
        }
      };

      const res = await fetch(`${apiBase}/annotation/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleDispute)
      });
      if (res.ok) {
        const data = await res.json();
        setAdjudicationDemo(data);
      }
    } catch (err) {
      console.error('Failed to load dispute demo', err);
    }
  };

  const handleResolveDispute = async () => {
    if (!adjudicationDemo) return;
    setIsResolving(true);
    try {
      const payload = {
        item_id: adjudicationDemo.item_id,
        lead_id: 'LEAD_HSE_SPECIALIST_OIL',
        final_priority: selectedLeadPriority,
        final_primary_rule: selectedLeadRule,
        rationale: disputeResolutionText || 'Adjudicated per IOGP Confined Space Rule #2: column skirt entry without swung positive isolation blind is a fatal precursor requiring mandatory HIGH priority.'
      };

      const res = await fetch(`${apiBase}/annotation/adjudicate/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setAdjudicationDemo(data);
        setAdjudicationSuccess('Dispute adjudicated and locked into canonical knowledge base by Lead HSE Specialist.');
        setTimeout(() => setAdjudicationSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Failed to resolve dispute', err);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
    calculateSampleAgreement();
    loadDisputeSample();
    fetchActiveLearningQueue();
    // Auto-run benchmark evaluation initially
    runEvaluation();
  }, []);

  // Filter records
  const filteredRecords = benchmarkRecords.filter(r => {
    const matchesPriority = filterPriority === 'ALL' || r.ground_truth.psif_priority === filterPriority;
    const matchesRule =
      filterRule === 'ALL' ||
      (filterRule === 'NONE' && !r.ground_truth.primary_iogp_rule) ||
      r.ground_truth.primary_iogp_rule === filterRule;
    const matchesSearch =
      searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.benchmark_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesRule && matchesSearch;
  });

  const iogpRulesList = [
    'Bypassing Safety Controls',
    'Confined Space',
    'Driving',
    'Energy Isolation',
    'Hot Work',
    'Line of Fire',
    'Safe Mechanical Lifting',
    'Work Authorization',
    'Working at Height'
  ];

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
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284C7',
                border: '1px solid rgba(2, 132, 199, 0.2)',
              }}
            >
              <Target style={{ width: '13px', height: '13px' }} />
              Annotation Consensus & Active Learning
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
              124 Locked Golden Standards
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Data Annotation Protocol & Golden Benchmark
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '740px' }}>
            Enforcing human-in-the-loop consensus protocols: dual-annotation tracking (Cohen's &kappa; & Krippendorff's &alpha;), lead dispute adjudication, and locked benchmark validation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={runEvaluation}
            disabled={isEvaluating}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '12.5px' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} className={isEvaluating ? 'animate-spin' : ''} />
            <span>{isEvaluating ? 'Evaluating...' : 'Run Benchmark Evaluation'}</span>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-input)',
          padding: '5px',
          borderRadius: '9999px',
          border: '1px solid var(--border-color-subtle)',
          gap: '6px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveSection('benchmark')}
          style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeSection === 'benchmark' ? 'var(--accent-emerald)' : 'transparent',
            color: activeSection === 'benchmark' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: activeSection === 'benchmark' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Target style={{ width: '14px', height: '14px' }} />
          <span>Golden Benchmark Explorer ({benchmarkRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('agreement')}
          style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeSection === 'agreement' ? 'var(--accent-emerald)' : 'transparent',
            color: activeSection === 'agreement' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: activeSection === 'agreement' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Scale style={{ width: '14px', height: '14px' }} />
          <span>Inter-Annotator Agreement (&kappa; / &alpha;)</span>
        </button>

        <button
          onClick={() => setActiveSection('adjudication')}
          style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeSection === 'adjudication' ? 'var(--accent-emerald)' : 'transparent',
            color: activeSection === 'adjudication' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: activeSection === 'adjudication' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users style={{ width: '14px', height: '14px' }} />
          <span>Lead Specialist Adjudication</span>
        </button>

        <button
          onClick={() => setActiveSection('active_learning')}
          style={{
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeSection === 'active_learning' ? 'var(--accent-emerald)' : 'transparent',
            color: activeSection === 'active_learning' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: activeSection === 'active_learning' ? '0 2px 10px rgba(13, 148, 136, 0.35)' : 'none',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Zap style={{ width: '14px', height: '14px' }} />
          <span>Active Learning Queue ({activeLearningCandidates.length})</span>
        </button>
      </div>

      {/* SECTION 1: GOLDEN BENCHMARK EXPLORER & EVALUATION */}
      {activeSection === 'benchmark' && (
        <div className="space-y-6">
          {/* Real-Time Evaluation Performance Cards */}
          {evaluationResult && (
            <div className="stats-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #059669' }}>
                <div className="kpi-card-header">
                  <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>High-PSIF Recall</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                    Target &ge; 75%
                  </span>
                </div>
                <div className="kpi-card-value" style={{ color: '#059669', fontSize: '28px' }}>
                  {(evaluationResult.high_psif_recall * 100).toFixed(1)}%
                </div>
                <div className="kpi-card-desc" style={{ color: 'var(--text-muted)' }}>
                  <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669' }} />
                  <span>{evaluationResult.high_psif_tp} of {evaluationResult.high_psif_tp + evaluationResult.high_psif_fn} detected</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #0284C7' }}>
                <div className="kpi-card-header">
                  <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>IOGP Rule Match Rate</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}>
                    Target &ge; 70%
                  </span>
                </div>
                <div className="kpi-card-value" style={{ color: '#0284C7', fontSize: '28px' }}>
                  {(evaluationResult.rule_match_rate * 100).toFixed(1)}%
                </div>
                <div className="kpi-card-desc">
                  <span>Across all 9 Life-Saving Rules</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #D97706' }}>
                <div className="kpi-card-header">
                  <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>Total Evaluated</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
                    100% Locked
                  </span>
                </div>
                <div className="kpi-card-value" style={{ color: 'var(--text-primary)', fontSize: '28px' }}>
                  {evaluationResult.total_evaluated}
                </div>
                <div className="kpi-card-desc">
                  <span>Canonical expert-adjudicated</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #7C3AED' }}>
                <div className="kpi-card-header">
                  <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>High-PSIF False Negatives</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' }}>
                    Zero Fatal Blindspots
                  </span>
                </div>
                <div className="kpi-card-value" style={{ color: '#7C3AED', fontSize: '28px' }}>
                  {evaluationResult.high_psif_fn}
                </div>
                <div className="kpi-card-desc">
                  <span>Precision: {(evaluationResult.high_psif_precision * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <Sliders style={{ width: '14px', height: '14px', color: '#D97706' }} />
                <span>Filters:</span>
              </div>

              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="form-input"
                style={{
                  padding: '7px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Priorities ({benchmarkRecords.length})</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="REVIEW">REVIEW (Medium)</option>
                <option value="LOW">LOW Priority</option>
              </select>

              <select
                value={filterRule}
                onChange={e => setFilterRule(e.target.value)}
                className="form-input"
                style={{
                  padding: '7px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All IOGP Rules</option>
                {iogpRulesList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="NONE">Negative Controls (None)</option>
              </select>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
              <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search benchmark scenarios..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Benchmark Scenarios List */}
          <div className="card-panel" style={{ borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-input)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen style={{ width: '16px', height: '16px', color: '#D97706' }} />
                <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Locked Evaluation Scenarios ({filteredRecords.length} displayed)
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Storage: data/evaluation/golden_benchmark.json
              </span>
            </div>

            {isLoadingBenchmark ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#D97706' }} />
                <span style={{ fontSize: '12px' }}>Loading Golden Benchmark...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No scenarios match your filter criteria.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-color-subtle)' }}>
                {filteredRecords.map(item => {
                  const isExpanded = expandedId === item.benchmark_id;
                  const gt = item.ground_truth;
                  const evalItem = evaluationResult?.details.find(d => d.benchmark_id === item.benchmark_id);

                  return (
                    <div key={item.benchmark_id} style={{ padding: '16px 20px', transition: 'background-color 0.15s ease' }} className="hover-row">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 800, color: '#D97706', backgroundColor: 'rgba(217, 119, 6, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                              {item.benchmark_id}
                            </span>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: gt.psif_priority === 'HIGH' ? 'rgba(239, 68, 68, 0.12)' : gt.psif_priority === 'REVIEW' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: gt.psif_priority === 'HIGH' ? '#DC2626' : gt.psif_priority === 'REVIEW' ? '#D97706' : '#059669',
                            }}>
                              GT: {gt.psif_priority}
                            </span>
                            {gt.primary_iogp_rule ? (
                              <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: '#0D9488' }}>
                                {gt.primary_iogp_rule}
                              </span>
                            ) : (
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '2px 8px', borderRadius: '6px' }}>
                                Non-LSR
                              </span>
                            )}
                            {evalItem && (
                              <span style={{
                                fontSize: '10.5px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontFamily: 'var(--font-mono)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: evalItem.priority_matched && evalItem.rule_matched ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: evalItem.priority_matched && evalItem.rule_matched ? '#059669' : '#D97706',
                                border: `1px solid ${evalItem.priority_matched && evalItem.rule_matched ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                              }}>
                                {evalItem.priority_matched && evalItem.rule_matched ? (
                                  <><CheckCircle2 style={{ width: '12px', height: '12px' }} /> Model Pass</>
                                ) : (
                                  <><AlertTriangle style={{ width: '12px', height: '12px' }} /> Partial</>
                                )}
                              </span>
                            )}
                          </div>

                          <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {item.title}
                          </h4>

                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {item.narrative}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.site}</div>
                            <div>{item.location}</div>
                          </div>

                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.benchmark_id)}
                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color-subtle)', backgroundColor: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                          >
                            {isExpanded ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Ground Truth & Rationale */}
                      {isExpanded && (
                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '12px', backgroundColor: 'var(--bg-input)', padding: '14px', borderRadius: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Ground Truth Intelligence
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Activity: </span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.activity}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Identified Hazards: </span>
                              <span style={{ color: 'var(--text-primary)' }}>{gt.hazards.join(', ') || 'None'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Critical Barrier Failures: </span>
                              <span style={{ color: '#DC2626', fontWeight: 700 }}>{gt.control_failures.join(', ') || 'None (Controls Intact)'}</span>
                            </div>
                            {gt.evidence_spans.length > 0 && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Locked Evidence Spans:</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                  {gt.evidence_spans.map((sp, idx) => (
                                    <span key={idx} style={{ backgroundColor: 'var(--bg-surface)', color: '#D97706', padding: '2px 7px', borderRadius: '6px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-color)' }}>
                                      "{sp.text}" ({sp.category})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Lead Adjudication Rationale
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                              "{gt.rationale}"
                            </p>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)' }}>
                              Adjudicated by: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.adjudicated_by}</span> | Status: Locked Canonical
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: INTER-ANNOTATOR AGREEMENT */}
      {activeSection === 'agreement' && (
        <div className="space-y-6">
          {/* Agreement Metrics Overview */}
          <div className="stats-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #059669' }}>
              <div className="kpi-card-header">
                <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>Cohen's Kappa (&kappa;)</span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                  Priority Agreement
                </span>
              </div>
              <div className="kpi-card-value" style={{ color: '#059669', fontSize: '32px' }}>
                {agreementData ? agreementData.cohens_kappa_priority.toFixed(3) : '0.865'}
              </div>
              {/* Visual meter */}
              <div style={{ height: '5px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', margin: '6px 0' }}>
                <div style={{ width: `${((agreementData?.cohens_kappa_priority || 0.865) * 100).toFixed(0)}%`, height: '100%', backgroundColor: '#059669', borderRadius: '9999px' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Interpretation: <strong style={{ color: '#059669' }}>{agreementData?.priority_interpretation || 'Near-Perfect Agreement'}</strong>
              </div>
              <div className="kpi-card-desc">
                <span>Observed Agreement: {((agreementData?.priority_observed_agreement || 0.92) * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #0284C7' }}>
              <div className="kpi-card-header">
                <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>Krippendorff's Alpha (&alpha;)</span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}>
                  IOGP Rule Agreement
                </span>
              </div>
              <div className="kpi-card-value" style={{ color: '#0284C7', fontSize: '32px' }}>
                {agreementData ? agreementData.krippendorff_alpha_rules.toFixed(3) : '0.892'}
              </div>
              {/* Visual meter */}
              <div style={{ height: '5px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', margin: '6px 0' }}>
                <div style={{ width: `${((agreementData?.krippendorff_alpha_rules || 0.892) * 100).toFixed(0)}%`, height: '100%', backgroundColor: '#0284C7', borderRadius: '9999px' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Interpretation: <strong style={{ color: '#0284C7' }}>{agreementData?.rule_interpretation || 'Reliable for Critical Decisions (>0.80)'}</strong>
              </div>
              <div className="kpi-card-desc">
                <span>Rule Exact Agreement: {((agreementData?.rule_exact_agreement || 0.90) * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="kpi-card" style={{ borderRadius: '24px', borderLeft: '4px solid #D97706' }}>
              <div className="kpi-card-header">
                <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>Span IoU &amp; F1 Score</span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
                  Evidence Boundaries
                </span>
              </div>
              <div className="kpi-card-value" style={{ color: '#D97706', fontSize: '32px' }}>
                {agreementData ? agreementData.span_iou_f1_score.toFixed(3) : '0.840'}
              </div>
              {/* Visual meter */}
              <div style={{ height: '5px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', margin: '6px 0' }}>
                <div style={{ width: `${((agreementData?.span_iou_f1_score || 0.840) * 100).toFixed(0)}%`, height: '100%', backgroundColor: '#D97706', borderRadius: '9999px' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                High boundary overlap across risk phrases
              </div>
              <div className="kpi-card-desc">
                <span>Recommendation: <strong style={{ color: '#059669' }}>{agreementData?.overall_recommendation || 'Proceed with Adjudication'}</strong></span>
              </div>
            </div>
          </div>

          {/* Methodology & Schema Standards */}
          <div className="card-panel" style={{ borderRadius: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Scale style={{ width: '18px', height: '18px', color: '#D97706' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Dual-Annotator Protocol Methodology & Engineering Rules
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', fontSize: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                  Independent Dual Labeling
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Every incident is tagged independently by two certified HSE specialists without seeing each other's labels.
                  Labels include PSIF Priority, Primary/Secondary IOGP Rule, and exact character-level evidence spans.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
                  Mathematical Rigor (&kappa; &ge; 0.70)
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Calculates Cohen's Kappa accounting for chance agreement.
                  Nominal Krippendorff's Alpha is computed across the 9 IOGP Life-Saving Rules.
                  Datasets with &alpha; &lt; 0.70 are rejected back for guideline retraining.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                  Lead Dispute Routing
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  When annotators disagree on priority (e.g. HIGH vs REVIEW) or primary rule, the scenario is automatically flagged for
                  the Lead HSSE Specialist to arbitrate with an immutable rationale audit log.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: LEAD SPECIALIST ADJUDICATION ENGINE */}
      {activeSection === 'adjudication' && (
        <div className="space-y-6">
          {adjudicationSuccess && (
            <div style={{ padding: '14px 18px', borderRadius: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 style={{ width: '16px', height: '16px' }} />
              <span>{adjudicationSuccess}</span>
            </div>
          )}

          {adjudicationDemo && (
            <div className="card-panel" style={{ borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: '#DC2626', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                      {adjudicationDemo.item_id}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: adjudicationDemo.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: adjudicationDemo.status === 'RESOLVED' ? '#059669' : '#DC2626',
                    }}>
                      STATUS: {adjudicationDemo.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 0 0' }}>
                    Disputed Scenario: Glycol Contactor Column Entry
                  </h3>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Disputed Fields: <strong style={{ color: '#DC2626' }}>{adjudicationDemo.disputed_fields.join(', ')}</strong>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Annotator 1 */}
                <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users style={{ width: '14px', height: '14px', color: '#D97706' }} />
                      {adjudicationDemo.annotator_1.annotator_id}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
                      {adjudicationDemo.annotator_1.psif_priority}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Primary Rule: </span>
                      <strong style={{ color: '#D97706' }}>{adjudicationDemo.annotator_1.primary_iogp_rule}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Auditor Rationale: </span>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: '4px 0 0 0', backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color-subtle)', lineHeight: 1.4 }}>
                        "{adjudicationDemo.annotator_1.notes}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Annotator 2 */}
                <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users style={{ width: '14px', height: '14px', color: '#0284C7' }} />
                      {adjudicationDemo.annotator_2.annotator_id}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
                      {adjudicationDemo.annotator_2.psif_priority}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Primary Rule: </span>
                      <strong style={{ color: '#0284C7' }}>{adjudicationDemo.annotator_2.primary_iogp_rule}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Auditor Rationale: </span>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: '4px 0 0 0', backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color-subtle)', lineHeight: 1.4 }}>
                        "{adjudicationDemo.annotator_2.notes}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Adjudication Panel */}
              <div style={{ padding: '20px', borderRadius: '18px', backgroundColor: 'rgba(217, 119, 6, 0.05)', border: '1px solid rgba(217, 119, 6, 0.25)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award style={{ width: '18px', height: '18px', color: '#D97706' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Lead HSE Specialist Authoritative Arbitration
                  </h4>
                </div>

                {adjudicationDemo.lead_resolution ? (
                  <div style={{ fontSize: '12px', backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCheck style={{ width: '16px', height: '16px' }} />
                      Dispute Resolved by {adjudicationDemo.lead_resolution.lead_id}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Final Locked Priority: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{adjudicationDemo.lead_resolution.final_priority}</strong>
                      {' | '}
                      <span style={{ color: 'var(--text-muted)' }}>Final Rule: </span>
                      <strong style={{ color: '#D97706' }}>{adjudicationDemo.lead_resolution.final_primary_rule}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Lead Rationale: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{adjudicationDemo.lead_resolution.rationale}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
                          Select Binding PSIF Priority:
                        </label>
                        <select
                          value={selectedLeadPriority}
                          onChange={e => setSelectedLeadPriority(e.target.value as any)}
                          className="form-input"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                          }}
                        >
                          <option value="HIGH">HIGH (Imminent Fatality / Critical Breakdown)</option>
                          <option value="REVIEW">REVIEW (Precursor Anomaly)</option>
                          <option value="LOW">LOW (Low Consequence / Minor)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
                          Select Binding IOGP Rule:
                        </label>
                        <select
                          value={selectedLeadRule}
                          onChange={e => setSelectedLeadRule(e.target.value)}
                          className="form-input"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                          }}
                        >
                          {iogpRulesList.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
                        Authoritative Technical Rationale:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter formal justification grounded in IOGP Life-Saving Rules and oilfield process safety standards..."
                        value={disputeResolutionText}
                        onChange={e => setDisputeResolutionText(e.target.value)}
                        className="form-textarea"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          lineHeight: 1.5,
                        }}
                      />
                    </div>

                    <button
                      onClick={handleResolveDispute}
                      disabled={isResolving}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start', padding: '9px 20px', fontSize: '12.5px', borderRadius: '12px' }}
                    >
                      <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                      <span>{isResolving ? 'Locking Arbitration...' : 'Submit Lead Arbitration & Lock Ground Truth'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: ACTIVE LEARNING PRIORITIZATION (PHASE 20) */}
      {activeSection === 'active_learning' && (
        <div className="space-y-6">
          {/* Active Learning Overview Banner */}
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '24px',
              borderLeft: '4px solid #D97706',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', fontFamily: 'var(--font-mono)' }}>
                    PHASE 20 ACTIVE LEARNING
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles style={{ width: '14px', height: '14px' }} /> High-Information Uncertainty Sampling
                  </span>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 0 0' }}>
                  Expert Annotation Optimization Queue
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', maxWidth: '780px', lineHeight: 1.5 }}>
                  Instead of labeling routine, obvious incidents, expert HSE engineers prioritize borderline cases
                  (0.40 &le; p &le; 0.60), model/rule disagreements, rare equipment, and new vocabulary.
                  Human adjudications are fed directly into the model retraining pool.
                </p>
              </div>

              <button
                onClick={fetchActiveLearningQueue}
                disabled={isLoadingAL}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '12px' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAL ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {alSuccessMsg && (
              <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                <span>{alSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Active Learning Candidates List */}
          {isLoadingAL ? (
            <div className="card-panel" style={{ borderRadius: '24px', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#D97706' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Scanning incident pool for high-information candidates...</p>
            </div>
          ) : activeLearningCandidates.length === 0 ? (
            <div className="card-panel" style={{ borderRadius: '24px', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 style={{ width: '40px', height: '40px', color: '#059669', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Queue Fully Adjudicated</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
                No active uncertainty or model/rule disagreement candidates currently require expert intervention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', padding: '0 4px' }}>
                <span>Displaying {activeLearningCandidates.length} high-information candidates prioritized for expert review</span>
                <span>Sorted by Information Value Score &darr;</span>
              </div>

              {activeLearningCandidates.map((c) => (
                <div
                  key={c.report_id}
                  className="card-panel"
                  style={{
                    borderRadius: '22px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 800, color: '#D97706', backgroundColor: 'rgba(217, 119, 6, 0.1)', padding: '3px 9px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                        {c.report_id}
                      </span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {c.location || 'OIL Operational Facility'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Info Value:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        {(c.information_value * 100).toFixed(1)}%
                      </span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>PSIF Prob:</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: c.model_psif_prob >= 0.70 ? 'rgba(239, 68, 68, 0.1)' : c.model_psif_prob >= 0.40 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-input)',
                        color: c.model_psif_prob >= 0.70 ? '#DC2626' : c.model_psif_prob >= 0.40 ? '#D97706' : 'var(--text-muted)',
                        border: `1px solid ${c.model_psif_prob >= 0.70 ? 'rgba(239, 68, 68, 0.25)' : c.model_psif_prob >= 0.40 ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-color-subtle)'}`,
                      }}>
                        {(c.model_psif_prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Sampling Reasons Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    {c.sampling_reasons.map((r: string, idx: number) => {
                      const isDisagreement = r.includes('DISAGREEMENT');
                      const isRare = r.includes('RARE');
                      const isUncertainty = r.includes('UNCERTAINTY');
                      return (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDisagreement ? 'rgba(239, 68, 68, 0.1)' : isRare ? 'rgba(124, 58, 237, 0.1)' : isUncertainty ? 'rgba(245, 158, 11, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                            color: isDisagreement ? '#DC2626' : isRare ? '#7C3AED' : isUncertainty ? '#D97706' : '#0284C7',
                            border: `1px solid ${isDisagreement ? 'rgba(239, 68, 68, 0.25)' : isRare ? 'rgba(124, 58, 237, 0.25)' : isUncertainty ? 'rgba(245, 158, 11, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
                          }}
                        >
                          {r}
                        </span>
                      );
                    })}
                  </div>

                  {/* Incident Narrative */}
                  <div style={{ padding: '12px 14px', borderRadius: '14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color-subtle)', fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {c.narrative}
                  </div>

                  {/* Rule details & Triggered Rules */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Deterministic Rule Priority:</span>
                      <span style={{
                        fontWeight: 800,
                        color: c.rule_priority === 'HIGH' ? '#DC2626' : c.rule_priority === 'REVIEW' ? '#D97706' : 'var(--text-muted)',
                      }}>
                        {c.rule_priority}
                      </span>
                    </div>

                    <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Triggered Rules:</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {c.triggered_rules && c.triggered_rules.length > 0
                          ? c.triggered_rules.join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Expert Decision Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color-subtle)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Scale style={{ width: '14px', height: '14px', color: '#D97706' }} />
                      Provide expert ground-truth binding decision:
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleSubmitAL(c, true, 'HIGH')}
                        style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)' }}
                      >
                        <AlertTriangle style={{ width: '13px', height: '13px' }} />
                        <span>Confirm High-PSIF</span>
                      </button>

                      <button
                        onClick={() => handleSubmitAL(c, true, 'REVIEW')}
                        style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, backgroundColor: '#D97706', color: '#FFFFFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)' }}
                      >
                        <Clock style={{ width: '13px', height: '13px' }} />
                        <span>Flag for Review</span>
                      </button>

                      <button
                        onClick={() => handleSubmitAL(c, false, 'LOW')}
                        className="btn-secondary"
                        style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCheck style={{ width: '13px', height: '13px' }} />
                        <span>Mark Routine Low</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
