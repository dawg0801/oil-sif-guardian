import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import {
  LayoutDashboard,
  Zap,
  UserCheck,
  CheckSquare,
  AlertOctagon,
  Network,
  Sliders,
  FileSpreadsheet,
  Tag,
  BookOpen,
  Target,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  Menu,
  X,
  Shield,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ReportIngestion } from './components/ReportIngestion';
import { AIResultView } from './components/AIResultView';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';

// Route-level dynamic code-splitting
const BatchIngestionView = lazy(() => import('./components/BatchIngestionView').then(m => ({ default: m.BatchIngestionView })));
const AnnotationBenchmarkView = lazy(() => import('./components/AnnotationBenchmarkView').then(m => ({ default: m.AnnotationBenchmarkView })));
const PrecursorClusterView = lazy(() => import('./components/PrecursorClusterView').then(m => ({ default: m.PrecursorClusterView })));
const EntityExtractionView = lazy(() => import('./components/EntityExtractionView').then(m => ({ default: m.EntityExtractionView })));
const ModelStudioView = lazy(() => import('./components/ModelStudioView').then(m => ({ default: m.ModelStudioView })));
const IOGPMultiLabelView = lazy(() => import('./components/IOGPMultiLabelView').then(m => ({ default: m.IOGPMultiLabelView })));
const DeterministicRulesView = lazy(() => import('./components/DeterministicRulesView').then(m => ({ default: m.DeterministicRulesView })));
const HybridDecisionStudioView = lazy(() => import('./components/HybridDecisionStudioView').then(m => ({ default: m.HybridDecisionStudioView })));
const HSEReviewQueue = lazy(() => import('./components/HSEReviewQueue').then(m => ({ default: m.HSEReviewQueue })));
const CorrectiveActionsView = lazy(() => import('./components/CorrectiveActionsView').then(m => ({ default: m.CorrectiveActionsView })));
const RAGSafetyAssistantView = lazy(() => import('./components/RAGSafetyAssistantView').then(m => ({ default: m.RAGSafetyAssistantView })));

const ViewSkeletonLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '14px',
    color: 'var(--text-muted)'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(13, 148, 136, 0.2)',
      borderTop: '3px solid #0D9488',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
      Loading Module...
    </span>
  </div>
);

import { ReportResponse } from './types';
import { api } from './services/api';

