import React, { useState, useEffect } from 'react';
import {
  Tag,
  Cpu,
  Layers,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  User,
  Wrench,
  CheckCircle2,
  Copy,
  ChevronRight,
  Filter,
  Eye,
  FileCode,
  Sparkles,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import {
  EntitySpanItem,
  ExtractionResponseData,
  BIOTaggingResponseData,
  NERTaxonomyResponseData,
  CausalStepItem
} from '../types';

interface PresetScenario {
  title: string;
  facility: string;
  activity: string;
  narrative: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    title: 'EPS-1 Confined Separator Entry (Sour Gas Asphyxiation)',
    facility: 'Early Production System EPS-1',
    activity: 'Vessel Cleanout',
    narrative:
      'During vessel cleanout at Early Production System EPS-1, contractor entered inside ' +
      'separator vessel to remove accumulated sludge. Gas test omitted and continuous atmospheric ' +
      'monitoring not conducted, while standby attendant absent from manway. Worker inhaled toxic ' +
      'h2s gas pocket resulting in sudden collapse and fatal asphyxiation.'
  },
  {
    title: 'Drilling Rig OIL-45 Casing Hoisting Line-of-Fire',
    facility: 'Drilling Rig OIL-45',
    activity: 'Casing Hoisting',
    narrative:
      'On Drilling Rig OIL-45, crew was running casing when an unexpected high pressure gas kick ' +
      'of 3500 psi surged through the choke manifold. Whip check unlatched on chiksan line and ' +
      'banksman absent from rig floor. Workers directly under suspended load in drop zone sustained ' +
      'multiple injuries with risk of crush fatality.'
  },
  {
    title: 'Moran OCS-4 Hot Work Flange Break (Flash Fire)',
    facility: 'Oil Collecting Station OCS-4 Moran',
    activity: 'Hot Work & Flange Unbolting',
    narrative:
      'At Oil Collecting Station OCS-4 Moran, maintenance team was conducting hot work and welding ' +
      'adjacent to crude oil storage tank. LOTO not applied, single isolation valve passing, and ' +
      'flammable crude vapor accumulated near 415v switchgear, causing a flash fire fatality.'
  },
  {
    title: 'WIS-Moran High Pressure Hydrotesting Burst',
    facility: 'Water Injection Station WIS-Moran',
    activity: 'Hydrotesting Gathering Line',
    narrative:
      'During hydrotesting of gathering line at WIS-Moran at 5000 psi, pressure test safety valve gagged ' +
      'and whip check missing on discharge hose. Operator situated directly in line of fire was struck ' +
      'by whipping line, risking traumatic amputation and loss of well containment.'
  },
  {
    title: 'Derrick Monkey Board Working at Height (Fall Potential)',
    facility: 'Drilling Rig OIL-78',
    activity: 'Tripping Pipe',
    narrative:
      'Derrickman working aloft on monkey board on Drilling Rig OIL-78 while tripping pipe. ' +
      '100% full body harness not clipped to certified anchor point and self-retracting lifeline ' +
      'unattached. Gust of wind caused sudden loss of balance presenting direct risk of fatal fall from height.'
  }
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; ring: string }> = {
  ACTIVITY: {
    bg: 'rgba(2, 132, 199, 0.09)',
    border: 'rgba(2, 132, 199, 0.3)',
    text: '#0284C7',
    badge: 'rgba(2, 132, 199, 0.16)',
    ring: '#0284C7'
  },
  HAZARD: {
    bg: 'rgba(225, 29, 72, 0.09)',
    border: 'rgba(225, 29, 72, 0.3)',
    text: '#E11D48',
    badge: 'rgba(225, 29, 72, 0.16)',
    ring: '#E11D48'
  },
  HAZARDOUS_ENERGY: {
    bg: 'rgba(124, 58, 237, 0.09)',
    border: 'rgba(124, 58, 237, 0.3)',
    text: '#7C3AED',
    badge: 'rgba(124, 58, 237, 0.16)',
    ring: '#7C3AED'
  },
  WORKER_EXPOSURE: {
    bg: 'rgba(217, 119, 6, 0.09)',
    border: 'rgba(217, 119, 6, 0.3)',
    text: '#D97706',
    badge: 'rgba(217, 119, 6, 0.16)',
    ring: '#D97706'
  },
  CRITICAL_CONTROL: {
    bg: 'rgba(5, 150, 105, 0.09)',
    border: 'rgba(5, 150, 105, 0.3)',
    text: '#059669',
    badge: 'rgba(5, 150, 105, 0.16)',
    ring: '#059669'
  },
  CONTROL_FAILURE: {
    bg: 'rgba(220, 38, 38, 0.09)',
    border: 'rgba(220, 38, 38, 0.3)',
    text: '#DC2626',
    badge: 'rgba(220, 38, 38, 0.16)',
    ring: '#DC2626'
  },
  EQUIPMENT: {
    bg: 'rgba(13, 148, 136, 0.09)',
    border: 'rgba(13, 148, 136, 0.3)',
    text: '#0D9488',
    badge: 'rgba(13, 148, 136, 0.16)',
    ring: '#0D9488'
  },
  CREDIBLE_CONSEQUENCE: {
    bg: 'rgba(147, 51, 234, 0.09)',
    border: 'rgba(147, 51, 234, 0.3)',
    text: '#9333EA',
    badge: 'rgba(147, 51, 234, 0.16)',
    ring: '#9333EA'
  }
};

