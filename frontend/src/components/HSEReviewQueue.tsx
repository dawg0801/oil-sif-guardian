import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Filter,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Clock,
  Activity,
  History,
  TrendingUp,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sliders,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Search,
  CheckSquare,
  Lock,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import {
  ReportResponse,
  PendingReviewItem,
  ReviewHistoryItem,
  ReviewMetricsData,
  AdjudicationRequest
} from '../types';

interface HSEReviewQueueProps {
  onSelectReport: (report: ReportResponse) => void;
}

const CANONICAL_IOGP_RULES = [
  'Bypassing Safety Controls',
  'Confined Space',
  'Driving',
  'Energy Isolation',
  'Hot Work',
  'Line of Fire',
  'Safe Mechanical Lifting',
  'Toxic Gas',
  'Work Authorization',
  'Working at Height'
];

const BARRIER_CATEGORIES = [
  'Physical Barrier / Containment',
  'Operational / Procedural Control',
  'Administrative / Permit-to-Work',
  'Gas Detection / Monitoring System',
  'Personal Protective Equipment (PPE)'
];

const STATUTORY_TAGS = [
  'OISD-105 (Work Permit)',
  'OISD-114 (Hazardous Area)',
  'OISD-118 (LOTO)',
  'OISD-137 (Flare System)',
  'OISD-141 (Rig Safety)',
  'OISD-152 (Structural Integrity)',
  'DGMS (OMR-2017)',
  'CEA Safety Reg 30',
  'Factories Act 1948',
  'PNGRB G.S.R. 808(E)'
];

const OVERRIDE_REASONS = [
  { code: 'PRECURSOR_CONFIRMED', label: 'Precursor Confirmed (Concur with AI assessment)' },
  { code: 'ENERGY_MITIGATED', label: 'Energy Mitigated (Hazard was isolated / depressurized to 0 psi)' },
  { code: 'FALSE_POSITIVE_KEYWORD', label: 'False Positive Keyword (Context was non-hazardous / training)' },
  { code: 'INCORRECT_ATTRIBUTION', label: 'Incorrect Attribution (Model misclassified activity or rule)' },
  { code: 'PHYSICAL_ISOLATION_CONFIRMED', label: 'Physical Isolation Confirmed (Air gap / blind flange verified)' },
  { code: 'EQUIPMENT_DECOMMISSIONED', label: 'Equipment Decommissioned (Vessel was out of service and purged)' },
  { code: 'ADMINISTRATIVE_ONLY', label: 'Administrative Only (Paperwork discrepancy with zero physical hazard)' },
  { code: 'IMMEDIATE_STAND_DOWN', label: 'Immediate Stand-down (Work stopped immediately before exposure)' },
  { code: 'OTHER', label: 'Other (Detailed in investigation notes)' }
];

