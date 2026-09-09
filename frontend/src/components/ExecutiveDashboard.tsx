import React, { useState, useEffect } from 'react';
import {
  Activity,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flame,
  Layers,
  Lock,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Edit2,
  Sliders,
  Bell,
  AlertTriangle,
  Lightbulb,
  Radio,
  FileCheck2,
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsOverview, ReportResponse } from '../types';
import { PrecursorTrendChart } from './PrecursorTrendChart';

interface ExecutiveDashboardProps {
  onNavigateToIntake?: () => void;
  onNavigateToQueue?: () => void;
  onNavigateToActions?: () => void;
  onNavigateToRules?: () => void;
  onNavigateToClusters?: () => void;
  onTriageComplete?: (report: ReportResponse) => void;
}

interface ScheduledOperation {
  id: string;
  time: string;
  title: string;
  location: string;
  category: 'critical' | 'barrier' | 'drill' | 'inspection';
  type: 'teal' | 'yellow' | 'coral' | 'purple';
  supervisor: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const SCHEDULE_OPERATIONS: Record<number, { dateLabel: string; events: ScheduledOperation[] }> = {
  6: {
    dateLabel: 'Sep, 06 Sunday',
    events: [
      {
        id: 'ev-6-1',
        time: '10:00 AM — 12:00 PM',
        title: 'Weekly Offshore Crane Wire Rope Magnetic NDT',
        location: 'Rig OIL-45 • Deck Crane #2',
        category: 'inspection',
        type: 'coral',
        supervisor: 'B. Gogoi (Lead Mechanical Inspector)',
        riskLevel: 'HIGH'
      }
    ]
  },
  8: {
    dateLabel: 'Sep, 08 Tuesday (Today)',
    events: [
      {
        id: 'ev-8-1',
        time: '08:30 AM — 10:00 AM',
        title: 'Rig-45 Tubular Lift & SimOps Safety Briefing',
        location: 'Duliajan Deep Formation #4 • Rig Floor',
        category: 'critical',
        type: 'teal',
        supervisor: 'Er. Rajesh Baruah (CSO)',
        riskLevel: 'CRITICAL'
      },
      {
        id: 'ev-8-2',
        time: '11:00 AM — 12:30 PM',
        title: 'Multi-Sensor H2S & Combustible Gas Calibration',
        location: 'Separator Station V-102 • Early Production System',
        category: 'barrier',
        type: 'yellow',
        supervisor: 'M. Sharma (Instrumentation Head)',
        riskLevel: 'HIGH'
      },
      {
        id: 'ev-8-3',
        time: '02:00 PM — 04:30 PM',
        title: 'Annular Blowout Preventer (BOP) Hydraulic Pressure Test',
        location: 'Drilling Rig OIL-45 • Cellar Bay',
        category: 'drill',
        type: 'coral',
        supervisor: 'A. Saikia (Rig Superintendent)',
        riskLevel: 'CRITICAL'
      }
    ]
  },
  10: {
    dateLabel: 'Sep, 10 Thursday',
    events: [
      {
        id: 'ev-10-1',
        time: '09:00 AM — 11:30 AM',
        title: 'Subsea Wellhead Choke Manifold Ultrasonic Testing',
        location: 'Moran Gathering Station OCS-4',
        category: 'inspection',
        type: 'teal',
        supervisor: 'P. Bora (NDT Specialist)',
        riskLevel: 'HIGH'
      },
      {
        id: 'ev-10-2',
        time: '02:30 PM — 04:00 PM',
        title: 'Life-Saving Rule 7 LOTO Verification Audit',
        location: 'Compressor House #2 • Moran',
        category: 'critical',
        type: 'yellow',
        supervisor: 'Er. Rajesh Baruah (CSO)',
        riskLevel: 'CRITICAL'
      }
    ]
  },
  12: {
    dateLabel: 'Sep, 12 Saturday',
    events: [
      {
        id: 'ev-12-1',
        time: '08:00 AM — 11:00 AM',
        title: 'Full Rig Emergency Well Blowout & Muster Drill',
        location: 'All Operating Installations • Upper Assam Basin',
        category: 'drill',
        type: 'coral',
        supervisor: 'Basin Crisis Command Team',
        riskLevel: 'CRITICAL'
      }
    ]
  },
  16: {
    dateLabel: 'Sep, 16 Wednesday',
    events: [
      {
        id: 'ev-16-1',
        time: '10:00 AM — 01:00 PM',
        title: 'Mud Circulation High-Pressure Line Re-certification (10,000 PSI)',
        location: 'Water Injection Station WIS-Moran',
        category: 'barrier',
        type: 'yellow',
        supervisor: 'K. Datta (Piping Engineer)',
        riskLevel: 'HIGH'
      }
    ]
  },
  20: {
    dateLabel: 'Sep, 20 Sunday',
    events: [
      {
        id: 'ev-20-1',
        time: '07:30 AM — 09:30 AM',
        title: 'Offshore Crew Shift Handover & SIF Prevention Forum',
        location: 'Central Conference Bay • Duliajan HQ',
        category: 'critical',
        type: 'coral',
        supervisor: 'All Installation Managers',
        riskLevel: 'HIGH'
      },
      {
        id: 'ev-20-2',
        time: '01:00 PM — 03:30 PM',
        title: 'Statutory DGMS Pre-Audit Safety Barrier Walkthrough',
        location: 'CTF-Duliajan & EPS-1',
        category: 'inspection',
        type: 'purple',
        supervisor: 'Er. Rajesh Baruah (CSO)',
        riskLevel: 'CRITICAL'
      }
    ]
  },
  21: {
    dateLabel: 'Sep, 21 Monday',
    events: [
      {
        id: 'ev-21-1',
        time: '09:00 AM — 12:00 PM',
        title: 'ESD Emergency Shutdown Valve Loop Verification',
        location: 'Central Tank Farm Control Room',
        category: 'barrier',
        type: 'yellow',
        supervisor: 'Safety Instrumented Systems Team',
        riskLevel: 'HIGH'
      }
    ]
  },
  22: {
    dateLabel: 'Sep, 22 Tuesday',
    events: [
      {
        id: 'ev-22-1',
        time: '11:00 AM — 01:30 PM',
        title: 'Rig Derrick Mast Bolt Torquing & Fall Arrest Anchor Test',
        location: 'Rig OIL-78 • Derrick Floor at 24m',
        category: 'inspection',
        type: 'purple',
        supervisor: 'D. Kalita (Rig Maintenance Lead)',
        riskLevel: 'CRITICAL'
      }
    ]
  },
  25: {
    dateLabel: 'Sep, 25 Friday',
    events: [
      {
        id: 'ev-25-1',
        time: '10:30 AM — 01:00 PM',
        title: 'Crude Storage Tank T-401 Confined Space Scavenging Audit',
        location: 'Tank Farm Duliajan',
        category: 'critical',
        type: 'yellow',
        supervisor: 'Environmental & Industrial Hygiene Cell',
        riskLevel: 'CRITICAL'
      }
    ]
  }
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigateToIntake,
  onNavigateToQueue,
  onNavigateToActions,
  onNavigateToRules,
  onNavigateToClusters,
}) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'surveillance' | 'rules' | 'clusters' | 'barriers'>('surveillance');

  // Interactive toggle states for active incident cards
  const [card1Active, setCard1Active] = useState(true);
  const [card2Active, setCard2Active] = useState(true);

  // Calendar date state
  const [selectedDay, setSelectedDay] = useState(8);
  const [currentDate, setCurrentDate] = useState('Sep, 08 Tuesday');
  const [liveTime, setLiveTime] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const ovData = await api.getOverview().catch(() => null);
      setOverview(ovData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    if (SCHEDULE_OPERATIONS[day]) {
      setCurrentDate(SCHEDULE_OPERATIONS[day].dateLabel);
    } else {
      const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      // Day 1 was Tuesday (index 2)
      const dayIndex = (day + 1) % 7;
      setCurrentDate(`Sep, ${day < 10 ? '0' + day : day} ${weekdayNames[dayIndex]}`);
    }
  };

  const currentSchedule = SCHEDULE_OPERATIONS[selectedDay]?.events || [];

  return (
    <div className="dashboard-split-layout">
      {/* ====================================================================
          LEFT MAIN STREAM (Bento Grid + Active Precursor Watch + Charts)
          ==================================================================== */}
      <div className="dashboard-left-stream">
        {/* Header Title & Status Controls */}
        <div className="dashboard-heading-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="dashboard-main-title">Operational Command Center</h1>
              <span className="pill-status pill-green" style={{ fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', animation: 'pulse 2s infinite' }} />
                LIVE SIF SENTINEL
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time precursor surveillance, statutory barrier defense & multi-asset telemetry • Upper Assam Basin
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dropdown-manage-pill" style={{ cursor: 'default' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0D9488' }} />
              <span>Upper Assam Basin (All 28 Assets Active)</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Bar: Connected to Dedicated Pages as Requested */}
        <div className="sub-tabs-bar">
          <button
            className={`sub-tab-btn ${activeSubTab === 'surveillance' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('surveillance')}
          >
            Surveillance
          </button>
          <button
            className="sub-tab-btn"
            onClick={() => onNavigateToRules?.()}
            title="Navigate to Statutory Life-Saving Rules Page"
          >
            Life-Saving Rules
          </button>
          <button
            className="sub-tab-btn"
            onClick={() => onNavigateToClusters?.()}
            title="Navigate to Precursor Clusters Page"
          >
            Precursor Clusters
          </button>
          <button
            className="sub-tab-btn"
            onClick={() => onNavigateToActions?.()}
            title="Navigate to Critical Barriers & CAPA Page"
          >
            Critical Barriers
          </button>
        </div>

        {/* ====================================================================
            BALANCED 4-METRIC BENTO ROW (Proportionate, spacious, uncluttered)
            ==================================================================== */}
        <div className="bento-showcase-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
          {/* Card 1: Today's Telemetry with clean SVG Sparkline */}
          <div className="bento-card-metric" style={{ minHeight: '185px', padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.12)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity style={{ width: '14px', height: '14px' }} />
                  </div>
                  <span className="metric-label-sub" style={{ fontSize: '12px', fontWeight: 700 }}>Today's Telemetry</span>
                </div>
                <span className="pill-status pill-green" style={{ fontSize: '9.5px', padding: '2px 7px' }}>LIVE</span>
              </div>
              <div className="metric-val-large" style={{ fontSize: '30px', margin: '4px 0 0 0', lineHeight: 1.1 }}>
                {overview?.total_reports ? (overview.total_reports * 9 + 1300).toLocaleString() : '1,849'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Multi-Asset Basin Signals
              </div>
            </div>

            {/* Smooth SVG Sparkline */}
            <div className="sparkline-container" style={{ height: '42px', margin: '4px 0 0 0' }}>
              <svg viewBox="0 0 160 40" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="sparkGradientTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 5,30 Q 30,34 50,22 T 90,16 T 130,10 T 155,6 L 155,40 L 5,40 Z"
                  fill="url(#sparkGradientTeal)"
                />
                <path
                  d="M 5,30 Q 30,34 50,22 T 90,16 T 130,10 T 155,6"
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="155" cy="6" r="3.5" fill="#0D9488" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)' }}>
              <span><strong style={{ color: '#059669' }}>+12.4%</strong> vs prior week</span>
              <span>28 Assets</span>
            </div>
          </div>

          {/* Card 2: Barrier Defense Index */}
          <div className="bento-card-barrier" style={{ minHeight: '185px', padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px' }} />
                  </div>
                  <span className="metric-label-sub" style={{ fontSize: '12px', fontWeight: 700 }}>Barrier Defense Index</span>
                </div>
                <span className="pill-status pill-green" style={{ fontSize: '9.5px', padding: '2px 7px' }}>INTACT</span>
              </div>
              <div className="barrier-metric-val" style={{ fontSize: '30px', margin: '4px 0 0 0', lineHeight: 1.1 }}>
                98.6%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Active Hardware & LOTO Isolation
              </div>
            </div>

            <div style={{ margin: '6px 0 2px 0' }}>
              <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ width: '98.6%', height: '100%', borderRadius: '9999px', backgroundColor: 'var(--accent-emerald)' }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Hardware Isolation</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>0 Breaches</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)' }}>
              <span>OISD-105 Compliant</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>14 Manifolds OK</span>
            </div>
          </div>

          {/* Card 3: Precursor Stream Volume */}
          <div className="bento-card-stacked" style={{ minHeight: '185px', padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers style={{ width: '14px', height: '14px' }} />
                  </div>
                  <span className="metric-label-sub" style={{ fontSize: '12px', fontWeight: 700 }}>Precursor Stream</span>
                </div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>▲ +12%</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0', lineHeight: 1.1 }}>
                284 Events
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Flagged by Multi-Model Triage
              </div>
            </div>

            <div style={{ margin: '4px 0 2px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-input)', padding: '7px 10px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>SIF SHIELD ACTIVE</div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0D9488', fontFamily: 'var(--font-mono)' }}>100% Recall</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)' }}>
              <span>28 Operating Sites</span>
              <span style={{ color: '#0D9488', fontWeight: 700 }}>0 Missed High-PSIF</span>
            </div>
          </div>

          {/* Card 4: Shift Safety Briefing */}
          <div className="bento-card-forest" style={{ minHeight: '185px', padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="forest-card-title" style={{ fontSize: '14.5px', fontWeight: 800 }}>Shift Safety Briefing</span>
                <span style={{ fontSize: '9.5px', padding: '2px 7px', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 700 }}>
                  RIG FLOOR
                </span>
              </div>
              <div className="forest-card-timer" style={{ fontSize: '11.5px', opacity: 0.9, marginTop: '2px' }}>
                11 Min Remaining • Shift-A
              </div>
            </div>

            <div style={{ margin: '6px 0', padding: '6px 10px', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.8)' }}>Supervisor on Duty</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFB020' }}>Er. R. Baruah</span>
            </div>

            <div className="forest-card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div className="avatar-stack-mini">
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#164e43', color: '#fff', fontSize: '9.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #07382F' }}>
                  RB
                </div>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#0f766e', color: '#fff', fontSize: '9.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #07382F', marginLeft: '-8px' }}>
                  AM
                </div>
                <div className="avatar-stack-plus" style={{ width: '26px', height: '26px', fontSize: '9.5px' }}>+8</div>
              </div>

              <button
                className="circle-gold-arrow"
                onClick={onNavigateToQueue}
                title="Open Review Briefing in HSE Queue"
                style={{ width: '30px', height: '30px' }}
              >
                <ArrowUpRight style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            DYNAMIC ACTIVE STREAM / PRECURSOR WATCH (Linked to Sub-Tabs)
            ==================================================================== */}
        <div className="active-incidents-section">
          {/* Subtab 1: SURVEILLANCE */}
          {activeSubTab === 'surveillance' && (
            <>
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">Active Precursor Watch</h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Live streaming events flagged by multi-model SIF classifier • Upper Assam Basin
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="section-link-btn"
                    onClick={onNavigateToQueue}
                  >
                    <span>Inspect HSE Queue</span>
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              </div>

              <div className="active-cards-grid">
                {/* Surveillance Card 1 */}
                <div className="active-incident-card">
                  <div className="card-top-meta">
                    <div>
                      <div className="card-incident-title">
                        Separator V-102 Confined Space Entry
                      </div>
                      <div className="card-incident-time">
                        12:30 — 15:45 • Duliajan GGS • Vessel Inspection
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`switch-toggle-pill ${card1Active ? 'active' : ''}`}
                      onClick={() => setCard1Active(!card1Active)}
                      title="Toggle surveillance priority"
                    />
                  </div>

                  <div className="card-badges-row">
                    <span className="card-pill-tag tag-amber">Confined Space</span>
                    <span className="card-pill-tag tag-mint">Permit to Work</span>
                    <span className="card-pill-tag tag-coral">H2S Sniff Req.</span>
                  </div>

                  <div className="card-bottom-row">
                    <div className="avatar-stack-mini">
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0D9488', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)' }}>
                        OP
                      </div>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#07382F', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)', marginLeft: '-8px' }}>
                        HS
                      </div>
                      <div className="avatar-stack-plus" style={{ border: '2px solid var(--bg-surface)' }}>+9</div>
                    </div>

                    <div className="action-buttons-pair">
                      <button
                        className="circle-action-btn"
                        onClick={onNavigateToIntake}
                        title="Edit Case"
                      >
                        <Edit2 style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button
                        className="circle-action-btn-primary"
                        onClick={onNavigateToQueue}
                        title="Adjudicate in HSE Queue"
                      >
                        <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Surveillance Card 2 */}
                <div className="active-incident-card">
                  <div className="card-top-meta">
                    <div>
                      <div className="card-incident-title">
                        Wellhead NHK-204 Flowline Flange Bleed
                      </div>
                      <div className="card-incident-time">
                        16:30 — 20:00 • Naharkatiya GGS • HP Flowline
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`switch-toggle-pill ${card2Active ? 'active' : ''}`}
                      onClick={() => setCard2Active(!card2Active)}
                      title="Toggle surveillance priority"
                    />
                  </div>

                  <div className="card-badges-row">
                    <span className="card-pill-tag tag-coral">Energy Isolation</span>
                    <span className="card-pill-tag tag-mint">LOTO Verification</span>
                    <span className="card-pill-tag tag-amber">Passing Bleed</span>
                  </div>

                  <div className="card-bottom-row">
                    <div className="avatar-stack-mini">
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FF7058', color: '#fff', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)' }}>
                        MF
                      </div>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFB020', color: '#102420', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)', marginLeft: '-8px' }}>
                        FS
                      </div>
                      <div className="avatar-stack-plus" style={{ border: '2px solid var(--bg-surface)' }}>+2</div>
                    </div>

                    <div className="action-buttons-pair">
                      <button
                        className="circle-action-btn"
                        onClick={onNavigateToIntake}
                        title="Edit Case"
                      >
                        <Edit2 style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button
                        className="circle-action-btn-primary"
                        onClick={onNavigateToQueue}
                        title="Adjudicate in HSE Queue"
                      >
                        <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Subtab 2: LIFE-SAVING RULES */}
          {activeSubTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="subtab-directional-banner">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert style={{ width: '18px', height: '18px', color: '#0D9488' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                      IOGP Life-Saving Rules Surveillance • 9 Codified Safety Barriers
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Deterministic rule triggers evaluated on every incident report. 2 precursor rules currently flagged in active operations.
                  </div>
                </div>

                {onNavigateToRules && (
                  <button className="subtab-directional-btn" onClick={onNavigateToRules}>
                    <span>Open Statutory Rules Studio</span>
                    <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                  </button>
                )}
              </div>

              {/* 9 Life-Saving Rules Quick Status Grid */}
              <div className="rules-quick-grid">
                {[
                  { id: 'R1', name: 'Bypassing Safety Controls', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R2', name: 'Confined Space Entry', status: 'FLAGGED PRECURSOR', ok: false, note: 'Separator V-102' },
                  { id: 'R3', name: 'Energy Isolation (LOTO)', status: 'FLAGGED PRECURSOR', ok: false, note: 'Wellhead NHK-204' },
                  { id: 'R4', name: 'Hot Work Authorization', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R5', name: 'Line of Fire Exclusion', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R6', name: 'Safe Mechanical Lifting', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R7', name: 'Driving & Transport', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R8', name: 'Working at Height', status: 'VERIFIED INTACT', ok: true },
                  { id: 'R9', name: 'System Override Auth', status: 'VERIFIED INTACT', ok: true },
                ].map((rule) => (
                  <div
                    key={rule.id}
                    className="card-panel"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      borderLeft: `3.5px solid ${rule.ok ? '#059669' : '#EF4444'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>
                        RULE {rule.id}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          backgroundColor: rule.ok ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: rule.ok ? '#059669' : '#DC2626'
                        }}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {rule.name}
                    </div>
                    {rule.note && (
                      <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                        Active: {rule.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: PRECURSOR CLUSTERS */}
          {activeSubTab === 'clusters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="subtab-directional-banner">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers style={{ width: '18px', height: '18px', color: '#0D9488' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                      DBSCAN Spatial Precursor Clusters • Correlated Hotspot Intelligence
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Spatial clustering isolates co-occurring micro-incidents across Upper Assam installations before SIF escalation.
                  </div>
                </div>

                {onNavigateToClusters && (
                  <button className="subtab-directional-btn" onClick={onNavigateToClusters}>
                    <span>Inspect DBSCAN Studio</span>
                    <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                  </button>
                )}
              </div>

              {/* Cluster Spotlight Cards */}
              <div className="clusters-quick-grid">
                {[
                  {
                    title: 'Wellhead Choke Erosion Pattern',
                    location: 'Moran Gathering Station (OCS-4)',
                    events: 14,
                    density: 'High Density',
                    risk: 'HIGH',
                    color: '#EF4444'
                  },
                  {
                    title: 'Swabbing Tool Catwalk Drop Zone',
                    location: 'Rig OIL-45 • Drill Floor & Catwalk',
                    events: 9,
                    density: 'High Density',
                    risk: 'HIGH',
                    color: '#EF4444'
                  },
                  {
                    title: 'Compressor Skid B Pressure Surge',
                    location: 'CTF Duliajan • Compressor Unit #2',
                    events: 6,
                    density: 'Medium Density',
                    risk: 'MEDIUM',
                    color: '#F59E0B'
                  }
                ].map((c, idx) => (
                  <div
                    key={idx}
                    className="card-panel"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderLeft: `4px solid ${c.color}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>
                        CLUSTER #0{idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          backgroundColor: c.risk === 'HIGH' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: c.risk === 'HIGH' ? '#DC2626' : '#D97706'
                        }}
                      >
                        {c.events} Linked Events
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.title}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      📍 {c.location}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color-subtle)' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{c.density}</span>
                      <button
                        onClick={onNavigateToClusters}
                        style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>Drill Down</span>
                        <ChevronRight style={{ width: '13px', height: '13px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: CRITICAL BARRIERS */}
          {activeSubTab === 'barriers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="subtab-directional-banner">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck style={{ width: '18px', height: '18px', color: '#0D9488' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                      Bow-tie Critical Barrier Defense Telemetry • Defense in Depth
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Continuous verification of hardware, process, and procedural barriers across 28 Upper Assam installations.
                  </div>
                </div>

                {onNavigateToActions && (
                  <button className="subtab-directional-btn" onClick={onNavigateToActions}>
                    <span>Verify Barrier Mitigations (CAPA)</span>
                    <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                  </button>
                )}
              </div>

              {/* 4 Critical Barrier Degradation Panels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {[
                  { name: 'Hardware Energy Isolation (LOTO)', value: 96, status: 'Intact', color: '#059669', desc: '0 bypasses • Isolation valves certified' },
                  { name: 'Work Authorization & Gas Testing', value: 92, status: 'Verified', color: '#0284C7', desc: 'Continuous multi-gas sensors online' },
                  { name: 'Line of Fire Spatial Exclusions', value: 87, status: 'Monitoring', color: '#F59E0B', desc: 'Derrick floor drop zone active' },
                  { name: 'Emergency Shutdown Loops (ESD)', value: 99.4, status: 'Active', color: '#059669', desc: 'SIL-2 verified • Automated trip loops OK' }
                ].map((b, idx) => (
                  <div key={idx} className="card-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: b.color }}>{b.value}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                      <div style={{ width: `${b.value}%`, height: '100%', borderRadius: '9999px', backgroundColor: b.color }} />
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Precursor Trend Chart & Critical Barrier Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div className="card-panel">
            <PrecursorTrendChart />
          </div>

          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald-light)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Barrier Health Index</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active defense telemetry</div>
                </div>
              </div>
              <span className="pill-status pill-green" style={{ fontSize: '10px' }}>
                Intact
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Physical Energy Isolation (LOTO)</span>
                  <span style={{ color: '#059669', fontFamily: 'var(--font-mono)' }}>96%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                  <div style={{ width: '96%', height: '100%', borderRadius: '9999px', backgroundColor: '#0D9488' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Work Authorization & Gas Testing (PTW)</span>
                  <span style={{ color: '#0284C7', fontFamily: 'var(--font-mono)' }}>92%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                  <div style={{ width: '92%', height: '100%', borderRadius: '9999px', backgroundColor: '#0284C7' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Line of Fire & Exclusion Zones</span>
                  <span style={{ color: '#D97706', fontFamily: 'var(--font-mono)' }}>87%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                  <div style={{ width: '87%', height: '100%', borderRadius: '9999px', backgroundColor: '#FFB020' }} />
                </div>
              </div>
            </div>

            {onNavigateToActions && (
              <button
                onClick={onNavigateToActions}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
              >
                <CheckSquare style={{ width: '14px', height: '14px' }} />
                <span>Verify All Corrective Actions</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          RIGHT SIDE RAIL: ARTISTIC TIMEZONE DISPLAY & FROSTED CALENDAR
          ==================================================================== */}
      <aside className="dashboard-right-rail" style={{ gap: '18px' }}>
        {/* Artistic Operational Shift & Timezone Display */}
        <div className="timezone-shift-card">
          <div className="timezone-shift-bg-decor" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Radio style={{ width: '15px', height: '15px', color: '#0D9488', animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', color: '#0D9488', textTransform: 'uppercase' }}>
                Operational Shift-A
              </span>
            </div>
            <span className="pill-status pill-green" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
              LIVE SYNC
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 6px 0' }}>
            <div className="timezone-clock-digits">
              <span>{liveTime || '08:30:00'}</span>
              <span className="timezone-clock-ampm">IST</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              UTC +05:30
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Duliajan Command</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>
              DGMS Invariants Active
            </span>
          </div>
        </div>

        {/* Frosted Calendar Container */}
        <div className="calendar-frosted-container">
          {/* Month Calendar Header */}
          <div className="rail-date-header">
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Shift Calendar
              </div>
              <div className="rail-date-title" style={{ fontSize: '17px', marginTop: '2px' }}>{currentDate}</div>
            </div>
            <div className="rail-nav-chevrons">
              <button
                className="chevron-mini-btn"
                onClick={() => {
                  const prevDay = selectedDay > 1 ? selectedDay - 1 : 28;
                  handleSelectDay(prevDay);
                }}
                title="Previous Day"
              >
                <ChevronLeft style={{ width: '15px', height: '15px' }} />
              </button>
              <button
                className="chevron-mini-btn"
                onClick={() => {
                  const nextDay = selectedDay < 28 ? selectedDay + 1 : 1;
                  handleSelectDay(nextDay);
                }}
                title="Next Day"
              >
                <ChevronRight style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
          </div>

          {/* Compact Calendar Grid with Dynamic Click Selection */}
          <div className="calendar-matrix" style={{ gap: '6px' }}>
            <div className="calendar-weekdays-row" style={{ fontSize: '10.5px' }}>
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            <div className="calendar-days-row" style={{ rowGap: '6px', fontSize: '11px' }}>
              {/* Week 1: Trailing Day from August */}
              <div className="calendar-day-cell day-dimmed">
                <span className="day-num">31</span>
              </div>

              {/* Days 1 to 28 */}
              {Array.from({ length: 28 }, (_, i) => {
                const day = i + 1;
                const hasEvents = !!SCHEDULE_OPERATIONS[day];
                const isSelected = selectedDay === day;
                
                // Signature colored circle badges matching user's original aesthetic:
                // Day 8: Teal
                // Day 10: Teal
                // Day 12: Dark Emerald
                // Day 20: Coral
                // Day 21: Yellow
                const badgeClass =
                  day === 8
                    ? 'circle-badge-teal'
                    : day === 10
                    ? 'circle-badge-teal'
                    : day === 12
                    ? 'circle-badge-dark'
                    : day === 20
                    ? 'circle-badge-coral'
                    : day === 21
                    ? 'circle-badge-yellow'
                    : null;

                return (
                  <button
                    key={day}
                    type="button"
                    className={`calendar-day-cell ${isSelected && !badgeClass ? 'is-selected' : ''}`}
                    onClick={() => handleSelectDay(day)}
                    title={
                      hasEvents
                        ? `Sep ${day}: ${SCHEDULE_OPERATIONS[day].events.length} operation(s) scheduled`
                        : `Sep ${day}: Routine baseline surveillance`
                    }
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      position: 'relative',
                    }}
                  >
                    {badgeClass ? (
                      <span
                        className={badgeClass}
                        style={
                          isSelected
                            ? {
                                boxShadow: '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--accent-emerald)',
                                transform: 'scale(1.08)',
                              }
                            : undefined
                        }
                      >
                        {day}
                      </span>
                    ) : isSelected ? (
                      <span
                        className="circle-badge-teal"
                        style={{
                          boxShadow: '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--accent-emerald)',
                          transform: 'scale(1.08)',
                        }}
                      >
                        {day}
                      </span>
                    ) : (
                      <span className="day-num">{day}</span>
                    )}
                    {hasEvents && !badgeClass && !isSelected && (
                      <span
                        className="day-dot-indicator"
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          backgroundColor: '#FFB020',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Schedule Timeline Linked to Clicked Date */}
          <div className="schedule-timeline-container" style={{ paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Operations Agenda ({currentSchedule.length} Scheduled)
              </span>
              <span style={{ fontSize: '10.5px', color: '#0D9488', fontWeight: 700 }}>
                Sep {selectedDay < 10 ? '0' + selectedDay : selectedDay}
              </span>
            </div>

            {currentSchedule.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentSchedule.map((ev) => (
                  <div
                    key={ev.id}
                    className={`schedule-card-interactive ${
                      ev.riskLevel === 'CRITICAL' ? 'risk-critical' : ev.riskLevel === 'HIGH' ? 'risk-high' : 'risk-medium'
                    }`}
                    onClick={onNavigateToQueue}
                    title="Click to view details in HSE Queue"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                        {ev.time}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          backgroundColor:
                            ev.riskLevel === 'CRITICAL'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : ev.riskLevel === 'HIGH'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(5, 150, 105, 0.12)',
                          color:
                            ev.riskLevel === 'CRITICAL'
                              ? '#DC2626'
                              : ev.riskLevel === 'HIGH'
                              ? '#D97706'
                              : '#059669'
                        }}
                      >
                        {ev.riskLevel}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {ev.title}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      📍 {ev.location}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-color-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Lead: </span>
                        <span style={{ fontWeight: 600 }}>{ev.supervisor}</span>
                      </div>
                      <ArrowUpRight style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="schedule-empty-banner">
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Routine Baseline Operations
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45, maxWidth: '240px' }}>
                    No high-criticality barrier interventions scheduled for Sep {selectedDay}. Continuous automated surveillance active across all 28 installations.
                  </div>
                </div>
                <button
                  onClick={onNavigateToIntake}
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '6px 14px', marginTop: '6px' }}
                >
                  <Plus style={{ width: '12px', height: '12px' }} />
                  <span>Log Safety Walk</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
