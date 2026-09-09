import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  LayoutGrid,
  List,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { CorrectiveAction, ReportListItem } from '../types';

interface ActionStats {
  total_actions: number;
  open_count: number;
  in_progress_count: number;
  verified_closed_count: number;
  overdue_count: number;
  closure_rate: number;
}

export const CorrectiveActionsView: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [stats, setStats] = useState<ActionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('Field Operations Superintendent');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification / Status update modal
  const [activeAction, setActiveAction] = useState<CorrectiveAction | null>(null);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'VERIFIED_CLOSED'>('IN_PROGRESS');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('Er. Rajesh Baruah (Chief Safety Officer)');
  const [effectivenessRating, setEffectivenessRating] = useState<'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'RECURRENT_HAZARD'>('EFFECTIVE');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Recurrence analytics state
  const [recurrenceData, setRecurrenceData] = useState<{
    total_closed_actions: number;
    actions_with_recurrence: number;
    recurrence_rate: number;
    barrier_degradation_alarm: boolean;
    time_window_days: number;
    installation_breakdown: Record<string, number>;
    recurrence_records: Array<{
      action_id: string;
      report_id: string;
      action_title: string;
      installation: string;
      recurrence_count: number;
      recurring_report_ids: string[];
      recurrence_status: string;
    }>;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [acts, repList, rec] = await Promise.all([
        api.getActions(filterStatus || undefined),
        api.listReports({ limit: 100 }),
        api.getRecurrenceAnalytics(90).catch(() => null)
      ]);
      setActions(acts);
      setReports(repList.items);
      if (rec) setRecurrenceData(rec);

      // Compute stats
      const total = acts.length;
      const open = acts.filter((a) => a.status === 'OPEN').length;
      const prog = acts.filter((a) => a.status === 'IN_PROGRESS').length;
      const closed = acts.filter((a) => a.status === 'VERIFIED_CLOSED').length;
      const today = new Date().toISOString().split('T')[0];
      const overdue = acts.filter(
        (a) => a.status !== 'VERIFIED_CLOSED' && a.due_date && a.due_date < today
      ).length;

      setStats({
        total_actions: total,
        open_count: open,
        in_progress_count: prog,
        verified_closed_count: closed,
        overdue_count: overdue,
        closure_rate: total > 0 ? closed / total : 0
      });
    } catch (err) {
      console.error('Failed to load corrective actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleOpenCreate = () => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].report_id);
    }
    const future = new Date();
    future.setDate(future.getDate() + 14);
    setDueDate(future.toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !title.trim()) return;

    setSubmitting(true);
    try {
      const newAct = await api.createCorrectiveAction(selectedReportId, {
        title,
        assigned_to: assignedTo,
        due_date: dueDate || undefined,
        status: 'OPEN',
        notes
      });
      setActions((prev) => [newAct, ...prev]);
      setTitle('');
      setNotes('');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create action:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenStatusModal = (act: CorrectiveAction) => {
    setActiveAction(act);
    setNewStatus(act.status as any);
    setVerificationNotes('');
    setEffectivenessRating('EFFECTIVE');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction) return;

    setUpdatingStatus(true);
    try {
      if (newStatus === 'VERIFIED_CLOSED') {
        const verified = await api.verifyAction(activeAction.action_id, {
          verified_by: verifiedBy,
          verification_notes: verificationNotes || 'Formal barrier verification completed and approved.',
          effectiveness_rating: effectivenessRating
        });
        setActions((prev) =>
          prev.map((a) => (a.action_id === verified.action_id ? verified : a))
        );
      } else {
        const updated = await api.updateAction(activeAction.action_id, {
          status: newStatus,
          notes: activeAction.notes
        });
        setActions((prev) =>
          prev.map((a) => (a.action_id === updated.action_id ? updated : a))
        );
      }
      setActiveAction(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update action status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const displayedActions = actions.filter((act) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      act.action_id.toLowerCase().includes(q) ||
      act.report_id.toLowerCase().includes(q) ||
      act.title.toLowerCase().includes(q) ||
      act.assigned_to.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* ====================================================================
          MASTER HEADER (Consistent with Dribbble-inspired UI)
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
              <ShieldCheck style={{ width: '13px', height: '13px' }} />
              Remedial Lifecycle Controls
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
              Oil India Enterprise Standard
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Corrective Actions & Remedial Tracking
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '680px' }}>
            Engineering directives, barrier reinstatements, and post-closure recurrence surveillance across Oil India assets.
          </p>
        </div>

        {/* Top Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={fetchData}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '12.5px' }}
            title="Refresh Actions Log"
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '12.5px' }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            <span>Issue Corrective Action</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          KPI STATS BENTO GRID (5 Pillars)
          ==================================================================== */}
      <div className="stats-kpi-grid">
        {/* Total Actions */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>
              Total Actions
            </span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#2563EB' }}>
              <ClipboardList style={{ width: '17px', height: '17px' }} />
            </div>
          </div>
          <div className="kpi-card-value">
            {stats?.total_actions ?? 0}
          </div>
          <div className="kpi-card-desc">
            <span>Enterprise remedial controls</span>
          </div>
        </div>

        {/* Open Tasks */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#B45309' }}>
              Open Tasks
            </span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#D97706' }}>
              <Clock style={{ width: '17px', height: '17px' }} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: stats?.open_count ? '#B45309' : 'var(--text-primary)' }}>
            {stats?.open_count ?? 0}
          </div>
          <div className="kpi-card-desc">
            <span>Awaiting field execution</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#7C3AED' }}>
              In Progress
            </span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED' }}>
              <AlertCircle style={{ width: '17px', height: '17px' }} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: stats?.in_progress_count ? '#7C3AED' : 'var(--text-primary)' }}>
            {stats?.in_progress_count ?? 0}
          </div>
          <div className="kpi-card-desc">
            <span>Field works underway</span>
          </div>
        </div>

        {/* Verified Closed */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#047857' }}>
              Verified Closed
            </span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <ShieldCheck style={{ width: '17px', height: '17px' }} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: '#047857' }}>
            {stats?.verified_closed_count ?? 0}
          </div>
          <div className="kpi-card-desc">
            <span>Closure Rate: <strong>{stats ? `${(stats.closure_rate * 100).toFixed(1)}%` : '0%'}</strong></span>
          </div>
        </div>

        {/* Overdue */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label" style={{ color: '#DC2626' }}>
              Overdue Actions
            </span>
            <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' }}>
              <AlertTriangle style={{ width: '17px', height: '17px' }} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: stats?.overdue_count ? '#DC2626' : 'var(--text-primary)' }}>
            {stats?.overdue_count ?? 0}
          </div>
          <div className="kpi-card-desc">
            <span>{stats?.overdue_count ? 'Requires immediate escalation' : 'Zero overdue items'}</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          PRECURSOR RECURRENCE & BARRIER DEGRADATION INTELLIGENCE
          ==================================================================== */}
      {recurrenceData && (
        <div
          className="card-panel"
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(255, 251, 235, 0.8) 0%, var(--bg-surface) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706',
                }}
              >
                <RefreshCw style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#B45309' }}>
                    Precursor Recurrence Surveillance
                  </span>
                  {recurrenceData.barrier_degradation_alarm ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#B91C1C',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      Barrier Degradation Alarm
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#047857',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      No Systematic Recurrence
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                  Monitors whether identical precursor patterns reoccur post-action-closure within a {recurrenceData.time_window_days}-day surveillance window.
                </p>
              </div>
            </div>

            {/* Micro Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                  Closed Actions
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {recurrenceData.total_closed_actions}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                  Recurrences
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#D97706' }}>
                  {recurrenceData.actions_with_recurrence}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                  Recurrence Rate
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {(recurrenceData.recurrence_rate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CONTROL & FILTER BAR (Pills & Search)
          ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: '', label: 'All Actions', count: stats?.total_actions ?? 0 },
            { id: 'OPEN', label: 'Open', count: stats?.open_count ?? 0 },
            { id: 'IN_PROGRESS', label: 'In Progress', count: stats?.in_progress_count ?? 0 },
            { id: 'VERIFIED_CLOSED', label: 'Verified Closed', count: stats?.verified_closed_count ?? 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: filterStatus === tab.id ? '1px solid var(--accent-emerald-dark)' : '1px solid var(--border-color)',
                backgroundColor: filterStatus === tab.id ? 'var(--accent-emerald-dark)' : 'var(--bg-surface)',
                color: filterStatus === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: filterStatus === tab.id ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-input)',
                  color: filterStatus === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Search & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search actions, reports, assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color-subtle)',
                borderRadius: '9999px',
                padding: '0 30px 0 34px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
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
            <button
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <LayoutGrid style={{ width: '13px', height: '13px' }} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <List style={{ width: '13px', height: '13px' }} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MAIN ACTIONS CONTENT (Cards or Table)
          ==================================================================== */}
      {loading ? (
        <div className="card-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <RefreshCw style={{ width: '28px', height: '28px', margin: '0 auto 12px auto', color: '#0D9488' }} className="animate-spin" />
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Loading Enterprise Corrective Actions...
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Synchronizing barrier verification records and field commitments
          </p>
        </div>
      ) : displayedActions.length === 0 ? (
        <div className="card-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <CheckCircle2 style={{ width: '36px', height: '36px', margin: '0 auto 12px auto', color: '#10B981' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
            All Set! Zero Pending Actions
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            No corrective actions match the selected filter criteria.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Bento Action Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {displayedActions.map((act) => {
            const isOverdue =
              act.status !== 'VERIFIED_CLOSED' && act.due_date && act.due_date < todayStr;
            const isClosed = act.status === 'VERIFIED_CLOSED';
            const isProg = act.status === 'IN_PROGRESS';

            return (
              <div
                key={act.action_id}
                className="bento-card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Row: Action ID, Report Ref, Status Pill */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: '#0D9488',
                          backgroundColor: 'rgba(13, 148, 136, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {act.action_id}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {act.report_id}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isOverdue && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#DC2626',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          OVERDUE
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                          backgroundColor: isClosed
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isProg
                            ? 'rgba(147, 51, 234, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                          color: isClosed ? '#059669' : isProg ? '#9333EA' : '#D97706',
                          border: `1px solid ${
                            isClosed
                              ? 'rgba(16, 185, 129, 0.25)'
                              : isProg
                              ? 'rgba(147, 51, 234, 0.25)'
                              : 'rgba(245, 158, 11, 0.25)'
                          }`,
                        }}
                      >
                        {act.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Title & Scope */}
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      margin: '0 0 8px 0',
                    }}
                  >
                    {act.title}
                  </h3>

                  {act.notes && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                        backgroundColor: 'var(--bg-input)',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color-subtle)',
                      }}
                    >
                      {act.notes}
                    </p>
                  )}
                </div>

                {/* Metadata & Footer Button */}
                <div style={{ borderTop: '1px solid var(--border-color-subtle)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User style={{ width: '13px', height: '13px', color: '#0D9488' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{act.assigned_to}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar style={{ width: '13px', height: '13px', color: isOverdue ? '#DC2626' : 'var(--text-muted)' }} />
                      <span style={{ fontWeight: isOverdue ? 800 : 600, color: isOverdue ? '#DC2626' : 'var(--text-secondary)' }}>
                        {act.due_date || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenStatusModal(act)}
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', padding: '8px 14px', fontSize: '12px' }}
                  >
                    <span>Manage Lifecycle & Verification</span>
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Modern Table View */
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 18px' }}>Action ID</th>
                  <th style={{ padding: '12px 18px' }}>Report Ref</th>
                  <th style={{ padding: '12px 18px' }}>Remedial Scope</th>
                  <th style={{ padding: '12px 18px' }}>Assignee</th>
                  <th style={{ padding: '12px 18px' }}>Due Date</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {displayedActions.map((act) => {
                  const isOverdue =
                    act.status !== 'VERIFIED_CLOSED' && act.due_date && act.due_date < todayStr;
                  return (
                    <tr
                      key={act.action_id}
                      style={{ borderBottom: '1px solid var(--border-color-subtle)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-pill)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0D9488' }}>
                        {act.action_id}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {act.report_id}
                      </td>
                      <td style={{ padding: '12px 18px', maxWidth: '340px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{act.title}</div>
                        {act.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {act.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>{act.assigned_to}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: isOverdue ? 800 : 600, color: isOverdue ? '#DC2626' : 'var(--text-secondary)' }}>
                            {act.due_date || 'N/A'}
                          </span>
                          {isOverdue && (
                            <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' }}>
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            backgroundColor: act.status === 'VERIFIED_CLOSED'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : act.status === 'IN_PROGRESS'
                              ? 'rgba(147, 51, 234, 0.12)'
                              : 'rgba(245, 158, 11, 0.12)',
                            color: act.status === 'VERIFIED_CLOSED' ? '#059669' : act.status === 'IN_PROGRESS' ? '#9333EA' : '#D97706',
                          }}
                        >
                          {act.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenStatusModal(act)}
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '11px', marginLeft: 'auto' }}
                        >
                          <span>Manage</span>
                          <ChevronRight style={{ width: '12px', height: '12px' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          CREATE ACTION MODAL (Clean floating modern style)
          ==================================================================== */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 56, 47, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              borderRadius: '24px',
              boxShadow: 'var(--card-shadow-floating)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(13, 148, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488' }}>
                  <Plus style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Issue Enterprise Corrective Action
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                    Assign statutory remedial tasks and barrier restoration scope
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Originating Incident Report *</label>
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="form-select"
                  required
                >
                  {reports.map((r) => (
                    <option key={r.report_id} value={r.report_id}>
                      {r.report_id} — {r.site} ({r.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Action Title & Remedial Scope *</label>
                <input
                  type="text"
                  placeholder="e.g. Conduct ultrasonic wall thickness test & install certified blind"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Responsibility *</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remedial Engineering Directives</label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, testing standard (e.g. API 510 / OISD-118 LOTO)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12.5px' }}
                >
                  {submitting ? 'Creating...' : 'Issue Corrective Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          STATUS UPDATE & BARRIER VERIFICATION MODAL
          ==================================================================== */}
      {activeAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 56, 47, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              borderRadius: '24px',
              boxShadow: 'var(--card-shadow-floating)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <ShieldCheck style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Manage Lifecycle — {activeAction.action_id}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                    Report: {activeAction.report_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveAction(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Action Summary Pill */}
            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                padding: '12px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: '1px solid var(--border-color-subtle)',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {activeAction.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Assigned: {activeAction.assigned_to} • Due: {activeAction.due_date || 'N/A'}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Update Action Status *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'OPEN', label: 'OPEN' },
                    { key: 'IN_PROGRESS', label: 'IN PROGRESS' },
                    { key: 'VERIFIED_CLOSED', label: 'VERIFIED CLOSED' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setNewStatus(s.key as any)}
                      style={{
                        padding: '9px 4px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: newStatus === s.key ? '2px solid' : '1px solid var(--border-color)',
                        borderColor: newStatus === s.key
                          ? s.key === 'VERIFIED_CLOSED'
                            ? '#10B981'
                            : s.key === 'IN_PROGRESS'
                            ? '#9333EA'
                            : '#F59E0B'
                          : 'var(--border-color)',
                        backgroundColor: newStatus === s.key
                          ? s.key === 'VERIFIED_CLOSED'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : s.key === 'IN_PROGRESS'
                            ? 'rgba(147, 51, 234, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)'
                          : 'var(--bg-surface)',
                        color: newStatus === s.key
                          ? s.key === 'VERIFIED_CLOSED'
                            ? '#047857'
                            : s.key === 'IN_PROGRESS'
                            ? '#7E22CE'
                            : '#B45309'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Verified Closed, show Formal Verification Section */}
              {newStatus === 'VERIFIED_CLOSED' && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 800, fontSize: '12px' }}>
                    <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                    <span>HSE Verification of Barrier Reinstatement</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Verifying Safety Inspector *</label>
                    <input
                      type="text"
                      value={verifiedBy}
                      onChange={(e) => setVerifiedBy(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Barrier Effectiveness Rating *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { key: 'EFFECTIVE', label: 'EFFECTIVE' },
                        { key: 'PARTIALLY_EFFECTIVE', label: 'PARTIAL' },
                        { key: 'RECURRENT_HAZARD', label: 'RECURRENT' },
                      ].map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setEffectivenessRating(r.key as any)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: effectivenessRating === r.key ? '2px solid' : '1px solid var(--border-color)',
                            borderColor: effectivenessRating === r.key
                              ? r.key === 'RECURRENT_HAZARD'
                                ? '#EF4444'
                                : r.key === 'PARTIALLY_EFFECTIVE'
                                ? '#F59E0B'
                                : '#10B981'
                              : 'var(--border-color)',
                            backgroundColor: effectivenessRating === r.key
                              ? r.key === 'RECURRENT_HAZARD'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : r.key === 'PARTIALLY_EFFECTIVE'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)'
                              : 'var(--bg-surface)',
                            color: effectivenessRating === r.key
                              ? r.key === 'RECURRENT_HAZARD'
                                ? '#B91C1C'
                                : r.key === 'PARTIALLY_EFFECTIVE'
                                ? '#B45309'
                                : '#047857'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Field Verification Evidence *</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Field inspection confirmed blind installed, hydrotest passed, PTW closed..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      required={newStatus === 'VERIFIED_CLOSED'}
                      className="form-textarea"
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12.5px' }}
                >
                  {updatingStatus ? 'Updating...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