type TabType =
  | 'dashboard'
  | 'intake'
  | 'queue'
  | 'actions'
  | 'rules'
  | 'clusters'
  | 'models'
  | 'batch'
  | 'annotation'
  | 'extraction'
  | 'decision'
  | 'iogp'
  | 'rag';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [latestReport, setLatestReport] = useState<ReportResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleTriageComplete = (report: ReportResponse) => {
    setLatestReport(report);
    setActiveTab('intake');
  };

  const handleSelectReportFromQueue = (report: ReportResponse) => {
    setLatestReport(report);
    setActiveTab('intake');
  };

  const handleSelectReportId = async (reportId: string) => {
    try {
      const rep = await api.getReport(reportId);
      setLatestReport(rep);
      setActiveTab('intake');
    } catch (e) {
      console.error('Failed to load report:', e);
    }
  };

  const isMoreTabActive = ['models', 'batch', 'extraction', 'annotation', 'decision', 'iogp'].includes(activeTab);

  return (
    <div className="app-canvas">
      {/* ====================================================================
          TOP APPLICATION HEADER (Directly Inspired by Reference Screenshot)
          ==================================================================== */}
      <header className="app-header">
        {/* Brand Mark (Half-Moon Emblem + Title) */}
        <div
          className="brand-mark"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="brand-emblem">
            <div className="brand-emblem-inner">
              <Shield style={{ width: '12px', height: '12px', color: '#07382F' }} />
            </div>
          </div>
          <div>
            <div className="brand-title">OIL GUARDIAN</div>
            <div className="brand-subtitle">HSSE Intelligence</div>
          </div>
        </div>

        {/* Top Horizontal Nav Tabs (Overview, Reports, etc. matching screenshot) */}
        <nav className="header-nav-tabs">
          <button
            className={`nav-tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>Overview</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'intake' ? 'active' : ''}`}
            onClick={() => setActiveTab('intake')}
          >
            <span>Triage</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span>Review Queue</span>
            <span className="nav-tab-badge">3</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <span>Actions</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <span>Rules</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'clusters' ? 'active' : ''}`}
            onClick={() => setActiveTab('clusters')}
          >
            <span>Clusters</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            <span>Standards RAG</span>
          </button>

          {/* More Dropdown for Advanced AI Modules */}
          <div style={{ position: 'relative' }} ref={moreMenuRef}>
            <button
              className={`nav-tab-item ${isMoreTabActive ? 'active' : ''}`}
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>More</span>
              <ChevronDown style={{ width: '14px', height: '14px' }} />
            </button>

            {moreMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                width: '240px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '16px',
                boxShadow: 'var(--card-shadow-floating)',
                border: '1px solid var(--border-color)',
                padding: '8px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <button
                  onClick={() => { setActiveTab('models'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'models' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <Sliders style={{ width: '16px', height: '16px', color: '#7C3AED' }} />
                  <span>Model Studio</span>
                </button>

                <button
                  onClick={() => { setActiveTab('extraction'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'extraction' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <Tag style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
                  <span>Entity Extraction (NER)</span>
                </button>

                <button
                  onClick={() => { setActiveTab('decision'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'decision' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <Sparkles style={{ width: '16px', height: '16px', color: '#0D9488' }} />
                  <span>Decision Engine Studio</span>
                </button>

                <button
                  onClick={() => { setActiveTab('iogp'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'iogp' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <AlertOctagon style={{ width: '16px', height: '16px', color: '#EF4444' }} />
                  <span>IOGP Multi-Label</span>
                </button>

                <button
                  onClick={() => { setActiveTab('batch'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'batch' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <FileSpreadsheet style={{ width: '16px', height: '16px', color: '#10B981' }} />
                  <span>Batch Ingestion</span>
                </button>

                <button
                  onClick={() => { setActiveTab('annotation'); setMoreMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'annotation' ? 'var(--bg-pill)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <Target style={{ width: '16px', height: '16px', color: '#0284C7' }} />
                  <span>Active Learning Benchmark</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right Action Icons & User Profile */}
        <div className="header-right">
          {/* Notifications Button */}
          <button
            className="circle-icon-btn"
            onClick={() => setActiveTab('queue')}
            title="Active Notifications"
          >
            <Bell style={{ width: '17px', height: '17px' }} />
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#FF7058'
            }} />
          </button>

          {/* Theme Toggle Button */}
          <button
            className="circle-icon-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon style={{ width: '17px', height: '17px' }} />
            ) : (
              <Sun style={{ width: '17px', height: '17px', color: '#FFB020' }} />
            )}
          </button>

          {/* New Incident Action - Placed prominently before profile with ample room */}
          <button
            className="header-new-incident-btn"
            onClick={() => setActiveTab('intake')}
            title="Create New Incident Triage Report"
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            <span>New Incident</span>
          </button>

          {/* User Profile - Compact and positioned at the rightmost corner */}
          <div className="header-user-profile" onClick={() => setActiveTab('dashboard')} title="Er. Rajesh Baruah (Chief Safety Officer)">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
              alt="Er. Rajesh Baruah"
              className="user-avatar-circle"
            />
            <div className="header-user-text">
              <div className="user-meta-name">Er. Rajesh Baruah</div>
              <div className="user-meta-role">Chief Safety Officer</div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="circle-icon-btn header-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X style={{ width: '18px', height: '18px' }} /> : <Menu style={{ width: '18px', height: '18px' }} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 99,
          display: 'flex',
          justifyContent: 'flex-start'
        }}>
          <div style={{
            width: '280px',
            backgroundColor: 'var(--bg-surface)',
            height: '100%',
            padding: '24px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Navigation</div>
              <button className="circle-icon-btn" onClick={() => setMobileMenuOpen(false)}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {[
              { tab: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { tab: 'intake', label: 'Incident Triage', icon: Zap },
              { tab: 'queue', label: 'HSE Review Queue', icon: UserCheck },
              { tab: 'actions', label: 'CAPA Actions', icon: CheckSquare },
              { tab: 'rules', label: 'Statutory Rules', icon: AlertOctagon },
              { tab: 'clusters', label: 'Precursor Clusters', icon: Network },
              { tab: 'rag', label: 'Standards RAG', icon: BookOpen },
              { tab: 'models', label: 'Model Studio', icon: Sliders },
              { tab: 'extraction', label: 'Entity Extraction (NER)', icon: Tag },
              { tab: 'decision', label: 'Decision Engine Studio', icon: Sparkles },
              { tab: 'batch', label: 'Batch Ingestion', icon: FileSpreadsheet },
              { tab: 'annotation', label: 'Active Learning Benchmark', icon: Target }
            ].map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as TabType); setMobileMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: activeTab === tab ? 'var(--accent-emerald-light)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent-emerald)' : 'var(--text-primary)',
                  fontWeight: activeTab === tab ? 700 : 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Icon style={{ width: '18px', height: '18px' }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          MAIN VIEWPORT CONTENT
          ==================================================================== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<ViewSkeletonLoader />}>
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              onNavigateToIntake={() => setActiveTab('intake')}
              onNavigateToQueue={() => setActiveTab('queue')}
              onNavigateToActions={() => setActiveTab('actions')}
              onNavigateToRules={() => setActiveTab('rules')}
              onNavigateToClusters={() => setActiveTab('clusters')}
              onTriageComplete={handleTriageComplete}
            />
          )}

          {activeTab === 'intake' && (
            <div style={{ padding: '32px 36px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <ReportIngestion onTriageComplete={handleTriageComplete} />
                {latestReport && (
                  <AIResultView
                    report={latestReport}
                    onGoToReview={() => setActiveTab('queue')}
                    onGoToAction={() => setActiveTab('actions')}
                    onSelectReportId={handleSelectReportId}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div style={{ padding: '32px 36px' }}>
              <HSEReviewQueue onSelectReport={handleSelectReportFromQueue} />
            </div>
          )}

          {activeTab === 'actions' && (
            <div style={{ padding: '32px 36px' }}>
              <CorrectiveActionsView />
            </div>
          )}

          {activeTab === 'rules' && (
            <div style={{ padding: '32px 36px' }}>
              <DeterministicRulesView />
            </div>
          )}

          {activeTab === 'clusters' && (
            <div style={{ padding: '32px 36px' }}>
              <PrecursorClusterView />
            </div>
          )}

          {activeTab === 'models' && (
            <div style={{ padding: '32px 36px' }}>
              <ModelStudioView />
            </div>
          )}

          {activeTab === 'batch' && (
            <div style={{ padding: '32px 36px' }}>
              <BatchIngestionView onSelectReportId={handleSelectReportId} />
            </div>
          )}

          {activeTab === 'annotation' && (
            <div style={{ padding: '32px 36px' }}>
              <AnnotationBenchmarkView />
            </div>
          )}

          {activeTab === 'extraction' && (
            <div style={{ padding: '32px 36px' }}>
              <EntityExtractionView />
            </div>
          )}

          {activeTab === 'decision' && (
            <div style={{ padding: '32px 36px' }}>
              <HybridDecisionStudioView />
            </div>
          )}

          {activeTab === 'iogp' && (
            <div style={{ padding: '32px 36px' }}>
              <IOGPMultiLabelView />
            </div>
          )}

          {activeTab === 'rag' && (
            <div style={{ padding: '32px 36px' }}>
              <RAGSafetyAssistantView />
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
};