export const HSEReviewQueue: React.FC<HSEReviewQueueProps> = ({ onSelectReport }) => {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'METRICS_HISTORY'>('QUEUE');

  // Queue state
  const [pendingReports, setPendingReports] = useState<PendingReviewItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ReviewHistoryItem[]>([]);
  const [metrics, setMetrics] = useState<ReviewMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterVetoOnly, setFilterVetoOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Adjudication Modal state
  const [activeItem, setActiveItem] = useState<PendingReviewItem | null>(null);
  const [activeFullReport, setActiveFullReport] = useState<ReportResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form inputs
  const [reviewerId, setReviewerId] = useState('HSE-LEAD-OIL-01');
  const [reviewerRole, setReviewerRole] = useState<'HSE_OFFICER' | 'HSE_LEAD' | 'SAFETY_MANAGER' | 'CHIEF_SAFETY_OFFICER' | 'LEAD_AUDITOR'>('HSE_LEAD');
  const [decision, setDecision] = useState<'CONFIRMED' | 'MODIFIED' | 'REJECTED' | 'ESCALATED'>('CONFIRMED');
  const [finalPriority, setFinalPriority] = useState<'HIGH' | 'REVIEW' | 'LOW'>('HIGH');
  const [finalPrimaryRule, setFinalPrimaryRule] = useState<string>('');
  const [selectedBarriers, setSelectedBarriers] = useState<string[]>([]);
  const [selectedStatutory, setSelectedStatutory] = useState<string[]>([]);
  const [overrideReason, setOverrideReason] = useState<string>('PRECURSOR_CONFIRMED');
  const [notes, setNotes] = useState<string>('');
  const [seniorSignoff, setSeniorSignoff] = useState<string>('');

  // Corrective action creation
  const [createAction, setCreateAction] = useState<boolean>(false);
  const [actionTitle, setActionTitle] = useState<string>('');
  const [actionAssignee, setActionAssignee] = useState<string>('');
  const [actionDueDate, setActionDueDate] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes, metricsRes] = await Promise.all([
        api.getPendingReviews({
          priority: filterPriority || undefined,
          veto_only: filterVetoOnly || undefined,
          limit: 100
        }),
        api.getReviewHistory({ limit: 20 }),
        api.getReviewMetrics()
      ]);
      setPendingReports(pendingRes);
      setHistoryItems(historyRes);
      setMetrics(metricsRes);
    } catch (err) {
      console.error('Failed to load review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPriority, filterVetoOnly]);

  const handleOpenAdjudication = async (item: PendingReviewItem) => {
    setActiveItem(item);
    setModalLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    setDecision('CONFIRMED');
    setFinalPriority(item.ai_priority);
    setFinalPrimaryRule(item.primary_rule || CANONICAL_IOGP_RULES[0]);
    setSelectedBarriers([]);
    setSelectedStatutory(item.statutory_citation ? [item.statutory_citation] : []);
    setOverrideReason('PRECURSOR_CONFIRMED');
    setNotes('');
    setSeniorSignoff('');
    setCreateAction(item.ai_priority === 'HIGH' || item.is_veto_enforced);
    setActionTitle(`Remediate safety gap for ${item.report_id} (${item.primary_rule || 'Critical Control'})`);
    setActionAssignee('HSE Field Operations Superintendent');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    setActionDueDate(futureDate.toISOString().split('T')[0]);

    try {
      const full = await api.getReport(item.report_id);
      setActiveFullReport(full);
      if (full.life_saving_rules && full.life_saving_rules.length > 0) {
        setFinalPrimaryRule(full.life_saving_rules[0].rule_name);
      }
    } catch (err) {
      console.error('Failed to fetch full report:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSubmitAdjudication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    setSubmitting(true);
    setErrorMessage(null);

    const payload: AdjudicationRequest = {
      report_id: activeItem.report_id,
      reviewer_id: reviewerId,
      reviewer_role: reviewerRole,
      decision,
      final_priority: finalPriority,
      final_primary_rule: finalPrimaryRule,
      final_secondary_rules: activeFullReport?.life_saving_rules?.slice(1).map((r) => r.rule_name) || [],
      barrier_failures: selectedBarriers,
      statutory_tags: selectedStatutory,
      override_reason_code: overrideReason,
      reviewer_notes: notes,
      senior_signoff_by: seniorSignoff || undefined,
      create_corrective_action: createAction,
      action_title: createAction ? actionTitle : undefined,
      action_assignee: createAction ? actionAssignee : undefined,
      action_due_date: createAction ? actionDueDate : undefined
    };

    try {
      const res = await api.adjudicateReport(payload);
      setSuccessMessage(
        `Adjudication recorded! Verdict: ${res.final_priority}. Audit Event: ${res.audit_event_id.slice(0, 8)}...`
      );
      fetchData();
      setTimeout(() => {
        setActiveItem(null);
        setActiveFullReport(null);
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit adjudication');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reports in queue
  const displayedReports = pendingReports.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.report_id.toLowerCase().includes(q) ||
      r.site.toLowerCase().includes(q) ||
      r.raw_text.toLowerCase().includes(q) ||
      (r.primary_rule && r.primary_rule.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ====================================================================
          1. TOP EXECUTIVE HITL SUMMARY CARDS
          ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div className="card-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: 'var(--accent-amber-light)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pending Adjudications
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
              {metrics?.pending_count ?? pendingReports.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
              Awaiting HSE sign-off
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              High-PSIF Unreviewed
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#DC2626', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
              {metrics?.high_priority_pending ?? 0}
            </div>
            <div style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, marginTop: '1px' }}>
              Mandatory statutory SLA
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: 'var(--accent-emerald-light)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Human-AI Concurrence
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
              {metrics ? `${(metrics.agreement_rate * 100).toFixed(1)}%` : '100%'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, marginTop: '1px' }}>
              High-PSIF concordance
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: 'var(--accent-blue-light)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Calibration Drift
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
              {metrics?.drift_status || 'NORMAL'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
              Brier score &lt; 0.15
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. NAVIGATION PILLS & REFRESH BAR
          ==================================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`sub-tab-btn ${activeTab === 'QUEUE' ? 'active' : ''}`}
            style={{ fontSize: '15px' }}
          >
            <span>Active Triage Queue</span>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--accent-amber-light)', color: 'var(--accent-amber-dark)', marginLeft: '6px' }}>
              {pendingReports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('METRICS_HISTORY')}
            className={`sub-tab-btn ${activeTab === 'METRICS_HISTORY' ? 'active' : ''}`}
            style={{ fontSize: '15px' }}
          >
            <span>Audit History & Metrics</span>
          </button>
        </div>

        <button
          onClick={fetchData}
          className="btn-secondary"
          title="Refresh Queue"
        >
          <RefreshCw style={{ width: '14px', height: '14px', animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* ====================================================================
          3. ACTIVE QUEUE TAB CONTENT (Pill Filters + Beautiful Cards)
          ==================================================================== */}
      {activeTab === 'QUEUE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filter Bar */}
          <div className="card-panel" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter by ID, site, keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '34px', height: '38px', fontSize: '13px', borderRadius: '9999px' }}
                />
              </div>

              {/* Priority Segmented Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-input)', padding: '3px', borderRadius: '9999px' }}>
                {[
                  { val: '', label: 'All' },
                  { val: 'HIGH', label: 'High PSIF' },
                  { val: 'REVIEW', label: 'Review' },
                  { val: 'LOW', label: 'Low' },
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setFilterPriority(p.val)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: filterPriority === p.val ? 'var(--accent-emerald-dark)' : 'transparent',
                      color: filterPriority === p.val ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Veto Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>
                <input
                  type="checkbox"
                  checked={filterVetoOnly}
                  onChange={(e) => setFilterVetoOnly(e.target.checked)}
                  style={{ accentColor: '#DC2626' }}
                />
                <ShieldAlert style={{ width: '16px', height: '16px' }} />
                <span>Rule 2 Veto Cases Only</span>
              </label>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Showing {displayedReports.length} of {pendingReports.length} pending reports
            </div>
          </div>

          {/* Cases Stream */}
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw style={{ width: '32px', height: '32px', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px auto' }} />
              <div>Synchronizing HSE Review Queue...</div>
            </div>
          ) : displayedReports.length === 0 ? (
            <div className="card-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <CheckCircle2 style={{ width: '48px', height: '48px', color: '#10B981', margin: '0 auto 14px auto' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Queue Clean & Compliant</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                All precursor observations and high-risk cases have been adjudicated by HSE officers.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displayedReports.map((item) => {
                const isHigh = item.ai_priority === 'HIGH';
                const isReview = item.ai_priority === 'REVIEW';

                return (
                  <div
                    key={item.report_id}
                    className="card-panel"
                    style={{
                      padding: '24px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderLeft: isHigh ? '5px solid #DC2626' : isReview ? '5px solid #FFB020' : '5px solid #10B981',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Priority Badge + ID + Site + Rule Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`pill-status ${isHigh ? 'pill-red' : isReview ? 'pill-amber' : 'pill-green'}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isHigh ? '#DC2626' : isReview ? '#D97706' : '#059669' }} />
                          {item.ai_priority}-PSIF
                        </span>

                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.report_id}
                        </span>

                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • {item.site}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.primary_rule && (
                          <span className="card-pill-tag tag-mint">
                            {item.primary_rule}
                          </span>
                        )}

                        {item.is_veto_enforced && (
                          <span className="card-pill-tag tag-coral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Lock style={{ width: '12px', height: '12px' }} />
                            <span>Rule 2 Veto Enforced</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Narrative Excerpt */}
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-subtle)', padding: '14px 18px', borderRadius: '14px' }}>
                      "{item.raw_text}"
                    </div>

                    {/* Statutory Citation tag if present */}
                    {item.statutory_citation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--accent-amber-dark)' }}>
                        <ShieldAlert style={{ width: '14px', height: '14px' }} />
                        <span><strong>Statutory Reference:</strong> {item.statutory_citation}</span>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color-subtle)', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Calibrated Confidence: <strong>{(item.psif_probability * 100).toFixed(0)}%</strong> ({item.confidence})
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={async () => {
                            try {
                              const full = await api.getReport(item.report_id);
                              onSelectReport(full);
                            } catch {
                              onSelectReport({
                                id: item.report_id,
                                report_id: item.report_id,
                                report_timestamp: item.report_timestamp || new Date().toISOString(),
                                created_at: item.report_timestamp || new Date().toISOString(),
                                report_type: 'near_miss',
                                site: item.site,
                                location: item.location || '',
                                department: 'Operations',
                                activity: '',
                                equipment: [],
                                reporter_role: '',
                                raw_text: item.raw_text,
                                normalized_text: item.raw_text,
                                evidence_spans: [],
                                life_saving_rules: [],
                                triggered_rules: item.veto_rule_name ? [item.veto_rule_name] : [],
                                safety_reasoning: [],
                                corrective_actions: [],
                                model_version: 'v2.1',
                                psif: {
                                  priority: item.ai_priority,
                                  probability: item.psif_probability,
                                  confidence: item.confidence
                                }
                              });
                            }
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '12px' }}
                        >
                          <span>Inspect Intelligence</span>
                          <ExternalLink style={{ width: '13px', height: '13px' }} />
                        </button>

                        <button
                          onClick={() => handleOpenAdjudication(item)}
                          className="btn-primary"
                          style={{ padding: '8px 18px', fontSize: '12px' }}
                        >
                          <span>Adjudicate Case</span>
                          <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          4. METRICS & AUDIT HISTORY TAB CONTENT
          ==================================================================== */}
      {activeTab === 'METRICS_HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-panel">
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
              Statutory Audit History Log
            </h3>
            {historyItems.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No prior audit actions recorded in current session.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Reviewer Role</th>
                    <th>Decision</th>
                    <th>Final Priority</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((h, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{h.report_id}</td>
                      <td>{h.reviewer_role}</td>
                      <td>
                        <span className="card-pill-tag tag-mint">{h.decision}</span>
                      </td>
                      <td>
                        <span className={`pill-status ${h.final_priority === 'HIGH' ? 'pill-red' : 'pill-green'}`}>
                          {h.final_priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{h.reviewed_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          5. ADJUDICATION DIALOG MODAL (Soft Rounded Card Overlay)
          ==================================================================== */}
      {activeItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 30, 25, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="card-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 32px',
              borderRadius: '28px',
              boxShadow: '0 25px 60px -10px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                  HSE Officer Adjudication & Sign-Off
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Case: <strong>{activeItem.report_id}</strong> • {activeItem.site}
                </div>
              </div>

              <button
                className="circle-icon-btn"
                onClick={() => setActiveItem(null)}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {successMessage && (
              <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', color: '#047857', fontSize: '13px', fontWeight: 700 }}>
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', fontWeight: 700 }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitAdjudication} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Case Narrative */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-input)', borderRadius: '14px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                "{activeItem.raw_text}"
              </div>

              {/* Decision Type */}
              <div className="form-group">
                <label className="form-label">Adjudication Verdict *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {(['CONFIRMED', 'MODIFIED', 'REJECTED', 'ESCALATED'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDecision(d)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: decision === d ? '2px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                        backgroundColor: decision === d ? 'var(--accent-emerald-light)' : 'var(--bg-surface)',
                        color: decision === d ? 'var(--accent-emerald)' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Final SIF Priority</label>
                  <select
                    className="form-select"
                    value={finalPriority}
                    onChange={(e) => setFinalPriority(e.target.value as any)}
                  >
                    <option value="HIGH">HIGH (Potential Fatality/SIF)</option>
                    <option value="REVIEW">REVIEW (Safety Deviation)</option>
                    <option value="LOW">LOW (Benign / Routine)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Life-Saving Rule</label>
                  <select
                    className="form-select"
                    value={finalPrimaryRule}
                    onChange={(e) => setFinalPrimaryRule(e.target.value)}
                  >
                    {CANONICAL_IOGP_RULES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Corrective Action Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={createAction}
                  onChange={(e) => setCreateAction(e.target.checked)}
                  style={{ accentColor: '#0D9488', width: '16px', height: '16px' }}
                />
                <CheckSquare style={{ width: '16px', height: '16px', color: '#0D9488' }} />
                <span>Issue Mandatory Corrective Action (CAPA)</span>
              </label>

              {createAction && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', backgroundColor: 'var(--bg-input)', borderRadius: '14px' }}>
                  <input
                    type="text"
                    placeholder="Corrective Action Title..."
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    className="form-input"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Assignee Name / Role"
                      value={actionAssignee}
                      onChange={(e) => setActionAssignee(e.target.value)}
                      className="form-input"
                    />
                    <input
                      type="date"
                      value={actionDueDate}
                      onChange={(e) => setActionDueDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Reviewer Notes */}
              <div className="form-group">
                <label className="form-label">Statutory Investigation Notes</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record justification, field inspection notes, or physical barrier check results..."
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {submitting ? 'Recording Audit...' : 'Sign-Off & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
