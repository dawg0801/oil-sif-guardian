import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  RefreshCw,
  Search,
  Layers,
  Award,
  BarChart2,
  FileText,
  FolderOpen,
  X,
  Play,
  ShieldCheck
} from 'lucide-react';
import { BatchIngestResponse, DataQualitySummary, BatchIngestItemResult } from '../types';

interface BatchIngestionViewProps {
  onSelectReportId?: (reportId: string) => void;
}

export const BatchIngestionView: React.FC<BatchIngestionViewProps> = ({ onSelectReportId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchIngestResponse | null>(null);
  const [qualitySummary, setQualitySummary] = useState<DataQualitySummary | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

  const fetchQualitySummary = async () => {
    try {
      const res = await fetch(`${apiBase}/reports/quality-summary`);
      if (res.ok) {
        const data = await res.json();
        setQualitySummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch quality summary', err);
    }
  };

  useEffect(() => {
    fetchQualitySummary();
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt')) {
        setFile(droppedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('Only .csv or plain text tabular files are accepted.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiBase}/reports/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to upload and parse CSV dataset');
      }

      const result: BatchIngestResponse = await response.json();
      setBatchResult(result);
      fetchQualitySummary();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during CSV batch ingestion.');
    } finally {
      setIsUploading(false);
    }
  };

  const loadSampleCuratedDataset = async () => {
    setIsUploading(true);
    setErrorMessage(null);
    try {
      // Quick batch import with sample curated reports
      const response = await fetch(`${apiBase}/reports/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: [
            {
              report_type: 'near_miss',
              site: 'Duliajan Production Installation',
              location: 'Separator Station #4',
              department: 'Mechanical Maintenance',
              activity: 'Separator Vessel Inspection',
              equipment: ['Gas Separator V-102'],
              reporter_role: 'Lead Operator',
              narrative: 'During maintenance, a contractor entered the tank to inspect an internal valve. Gas testing was not recorded, the entry permit had expired, and no attendant was positioned outside.'
            },
            {
              report_type: 'near_miss',
              site: 'Moran Gathering Station',
              location: 'Manifold Skid B',
              department: 'Pipeline Operations',
              activity: 'Flange Unbolting',
              equipment: ['Main Gathering Line 12-inch'],
              reporter_role: 'Maintenance Fitter',
              narrative: 'Mechanical technician attempted to unbolt a pressurized gas line flange before closing isolation block valves. Stored energy was present without LOTO verification.'
            },
            {
              report_type: 'unsafe_act',
              site: 'Drilling Rig OIL-45',
              location: 'Drill Floor / Catwalk',
              department: 'Drilling Services',
              activity: 'Tubular Handling',
              equipment: ['Hydraulic Rig Crane #2'],
              reporter_role: 'Assistant Driller',
              narrative: 'During rig operations, a roustabout was walking underneath the suspended load while the crane was slewing a 3-ton casing joint across the drill floor.'
            },
            {
              report_type: 'unsafe_condition',
              site: 'Naharkatiya Wellhead Cluster',
              location: 'Well NHK-204',
              department: 'Workover Operations',
              activity: 'Xmas Tree Servicing',
              equipment: ['Wellhead Xmas Tree'],
              reporter_role: 'Rig Supervisor',
              narrative: 'Discovered casing valve needle valve sheared off with 1200 psi shut-in casing pressure. Wireline grease injector unit was operating nearby without barrier.'
            },
            {
              report_type: 'near_miss',
              site: 'Tinsukia Crude Pump Station',
              location: 'Pump House East',
              department: 'Electrical Engineering',
              activity: 'Motor Control Center (MCC)',
              equipment: ['415V Switchgear Panel'],
              reporter_role: 'Senior Electrician',
              narrative: 'Electrician opened 415V MCC panel door with live busbars exposed while wearing cotton gloves. No arc flash PPE or calibrated multimeter voltage check performed.'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load sample dataset');
      }

      const resData = await response.json();
      setBatchResult(resData);
      fetchQualitySummary();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredItems = (batchResult?.items || []).filter((item) => {
    if (filterPriority !== 'ALL' && item.priority !== filterPriority) return false;
    if (filterGrade !== 'ALL' && item.quality_grade !== filterGrade) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = item.report_id?.toLowerCase().includes(q);
      const matchRule = item.primary_rule?.toLowerCase().includes(q);
      const matchStatus = item.status.toLowerCase().includes(q);
      if (!matchId && !matchRule && !matchStatus) return false;
    }
    return true;
  });

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' };
      case 'B':
        return { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284C7', border: 'rgba(2, 132, 199, 0.3)' };
      case 'C':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: 'rgba(245, 158, 11, 0.3)' };
      case 'D':
        return { bg: 'rgba(249, 115, 22, 0.12)', text: '#EA580C', border: 'rgba(249, 115, 22, 0.3)' };
      default:
        return { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* Header & Controls */}
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
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <FileSpreadsheet style={{ width: '13px', height: '13px' }} />
              Dataset Ingestion & Quality Audit
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
              OIL HSSE Corpus Intelligence
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Batch Ingestion, Normalization & Quality Audit
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '740px' }}>
            Batch-ingest legacy HSSE spreadsheets, expand oilfield abbreviations, redact PII, score narrative richness, and detect duplicate submissions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadSampleCuratedDataset}
            disabled={isUploading}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '12.5px' }}
          >
            <Sparkles style={{ width: '14px', height: '14px', color: '#D97706' }} />
            <span>Load Curated Sample (5 Incidents)</span>
          </button>
          <button
            onClick={fetchQualitySummary}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '12.5px' }}
            title="Refresh analytics"
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Data Quality Summary Dashboard */}
      {qualitySummary && (
        <div className="stats-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div className="kpi-card" style={{ borderRadius: '24px' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>Total Ingested Reports</span>
              <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#2563EB' }}>
                <Layers style={{ width: '17px', height: '17px' }} />
              </div>
            </div>
            <div className="kpi-card-value">
              {qualitySummary.total_reports}
            </div>
            <div className="kpi-card-desc">
              <span>Full Historical Corpus</span>
            </div>
          </div>

          <div className="kpi-card" style={{ borderRadius: '24px' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label" style={{ color: '#D97706' }}>Average Quality Score</span>
              <div className="kpi-card-icon-pill" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#D97706' }}>
                <Award style={{ width: '17px', height: '17px' }} />
              </div>
            </div>
            <div className="kpi-card-value" style={{ color: '#D97706' }}>
              {qualitySummary.average_quality_score} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
            </div>
            <div className="kpi-card-desc">
              <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, qualitySummary.average_quality_score)}%`,
                    backgroundColor: '#059669',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ borderRadius: '24px', gridColumn: 'span 2' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label" style={{ color: 'var(--text-secondary)' }}>
                Quality Grade Distribution
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Automated SIF Taxonomy Scored</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '12px' }}>
              {['A', 'B', 'C', 'D', 'F'].map((grade) => (
                <div
                  key={grade}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Grade {grade}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: grade === 'A' ? '#059669' : grade === 'B' ? '#0284C7' : grade === 'C' ? '#D97706' : '#DC2626', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {qualitySummary.grade_distribution[grade] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modern Enterprise CSV / Tabular Upload Dropzone */}
      <div
        className="card-panel"
        style={{
          borderRadius: '24px',
          padding: '28px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              borderRadius: '20px',
              padding: '38px 24px',
              border: isDragOver ? '2px dashed #0D9488' : '2px dashed var(--border-color)',
              backgroundColor: isDragOver ? 'rgba(13, 148, 136, 0.06)' : 'var(--bg-input)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                color: '#0D9488',
                border: '1px solid var(--border-color-subtle)',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)',
              }}
            >
              <UploadCloud style={{ width: '28px', height: '28px' }} />
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Upload HSSE Incident Dataset (.CSV)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '520px', marginTop: '6px', lineHeight: 1.5 }}>
              Drag &amp; drop your operational safety report spreadsheets here, or browse from your device.
              Automatically matches field aliases, expands oilfield acronyms, and redacts personal identifiers.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '12.5px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FolderOpen style={{ width: '15px', height: '15px' }} />
                <span>Browse Files</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleCuratedDataset();
                }}
                disabled={isUploading}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '12.5px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Sparkles style={{ width: '14px', height: '14px', color: '#D97706' }} />
                <span>Load Curated Sample (5 Incidents)</span>
              </button>
            </div>

            {/* Supported format tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', color: 'var(--text-secondary)' }}>
                📄 CSV / TSV
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', color: 'var(--text-secondary)' }}>
                UTF-8 Encoding
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color-subtle)', color: 'var(--text-secondary)' }}>
                🔒 Auto PII Redaction
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', backgroundColor: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', color: '#0D9488' }}>
                ⚡ Auto-Alias Normalization
              </span>
            </div>
          </div>
        ) : (
          /* Staged File Card */
          <div
            style={{
              borderRadius: '20px',
              padding: '24px',
              backgroundColor: 'var(--bg-input)',
              border: '1.5px solid rgba(13, 148, 136, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(13, 148, 136, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                  }}
                >
                  <FileSpreadsheet style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                      Staged &amp; Ready
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Size: {(file.size / 1024).toFixed(1)} KB &bull; Type: {file.type || 'text/csv'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Remove selected file"
                >
                  <X style={{ width: '14px', height: '14px' }} />
                  <span>Remove</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Change file"
                >
                  <FolderOpen style={{ width: '14px', height: '14px' }} />
                  <span>Change</span>
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Ingesting &amp; Auditing...</span>
                    </>
                  ) : (
                    <>
                      <Play style={{ width: '15px', height: '15px' }} />
                      <span>Execute Batch Ingestion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              fontSize: '12px',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Batch Processing Execution Results */}
      {batchResult && (
        <div className="space-y-4">
          <div
            className="card-panel"
            style={{
              borderRadius: '24px',
              padding: '20px 24px',
              borderLeft: '4px solid #059669',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: '#059669' }} />
                    <span>Batch Ingestion Execution Complete</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Processed {batchResult.total_processed} safety events. Average Quality Score: <strong style={{ color: '#059669' }}>{batchResult.average_quality_score}/100</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 800 }}>
                    {batchResult.successful_count} Ingested
                  </span>
                  {batchResult.duplicate_count > 0 && (
                    <span style={{ padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontWeight: 800 }}>
                      {batchResult.duplicate_count} Duplicate Flags
                    </span>
                  )}
                  {batchResult.failed_count > 0 && (
                    <span style={{ padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', fontWeight: 800 }}>
                      {batchResult.failed_count} Errors
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filtering and Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '440px' }}>
              <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Report ID, rule, or status..."
                className="form-input"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="form-input"
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High PSIF Only</option>
                <option value="REVIEW">Review Only</option>
                <option value="LOW">Low Only</option>
              </select>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="form-input"
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Grades</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
                <option value="F">Grade F</option>
              </select>
            </div>
          </div>

          {/* Batch Records Table */}
          <div className="card-panel" style={{ borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Report ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Quality Score</th>
                    <th className="py-3 px-4">PSIF Priority</th>
                    <th className="py-3 px-4">Primary IOGP Rule</th>
                    <th className="py-3 px-4">Deficiencies / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color-subtle)' }}>
                  {filteredItems.map((item) => {
                    const gradeStyle = getGradeStyle(item.quality_grade);
                    return (
                      <tr key={item.index} style={{ transition: 'background-color 0.15s ease' }} className="hover-row">
                        <td className="py-3.5 px-4" style={{ color: 'var(--text-muted)' }}>{item.index + 1}</td>
                        <td className="py-3.5 px-4">
                          {item.report_id ? (
                            <button
                              onClick={() => onSelectReportId && onSelectReportId(item.report_id!)}
                              style={{ color: '#0D9488', fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              {item.report_id}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'SUCCESS' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                              SUCCESS
                            </span>
                          )}
                          {item.status === 'DUPLICATE_WARNING' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
                              DUPLICATE WARNING
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: gradeStyle.bg, color: gradeStyle.text, border: `1px solid ${gradeStyle.border}` }}>
                              {item.quality_grade}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{item.quality_score}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.priority === 'HIGH' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
                              HIGH ({((item.psif_probability || 0) * 100).toFixed(0)}%)
                            </span>
                          )}
                          {item.priority === 'REVIEW' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
                              REVIEW ({((item.psif_probability || 0) * 100).toFixed(0)}%)
                            </span>
                          )}
                          {item.priority === 'LOW' && (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                              LOW ({((item.psif_probability || 0) * 100).toFixed(0)}%)
                            </span>
                          )}
                          {!item.priority && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.primary_rule ? (
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(13, 148, 136, 0.1)', color: '#0D9488' }}>
                              {item.primary_rule}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.duplicate_matches && item.duplicate_matches.length > 0 ? (
                            <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Copy style={{ width: '12px', height: '12px' }} />
                              <span>Matches {item.duplicate_matches[0].match_id} ({Math.round(item.duplicate_matches[0].similarity * 100)}%)</span>
                            </span>
                          ) : item.quality_issues && item.quality_issues.length > 0 ? (
                            <span>{item.quality_issues.join(', ')}</span>
                          ) : (
                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                              <span>Rich narrative & full metadata</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No batch items match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
