import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Layers,
  MapPin,
  Building2,
  Wrench,
  User,
  Zap,
  CheckCircle2,
  Flame,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ReportResponse } from '../types';

interface ReportIngestionProps {
  onTriageComplete: (report: ReportResponse) => void;
}

const DEMO_PRESETS = [
  {
    label: 'Tank Confined Space Entry',
    rule: 'Confined Space (OISD-105)',
    category: 'High-PSIF Guaranteed',
    icon: '🕳️',
    accentColor: '#FFB020',
    badgeBg: '#FEF3C7',
    site: 'Duliajan Production Installation',
    location: 'Separator Station #4',
    department: 'Mechanical Maintenance',
    activity: 'Separator Vessel Inspection',
    equipment: 'Gas Separator V-102',
    reporter_role: 'Lead Operator',
    narrative:
      'During maintenance, a contractor entered the tank to inspect an internal valve. Gas testing was not recorded, the entry permit had expired, and no attendant was positioned outside.',
  },
  {
    label: 'Pressurized Gas Flange Bleed',
    rule: 'Energy Isolation (OISD-118)',
    category: 'Zero-Tolerance LOTO',
    icon: '⚡',
    accentColor: '#EF4444',
    badgeBg: '#FEE2E2',
    site: 'Moran Gathering Station',
    location: 'Manifold Skid B',
    department: 'Pipeline Operations',
    activity: 'Flange Unbolting',
    equipment: 'Main Gathering Line 12-inch',
    reporter_role: 'Maintenance Fitter',
    narrative:
      'Mechanical technician attempted to unbolt a pressurized gas line flange before closing isolation block valves. Stored energy was present without LOTO verification.',
  },
  {
    label: 'Crane Drop Zone Slewing',
    rule: 'Safe Lifting (OISD-141)',
    category: 'Line of Fire Breach',
    icon: '🏗️',
    accentColor: '#FF7058',
    badgeBg: '#FFEBE6',
    site: 'Drilling Rig OIL-45',
    location: 'Drill Floor / Catwalk',
    department: 'Drilling Services',
    activity: 'Tubular Handling',
    equipment: 'Hydraulic Rig Crane #2',
    reporter_role: 'Assistant Driller',
    narrative:
      'During rig operations, a roustabout was walking underneath the suspended load while the crane was slewing a 3-ton casing joint across the drill floor.',
  },
  {
    label: 'Warehouse Pallet Stacking',
    rule: 'Housekeeping (Good Practice)',
    category: 'Benign Control',
    icon: '🧹',
    accentColor: '#10B981',
    badgeBg: '#DCFCE7',
    site: 'Digboi Central Store',
    location: 'Warehouse Bay 3',
    department: 'Materials Management',
    activity: 'Housekeeping',
    equipment: 'Wooden Storage Pallets',
    reporter_role: 'Warehouse Helper',
    narrative:
      'Warehouse helper noticed five empty wooden shipping pallets stacked unevenly behind store room and restacked them neatly against the exterior wall.',
  },
];