export const EntityExtractionView: React.FC = () => {
  const [narrativeInput, setNarrativeInput] = useState(PRESET_SCENARIOS[0].narrative);
  const [activityInput, setActivityInput] = useState(PRESET_SCENARIOS[0].activity);
  const [siteInput, setSiteInput] = useState(PRESET_SCENARIOS[0].facility);

  const [loading, setLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResponseData | null>(null);
  const [bioResult, setBioResult] = useState<BIOTaggingResponseData | null>(null);
  const [taxonomy, setTaxonomy] = useState<NERTaxonomyResponseData | null>(null);

  const [activeTab, setActiveTab] = useState<'HIGHLIGHTER' | 'CAUSAL_FLOW' | 'BIO_TAGS'>('HIGHLIGHTER');
  const [selectedSpan, setSelectedSpan] = useState<EntitySpanItem | null>(null);
  const [copiedBio, setCopiedBio] = useState(false);

  // Filter toggles
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    ACTIVITY: true,
    HAZARD: true,
    HAZARDOUS_ENERGY: true,
    WORKER_EXPOSURE: true,
    CRITICAL_CONTROL: true,
    CONTROL_FAILURE: true,
    EQUIPMENT: true,
    CREDIBLE_CONSEQUENCE: true
  });

  useEffect(() => {
    // Load taxonomy and run default scenario
    loadTaxonomy();
    handleAnalyze(PRESET_SCENARIOS[0].narrative, PRESET_SCENARIOS[0].activity, PRESET_SCENARIOS[0].facility);
  }, []);

  const loadTaxonomy = async () => {
    try {
      const data = await api.getNERTaxonomy();
      setTaxonomy(data);
    } catch (e) {
      console.error('Failed to load NER taxonomy', e);
    }
  };

  const handleAnalyze = async (narrative = narrativeInput, activity = activityInput, site = siteInput) => {
    if (!narrative.trim()) return;
    setLoading(true);
    try {
      const [extData, bioData] = await Promise.all([
        api.extractSafetyEntities({ narrative, activity, site }),
        api.generateBIOTagging({ narrative })
      ]);
      setExtractionResult(extData);
      setBioResult(bioData);
      setSelectedSpan(null);
    } catch (e) {
      console.error('Extraction analysis failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setNarrativeInput(preset.narrative);
    setActivityInput(preset.activity);
    setSiteInput(preset.facility);
    handleAnalyze(preset.narrative, preset.activity, preset.facility);
  };

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBio(true);
    setTimeout(() => setCopiedBio(false), 2000);
  };

  // Render Highlighted Narrative
  const renderHighlightedNarrative = () => {
    if (!extractionResult) return null;
    const { narrative, all_spans } = extractionResult;

    // Filter spans based on activeFilters
    const filteredSpans = all_spans.filter(s => activeFilters[s.label]);

    if (!filteredSpans.length) {
      return <div style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.8, padding: '16px' }}>{narrative}</div>;
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    filteredSpans.forEach((span, i) => {
      // Normal text before this span
      if (span.start_char > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>
            {narrative.substring(lastIndex, span.start_char)}
          </span>
        );
      }

      // Span element
      const colors = CATEGORY_COLORS[span.label] || CATEGORY_COLORS.ACTIVITY;
      const isSelected = selectedSpan?.start_char === span.start_char && selectedSpan?.end_char === span.end_char;

      segments.push(
        <mark
          key={`span-${span.start_char}-${i}`}
          onClick={() => setSelectedSpan(span)}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            margin: '2px 3px',
            borderRadius: '8px',
            backgroundColor: colors.bg,
            border: `1.5px solid ${colors.border}`,
            color: colors.text,
            fontSize: '13.5px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            boxShadow: isSelected ? `0 0 0 2px ${colors.text}` : 'none',
            transform: isSelected ? 'scale(1.04)' : 'none',
          }}
          title={`${span.label} [${span.start_char}:${span.end_char}] (${Math.round(span.confidence * 100)}%)`}
        >
          <span>{span.text}</span>
          <span
            style={{
              fontSize: '9.5px',
              textTransform: 'uppercase',
              fontWeight: 800,
              letterSpacing: '0.04em',
              padding: '1px 6px',
              borderRadius: '9999px',
              backgroundColor: colors.badge,
              color: colors.text,
            }}
          >
            {span.label.replace('_', ' ')}
          </span>
        </mark>
      );

      lastIndex = span.end_char;
    });

    // Trailing text
    if (lastIndex < narrative.length) {
      segments.push(
        <span key={`text-${lastIndex}`}>
          {narrative.substring(lastIndex)}
        </span>
      );
    }

    return (
      <div
        style={{
          fontSize: '15px',
          lineHeight: 1.9,
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-surface)',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
        }}
      >
        {segments}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* Header & Taxonomy strip */}
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
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <Tag style={{ width: '13px', height: '13px' }} />
              Safety Information Extraction (NER)
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
              Engine: {taxonomy?.engine || 'SafetyNER_OIL_v1.0'}
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Named Entity Extraction & Gazetteers
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '740px' }}>
            Extracts 8 grounded safety dimensions with exact character-level offsets, generates token-level BIO sequences, and synthesizes explainable causal chains.
          </p>
        </div>

        {taxonomy && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              padding: '8px 18px',
              borderRadius: '9999px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Categories</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706' }}>{taxonomy.supported_categories.length}</div>
            </div>
            <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color-subtle)' }} />
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Trie Terms</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>{taxonomy.trie_entries_loaded}</div>
            </div>
            <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color-subtle)' }} />
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Regex Rules</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#7C3AED' }}>{taxonomy.regex_patterns_count}</div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Scenarios Strip */}
      <div
        className="card-panel"
        style={{
          borderRadius: '24px',
          padding: '20px 24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          <span>OIL Operational Benchmark Scenarios</span>
          <span>Click to evaluate scenario</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(p)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid var(--border-color-subtle)',
                backgroundColor: 'var(--bg-input)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.facility}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Narrative Input & Analysis Card */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">
              Operational Activity Context
            </label>
            <input
              type="text"
              value={activityInput}
              onChange={e => setActivityInput(e.target.value)}
              placeholder="e.g. Vessel Cleanout, Hydrotesting, Casing Hoisting"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Asset / Installation
            </label>
            <input
              type="text"
              value={siteInput}
              onChange={e => setSiteInput(e.target.value)}
              placeholder="e.g. Early Production System EPS-1, Rig OIL-45"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Raw HSSE Incident / Observation Narrative
          </label>
          <textarea
            rows={4}
            value={narrativeInput}
            onChange={e => setNarrativeInput(e.target.value)}
            placeholder="Type or paste unstructured safety incident report..."
            className="form-textarea font-mono"
            style={{ fontSize: '13px', lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {narrativeInput.length} characters &bull; {narrativeInput.split(/\s+/).filter(Boolean).length} words
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !narrativeInput.trim()}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '13px' }}
          >
            {loading ? <RefreshCw style={{ width: '15px', height: '15px' }} className="animate-spin" /> : <Tag style={{ width: '15px', height: '15px' }} />}
            <span>Extract Entities & Causal Flow</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      {extractionResult && (
        <div
          className="card-panel"
          style={{
            borderRadius: '20px',
            padding: '12px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
            <Filter style={{ width: '13px', height: '13px' }} />
            <span>Entity Filters:</span>
          </div>
          {Object.keys(CATEGORY_COLORS).map(cat => {
            const count = extractionResult.entity_counts[cat] || 0;
            const active = activeFilters[cat];
            const colors = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  border: active ? `1.5px solid ${colors.border}` : '1px solid var(--border-color-subtle)',
                  backgroundColor: active ? colors.bg : 'var(--bg-input)',
                  color: active ? colors.text : 'var(--text-muted)',
                  opacity: active ? 1 : 0.6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.text }} />
                <span>{cat.replace('_', ' ')}</span>
                <span style={{ fontWeight: 800, fontSize: '10px' }}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Analysis Sub-Tabs */}
      <div className="sub-tabs-bar">
        <button
          onClick={() => setActiveTab('HIGHLIGHTER')}
          className={`sub-tab-btn ${activeTab === 'HIGHLIGHTER' ? 'active' : ''}`}
        >
          <Eye style={{ width: '14px', height: '14px' }} />
          <span>Interactive Narrative Span Highlighter</span>
          {extractionResult && (
            <span
              style={{
                marginLeft: '6px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10.5px',
                fontWeight: 800,
                backgroundColor: activeTab === 'HIGHLIGHTER' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-pill)',
                color: activeTab === 'HIGHLIGHTER' ? '#FFFFFF' : 'var(--text-primary)',
              }}
            >
              {extractionResult.total_entities}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('CAUSAL_FLOW')}
          className={`sub-tab-btn ${activeTab === 'CAUSAL_FLOW' ? 'active' : ''}`}
        >
          <Layers style={{ width: '14px', height: '14px' }} />
          <span>5-Stage Causal Flow & Safety Rationale</span>
          {extractionResult && (
            <span
              style={{
                marginLeft: '6px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10.5px',
                fontWeight: 800,
                backgroundColor: activeTab === 'CAUSAL_FLOW' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-pill)',
                color: activeTab === 'CAUSAL_FLOW' ? '#FFFFFF' : '#059669',
              }}
            >
              {Math.round(extractionResult.causal_flow.completeness_score * 100)}% Complete
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('BIO_TAGS')}
          className={`sub-tab-btn ${activeTab === 'BIO_TAGS' ? 'active' : ''}`}
        >
          <FileCode style={{ width: '14px', height: '14px' }} />
          <span>Token-Level BIO & CoNLL Inspector</span>
          {bioResult && (
            <span
              style={{
                marginLeft: '6px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10.5px',
                fontWeight: 800,
                backgroundColor: activeTab === 'BIO_TAGS' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-pill)',
                color: activeTab === 'BIO_TAGS' ? '#FFFFFF' : 'var(--text-muted)',
              }}
            >
              {bioResult.total_tokens} tokens
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: HIGHLIGHTER */}
      {activeTab === 'HIGHLIGHTER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span>Click on any highlighted entity below to inspect character offsets and extraction confidence.</span>
              {selectedSpan && (
                <button
                  onClick={() => setSelectedSpan(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-emerald-dark)', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                >
                  Clear selection
                </button>
              )}
            </div>
            {renderHighlightedNarrative()}
          </div>

          {/* Span Details Popover / Card */}
          {selectedSpan && (
            <div
              className="card-panel"
              style={{
                borderRadius: '20px',
                padding: '18px 22px',
                border: '1.5px solid var(--accent-emerald-dark)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: CATEGORY_COLORS[selectedSpan.label]?.bg || 'rgba(0,0,0,0.05)',
                      color: CATEGORY_COLORS[selectedSpan.label]?.text || 'var(--text-primary)',
                      border: `1px solid ${CATEGORY_COLORS[selectedSpan.label]?.border || 'var(--border-color)'}`,
                    }}
                  >
                    {selectedSpan.label.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    "{selectedSpan.text}"
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{selectedSpan.source}</strong></span>
                  <span>Confidence: <strong style={{ color: '#059669' }}>{Math.round(selectedSpan.confidence * 100)}%</strong></span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: 'var(--bg-input)', padding: '12px 16px', borderRadius: '14px' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Character Offsets</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    [{selectedSpan.start_char} : {selectedSpan.end_char}]
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Span Length</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedSpan.end_char - selectedSpan.start_char} characters
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Category Role</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>
                    {selectedSpan.category_description || 'Domain safety entity'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Entities Catalog */}
          {extractionResult && (
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
              <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag style={{ width: '16px', height: '16px', color: 'var(--accent-emerald-dark)' }} />
                <span>Extracted Entities Catalog ({extractionResult.total_entities} entities detected)</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {Object.entries(extractionResult.entities_by_category).map(([cat, list]) => {
                  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.ACTIVITY;
                  return (
                    <div
                      key={cat}
                      style={{
                        padding: '16px',
                        borderRadius: '18px',
                        border: `1.5px solid ${colors.border}`,
                        backgroundColor: colors.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.text }}>
                          {cat.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: colors.badge,
                            color: colors.text,
                          }}
                        >
                          {list.length}
                        </span>
                      </div>

                      {list.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None detected</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {list.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedSpan(item)}
                              style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-color-subtle)',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.text}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '6px' }}>
                                [{item.start_char}:{item.end_char}]
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAUSAL FLOW & SAFETY RATIONALE */}
      {activeTab === 'CAUSAL_FLOW' && extractionResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Causal Synthesis Banner */}
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '24px',
              backgroundColor: 'var(--bg-surface)',
              border: '1.5px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: extractionResult.causal_flow.risk_level === 'HIGH_PSIF' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: extractionResult.causal_flow.risk_level === 'HIGH_PSIF' ? '#DC2626' : '#D97706',
                    border: extractionResult.causal_flow.risk_level === 'HIGH_PSIF' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {extractionResult.causal_flow.risk_level.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Causal Completeness: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(extractionResult.causal_flow.completeness_score * 100)}%</strong>
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Key Failure: <span style={{ fontWeight: 700, color: '#DC2626' }}>{extractionResult.causal_flow.key_failure_mechanism}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: 1.7,
                backgroundColor: 'var(--bg-input)',
                padding: '18px 22px',
                borderRadius: '16px',
                border: '1px solid var(--border-color-subtle)',
                fontStyle: 'italic',
              }}
            >
              "{extractionResult.causal_flow.causal_narrative}"
            </div>
          </div>

          {/* 5-Stage Visual Causal Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '16px', height: '16px', color: 'var(--accent-emerald-dark)' }} />
              <span>5-Stage Precursor Causal Sequence</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {extractionResult.causal_flow.steps.map((step: CausalStepItem, idx: number) => {
                const colors = CATEGORY_COLORS[step.category] || CATEGORY_COLORS.ACTIVITY;
                return (
                  <div
                    key={idx}
                    className="card-panel"
                    style={{
                      borderRadius: '20px',
                      padding: '18px',
                      border: step.has_evidence ? `1.5px solid ${colors.border}` : '1px solid var(--border-color-subtle)',
                      backgroundColor: step.has_evidence ? colors.bg : 'var(--bg-surface)',
                      opacity: step.has_evidence ? 1 : 0.65,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step {step.step_id}</span>
                        {step.has_evidence ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                            <CheckCircle2 style={{ width: '13px', height: '13px' }} /> Evidenced
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <Info style={{ width: '13px', height: '13px' }} /> Latent
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                        {step.summary}
                      </div>
                    </div>

                    {step.detected_entities.length > 0 && (
                      <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-color-subtle)' }}>
                        <div style={{ fontSize: '9.5px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Grounded Entities:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {step.detected_entities.map((e, eIdx) => (
                            <span
                              key={eIdx}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                backgroundColor: colors.badge,
                                color: colors.text,
                              }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Critical Controls */}
          {extractionResult.causal_flow.suggested_critical_controls.length > 0 && (
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
              <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '16px', height: '16px', color: '#059669' }} />
                <span>Targeted Critical Barrier Interventions</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {extractionResult.causal_flow.suggested_critical_controls.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    <CheckCircle2 style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BIO TAGS & CONLL */}
      {activeTab === 'BIO_TAGS' && bioResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="card-panel"
            style={{
              borderRadius: '20px',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                BIO Sequence Representation (CoNLL-2003 Standard)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Total Tokens: <strong style={{ color: 'var(--text-primary)' }}>{bioResult.total_tokens}</strong> &bull; Entity Tokens: <strong style={{ color: '#059669' }}>{bioResult.entity_tokens_count}</strong>
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(bioResult.conll_format)}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              <Copy style={{ width: '14px', height: '14px' }} />
              <span>{copiedBio ? 'Copied CoNLL!' : 'Copy CoNLL Text'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Tokens Table */}
            <div
              className="card-panel"
              style={{
                borderRadius: '24px',
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '14px 20px', backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                Token-by-Token Sequence
              </div>
              <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                {bioResult.tokens.map((t, idx) => {
                  const isEntity = t.tag !== 'O';
                  const baseCat = isEntity ? t.tag.substring(2) : '';
                  const colors = isEntity ? (CATEGORY_COLORS[baseCat] || CATEGORY_COLORS.ACTIVITY) : null;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 20px',
                        borderBottom: '1px solid var(--border-color-subtle)',
                        backgroundColor: isEntity ? 'rgba(13, 148, 136, 0.04)' : 'transparent',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px', width: '24px' }}>{idx + 1}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {t.token}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          [{t.start_char}:{t.end_char}]
                        </span>
                      </div>

                      <div>
                        {isEntity ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              fontSize: '11px',
                              backgroundColor: colors?.badge,
                              color: colors?.text,
                              border: `1px solid ${colors?.border}`,
                            }}
                          >
                            {t.tag}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--bg-input)',
                            }}
                          >
                            O
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CoNLL Text Box */}
            <div
              className="card-panel"
              style={{
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                <span>CoNLL-2003 Output</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ready for Model Training</span>
              </div>
              <textarea
                readOnly
                rows={19}
                value={bioResult.conll_format}
                className="form-textarea font-mono"
                style={{ fontSize: '11.5px', lineHeight: 1.5, resize: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
