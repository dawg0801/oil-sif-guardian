import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { api } from '../services/api';

interface Citation {
  standard: string;
  section: string;
  title: string;
  citation_text: string;
  relevance_score: number;
}

interface InvestigationBrief {
  executive_summary: string;
  risk_profile: string;
  barrier_breakdown: Array<{
    observed_failure: string;
    applicable_rule: string;
    statutory_mandate: string;
  }>;
  remedial_recommendations: string[];
  citations: Citation[];
  grounding_status: string;
  prompt_injection_detected: boolean;
}

export const RAGSafetyAssistantView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'qa' | 'synthesizer' | 'standards'>('qa');
  const [qaQuery, setQaQuery] = useState('What are the mandatory gas test limits before entering a crude oil separator vessel?');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<{
    query: string;
    answer: string;
    citations: Citation[];
    grounded_standards: string[];
    prompt_injection_detected: boolean;
  } | null>(null);

  // Synthesizer state
  const [synthNarrative, setSynthNarrative] = useState(
    'During maintenance, a contractor entered the tank to inspect an internal valve. Gas testing was not recorded, the entry permit had expired, and no attendant was positioned outside.'
  );
  const [synthLoading, setSynthLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<InvestigationBrief | null>(null);

  // Standards catalog
  const [standards, setStandards] = useState<Array<{
    standard: string;
    title: string;
    section: string;
    category: string;
    citations: string;
  }>>([]);
  const [standardsSearch, setStandardsSearch] = useState('');

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      const list = await api.getApprovedStandards();
      setStandards(list);
    } catch (e) {
      console.error('Failed to load standards:', e);
    }
  };

  const handleAskQA = async (queryText?: string) => {
    const q = queryText || qaQuery;
    if (!q.trim()) return;
    setQaLoading(true);
    try {
      const res = await api.askSafetyQA(q);
      setQaResult(res);
    } catch (e) {
      console.error('Failed to query safety standards:', e);
    } finally {
      setQaLoading(false);
    }
  };

  const handleSynthesizeBrief = async () => {
    if (!synthNarrative.trim()) return;
    setSynthLoading(true);
    try {
      const res = await api.synthesizeInvestigation({
        narrative: synthNarrative,
        installation: 'Duliajan Gas Processing Station',
        psif_priority: 'HIGH',
        primary_rules: ['Confined Space', 'Work Authorization'],
        failed_controls: ['Gas testing not recorded', 'Entry permit expired', 'No stand-by attendant']
      });
      setBriefResult(res);
    } catch (e) {
      console.error('Failed to synthesize investigation:', e);
    } finally {
      setSynthLoading(false);
    }
  };

  const filteredStandards = standards.filter(
    (s) =>
      s.standard.toLowerCase().includes(standardsSearch.toLowerCase()) ||
      s.title.toLowerCase().includes(standardsSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(standardsSearch.toLowerCase())
  );

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
              <Sparkles style={{ width: '13px', height: '13px', color: '#D97706' }} />
              Authoritative Grounded Intelligence
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#047857',
              }}
            >
              <ShieldCheck style={{ width: '12px', height: '12px' }} />
              Prompt Injection Shield Active
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Authoritative Safety RAG Assistant
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '720px' }}>
            Retrieval-Augmented Generation (RAG) querying approved Oil India Limited SOPs, OISD standards,
            and IOGP Life-Saving Rules. Grounded citations with zero autonomous safety decisions.
          </p>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid var(--border-color-subtle)',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setActiveSubTab('qa')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeSubTab === 'qa' ? 'var(--accent-emerald-dark)' : 'transparent',
              color: activeSubTab === 'qa' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Standards Q&A
          </button>
          <button
            onClick={() => setActiveSubTab('synthesizer')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeSubTab === 'synthesizer' ? 'var(--accent-emerald-dark)' : 'transparent',
              color: activeSubTab === 'synthesizer' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Investigation Synthesizer
          </button>
          <button
            onClick={() => setActiveSubTab('standards')}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeSubTab === 'standards' ? 'var(--accent-emerald-dark)' : 'transparent',
              color: activeSubTab === 'standards' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Standards Library ({standards.length})
          </button>
        </div>
      </div>

      {/* ====================================================================
          SUB-TAB 1: STANDARDS Q&A
          ==================================================================== */}
      {activeSubTab === 'qa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Query Input Box */}
          <div className="card-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search style={{ width: '16px', height: '16px', color: '#0D9488' }} />
              <span>Query Approved Safety Standards & SOPs</span>
            </h2>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={qaQuery}
                onChange={(e) => setQaQuery(e.target.value)}
                placeholder="Ask any question regarding OISD-105, Confined Space, LOTO, Hot Work, or Lifting..."
                className="form-input"
                style={{ flex: 1, height: '44px', fontSize: '13px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleAskQA()}
              />
              <button
                onClick={() => handleAskQA()}
                disabled={qaLoading}
                className="btn-primary"
                style={{ height: '44px', padding: '0 20px', flexShrink: 0 }}
              >
                {qaLoading ? (
                  <>
                    <Clock style={{ width: '15px', height: '15px' }} className="animate-spin" />
                    <span>Retrieving...</span>
                  </>
                ) : (
                  <>
                    <span>Ask Assistant</span>
                    <ArrowRight style={{ width: '15px', height: '15px' }} />
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompts Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Prompts:</span>
              {[
                'Confined space atmospheric testing limits',
                'OISD-105 permit revalidation shift duration',
                'Hot work 15-meter sewer and drain sealing',
                'Positive mechanical isolation and blinding OISD-112',
                'LOTO red padlock and group lock box protocol'
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQaQuery(pill);
                    handleAskQA(pill);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-color-subtle)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.1)';
                    e.currentTarget.style.color = '#0D9488';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Q&A Result */}
          {qaResult && (
            <div
              className="card-panel"
              style={{
                padding: '24px',
                borderLeft: '4px solid #0D9488',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                    Authoritative Citations Grounded
                  </span>
                  {qaResult.prompt_injection_detected && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#DC2626',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ShieldAlert style={{ width: '13px', height: '13px' }} />
                      Adversarial Prompt Filtered
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Standards Cited: <strong>{qaResult.grounded_standards.join(', ')}</strong>
                </span>
              </div>

              {/* Answer Content */}
              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '18px 20px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color-subtle)',
                  fontSize: '13.5px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {qaResult.answer}
              </div>

              {/* Citations Grid */}
              <div>
                <h3 style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Verifiable Statutory Citations ({qaResult.citations.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {qaResult.citations.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0D9488' }}>{c.standard}</span>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                          {c.section}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {c.title}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                        {c.citation_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 2: INVESTIGATION SYNTHESIZER
          ==================================================================== */}
      {activeSubTab === 'synthesizer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(13, 148, 136, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488' }}>
                <FileText style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Executive Investigation Brief Synthesizer
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Transforms newly ingested incident narratives into an executive investigation dossier
                  mapping observed barrier failures to statutory OISD/OIL mandates.
                </p>
              </div>
            </div>

            <textarea
              value={synthNarrative}
              onChange={(e) => setSynthNarrative(e.target.value)}
              rows={3}
              className="form-textarea"
              style={{ fontSize: '12.5px', lineHeight: 1.5 }}
              placeholder="Paste incident narrative..."
            />

            <button
              onClick={handleSynthesizeBrief}
              disabled={synthLoading}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '12.5px' }}
            >
              {synthLoading ? (
                <>
                  <Clock style={{ width: '15px', height: '15px' }} className="animate-spin" />
                  <span>Synthesizing Brief...</span>
                </>
              ) : (
                <>
                  <Sparkles style={{ width: '15px', height: '15px', color: '#FFB020' }} />
                  <span>Synthesize Grounded Investigation Brief</span>
                </>
              )}
            </button>
          </div>

          {/* Synthesizer Result Dossier */}
          {briefResult && (
            <div className="card-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Dossier Top Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color-subtle)', paddingBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Executive Incident Intelligence Dossier
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {briefResult.risk_profile}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#DC2626',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  {briefResult.grounding_status}
                </span>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Executive Synthesis
                </h4>
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color-subtle)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}
                >
                  {briefResult.executive_summary}
                </div>
              </div>

              {/* Barrier Breakdown Table */}
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Observed Defenses vs Statutory Mandates
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Observed Control Failure</th>
                        <th style={{ padding: '10px 14px' }}>Applicable Life-Saving Rule</th>
                        <th style={{ padding: '10px 14px' }}>Statutory Standard Mandate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {briefResult.barrier_breakdown.map((b, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color-subtle)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#B91C1C' }}>
                            {b.observed_failure}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: '#0D9488' }}>
                              {b.applicable_rule}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {b.statutory_mandate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remedial Recommendations */}
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Grounded Remedial Recommendations
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {briefResult.remedial_recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '12.5px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(13, 148, 136, 0.12)',
                          color: '#0D9488',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ lineHeight: 1.45 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 3: STANDARDS LIBRARY
          ==================================================================== */}
      {activeSubTab === 'standards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search bar */}
          <div className="card-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={standardsSearch}
                onChange={(e) => setStandardsSearch(e.target.value)}
                placeholder="Search standards library..."
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color-subtle)',
                  borderRadius: '9999px',
                  padding: '0 16px 0 34px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredStandards.length} of {standards.length} Approved Safety Standards
            </span>
          </div>

          {/* Standards Bento Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
            {filteredStandards.map((s, idx) => (
              <div
                key={idx}
                className="bento-card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color-subtle)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0D9488' }}>
                      {s.standard}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                      {s.category}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>
                    {s.title}
                  </h3>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {s.section}
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color-subtle)',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {s.citations}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