export const ReportIngestion: React.FC<ReportIngestionProps> = ({ onTriageComplete }) => {
  const [site, setSite] = useState(DEMO_PRESETS[0].site);
  const [location, setLocation] = useState(DEMO_PRESETS[0].location);
  const [department, setDepartment] = useState(DEMO_PRESETS[0].department);
  const [activity, setActivity] = useState(DEMO_PRESETS[0].activity);
  const [equipment, setEquipment] = useState(DEMO_PRESETS[0].equipment);
  const [reporterRole, setReporterRole] = useState(DEMO_PRESETS[0].reporter_role);
  const [narrative, setNarrative] = useState(DEMO_PRESETS[0].narrative);
  const [reportType, setReportType] = useState('near_miss');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetSelect = (preset: typeof DEMO_PRESETS[0]) => {
    setSite(preset.site);
    setLocation(preset.location);
    setDepartment(preset.department);
    setActivity(preset.activity);
    setEquipment(preset.equipment);
    setReporterRole(preset.reporter_role);
    setNarrative(preset.narrative);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim() || narrative.length < 10) {
      setError('Please enter a detailed safety narrative (minimum 10 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.submitReport({
        site,
        location,
        department,
        activity,
        equipment: equipment ? [equipment] : [],
        reporter_role: reporterRole,
        narrative,
        report_type: reportType,
      });

      onTriageComplete(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ====================================================================
          1. CANONICAL SIF TEST SCENARIOS (Dribbble Bento Cards)
          ==================================================================== */}
      <div
        className="card-panel"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.04) 0%, rgba(255, 176, 32, 0.03) 100%)',
          borderColor: 'rgba(13, 148, 136, 0.18)',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ width: '18px', height: '18px', color: '#D97706' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                Canonical SIF Benchmark Scenarios
              </h3>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Select an industrial scenario to auto-populate and test statutory safety guardrails
            </p>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent-emerald-light)',
              color: '#0D9488',
              border: '1px solid rgba(13, 148, 136, 0.25)'
            }}
          >
            Rule 2 Zero-Miss Active
          </span>
        </div>

        {/* 4 Gorgeous Scenario Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {DEMO_PRESETS.map((p, idx) => {
            const isSelected = narrative === p.narrative;
            return (
              <div
                key={idx}
                onClick={() => handlePresetSelect(p)}
                style={{
                  padding: '16px 18px',
                  borderRadius: '18px',
                  backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-surface)',
                  border: isSelected ? `2px solid ${p.accentColor}` : '1px solid var(--border-color)',
                  boxShadow: isSelected
                    ? `0 8px 24px -4px rgba(13, 148, 136, 0.15), 0 0 0 1px ${p.accentColor}`
                    : 'var(--card-shadow)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{p.icon}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: p.badgeBg,
                        color: p.accentColor,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {p.category}
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {p.rule}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {p.site.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: p.accentColor }}>
                    {isSelected ? 'Selected ✓' : 'Load →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          2. MASTER INGESTION FORM (Soft Pillowy Inputs)
          ==================================================================== */}
      <form onSubmit={handleSubmit} className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText style={{ width: '20px', height: '20px', color: '#0D9488' }} />
              <span>Operational Precursor Ingestion</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Submit unstructured field narratives for AI causal extraction, multi-label IOGP tagging, and deterministic triage
            </p>
          </div>
          <span className="pill-status pill-green" style={{ fontSize: '11px' }}>
            HSE Decision Support Active
          </span>
        </div>

        {error && (
          <div style={{ padding: '12px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Site, Location, Report Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Operational Asset / Site *</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Platform / Area Location</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Report Category</span>
            </label>
            <select
              className="form-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="near_miss">Near Miss (Potential SIF)</option>
              <option value="unsafe_act">Unsafe Act / Behavioral Hazard</option>
              <option value="unsafe_condition">Unsafe Condition / Barrier Degradation</option>
              <option value="incident">Reportable Incident</option>
              <option value="hazard_observation">Hazard Observation Card</option>
            </select>
          </div>
        </div>

        {/* Row 2: Activity, Equipment, Reporter Role */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Operational Activity</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Tank Maintenance, Wireline, Lifting"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wrench style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Equipment Involved</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Gas Separator V-102, Crane #2"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <span>Reporter Role</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={reporterRole}
              onChange={(e) => setReporterRole(e.target.value)}
              placeholder="e.g. Lead Operator, Safety Officer"
            />
          </div>
        </div>

        {/* Unstructured Narrative Input */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label">
              HSSE Event Narrative & Precursor Description *
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {narrative.length} characters
            </span>
          </div>

          <textarea
            className="form-textarea"
            rows={5}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Describe what occurred, hazards present, worker exposure, and any control failures observed..."
            required
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Submit Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color-subtle)', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <ShieldCheck style={{ width: '16px', height: '16px', color: '#0D9488' }} />
            <span>AI recommends • Evidence explains • HSE decides</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 0.7s linear infinite' }} />
                <span>Running Causal SIF Triage...</span>
              </>
            ) : (
              <>
                <Sparkles style={{ width: '16px', height: '16px', color: '#FFB020' }} />
                <span>Execute Calibrated SIF Triage</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
