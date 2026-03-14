'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Clock, Phone, Users, XCircle, Plus, Trash2,
  ChevronDown, FileText, Download, Edit2, Check, X,
  AlertTriangle, Loader2, StickyNote, Calendar, Building2,
  TrendingUp, LayoutGrid, List
} from 'lucide-react';

const STATUSES = ['Applied', 'Phone Screen', 'Interview', 'Rejected'];

const STATUS_CONFIG = {
  Applied:      { color: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200 text-blue-800',   icon: Briefcase,  dot: 'bg-blue-500'   },
  'Phone Screen': { color: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-800', icon: Phone,      dot: 'bg-amber-500'  },
  Interview:    { color: 'bg-violet-500', light: 'bg-violet-50 border-violet-200 text-violet-800', icon: Users,   dot: 'bg-violet-500' },
  Rejected:     { color: 'bg-gray-400',   light: 'bg-gray-50 border-gray-200 text-gray-600',    icon: XCircle,    dot: 'bg-gray-400'   },
};

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 min-w-[90px]">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

function DocumentModal({ jobId, jobTitle, company, onClose }) {
  const [activeTab, setActiveTab] = useState('resume');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent('');
    fetch(`/api/jobs/${jobId}/documents?type=${activeTab}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError('No document saved yet.');
        else setContent(data.content || '');
      })
      .catch(() => setError('Failed to load document.'))
      .finally(() => setLoading(false));
  }, [jobId, activeTab]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab === 'resume' ? 'Resume' : 'CoverLetter'} - ${company}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{jobTitle}</h2>
            <p className="text-sm text-gray-500">{company}</p>
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
              >
                <Download size={14} />
                Download .md
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {[['resume', 'Resume'], ['coverletter', 'Cover Letter']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === val
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{error}</div>
          ) : (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-xl p-5 border border-gray-100">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG['Applied'];
  const StatusIcon = cfg.icon;

  const startEdit = () => {
    setDraft({
      company: job.company,
      jobTitle: job.jobTitle,
      appliedDate: job.appliedDate,
      notes: job.notes || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, ...draft }),
      });
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status) => {
    const res = await fetch('/api/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, status }),
    });
    const updated = await res.json();
    onUpdate(updated);
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${job.jobTitle}" at ${job.company}?`)) return;
    await fetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' });
    onDelete(job.id);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 group">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={draft.jobTitle}
                  onChange={e => setDraft({ ...draft, jobTitle: e.target.value })}
                  placeholder="Job title"
                />
                <input
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={draft.company}
                  onChange={e => setDraft({ ...draft, company: e.target.value })}
                  placeholder="Company"
                />
              </div>
            ) : (
              <>
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{job.jobTitle}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Building2 size={11} />
                  {job.company}
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {editing ? (
              <>
                <button onClick={saveEdit} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button onClick={startEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Edit2 size={14} />
                </button>
                <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status selector */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STATUSES.map(s => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                  job.status === s
                    ? `${c.color} text-white border-transparent shadow-sm`
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Calendar size={11} />
          {editing ? (
            <input
              type="date"
              className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={draft.appliedDate}
              onChange={e => setDraft({ ...draft, appliedDate: e.target.value })}
            />
          ) : (
            <span>Applied {job.appliedDate ? new Date(job.appliedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
          )}
        </div>

        {/* Notes */}
        {editing ? (
          <textarea
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
            rows={3}
            placeholder="Notes..."
            value={draft.notes}
            onChange={e => setDraft({ ...draft, notes: e.target.value })}
          />
        ) : job.notes ? (
          <div className="mb-3">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              <StickyNote size={11} />
              {showNotes ? 'Hide notes' : 'Show notes'}
            </button>
            {showNotes && (
              <p className="mt-1.5 text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                {job.notes}
              </p>
            )}
          </div>
        ) : null}

        {/* Key phrases */}
        {job.keyPhrases?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {job.keyPhrases.slice(0, 4).map((kw, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{kw}</span>
            ))}
            {job.keyPhrases.length > 4 && (
              <span className="text-xs text-gray-400">+{job.keyPhrases.length - 4} more</span>
            )}
          </div>
        )}

        {/* Docs button */}
        {(job.resumeKey || job.coverLetterKey) && (
          <button
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
          >
            <FileText size={12} />
            View saved documents
          </button>
        )}
      </div>

      {showDocs && (
        <DocumentModal
          jobId={job.id}
          jobTitle={job.jobTitle}
          company={job.company}
          onClose={() => setShowDocs(false)}
        />
      )}
    </>
  );
}

function AddJobModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    company: '',
    jobTitle: '',
    appliedDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Applied',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.jobTitle.trim()) {
      setError('Company and job title are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'duplicate') {
          setError('You already have an active application for this company and role.');
        } else {
          setError(data.message || 'Failed to save.');
        }
        return;
      }
      onAdd(data);
      onClose();
    } catch (e) {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Company *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Title *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Staff Network Engineer"
              value={form.jobTitle}
              onChange={e => setForm({ ...form, jobTitle: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Applied Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.appliedDate}
                onChange={e => setForm({ ...form, appliedDate: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Referral, recruiter name, anything relevant..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? 'Saving...' : 'Add Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleAdd = (job) => setJobs(prev => [job, ...prev]);
  const handleUpdate = (updated) => setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  const handleDelete = (id) => setJobs(prev => prev.filter(j => j.id !== id));

  // Stats
  const stats = STATUSES.reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s).length;
    return acc;
  }, {});
  const activeCount = jobs.filter(j => j.status !== 'Rejected').length;

  const filteredJobs = filterStatus === 'All' ? jobs : jobs.filter(j => j.status === filterStatus);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} active application{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Board view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} />
            Add Job
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap mb-6">
        <StatPill label="Total" value={jobs.length} color="text-gray-900" />
        <StatPill label="Applied" value={stats['Applied'] || 0} color="text-blue-600" />
        <StatPill label="Phone Screen" value={stats['Phone Screen'] || 0} color="text-amber-600" />
        <StatPill label="Interview" value={stats['Interview'] || 0} color="text-violet-600" />
        <StatPill label="Rejected" value={stats['Rejected'] || 0} color="text-gray-400" />
        {jobs.length > 0 && (
          <StatPill
            label="Response Rate"
            value={`${jobs.length > 0 ? Math.round(((stats['Phone Screen'] || 0) + (stats['Interview'] || 0)) / jobs.length * 100) : 0}%`}
            color="text-green-600"
          />
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-blue-400" />
          </div>
          <h3 className="text-gray-900 font-semibold mb-1">No applications yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            Applications you create from the Resume Customizer will appear here automatically.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add Manually
          </button>
        </div>
      ) : viewMode === 'board' ? (
        /* Board view — columns by status */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const colJobs = jobs.filter(j => j.status === status);
            return (
              <div key={status} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{status}</span>
                  <span className="ml-auto text-xs text-gray-400 font-medium bg-white border border-gray-200 rounded-full px-2 py-0.5">
                    {colJobs.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="space-y-2">
                  {colJobs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-300">Empty</div>
                  ) : (
                    colJobs.map(job => (
                      <JobCard key={job.id} job={job} onUpdate={handleUpdate} onDelete={handleDelete} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
            {['All', ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
                  filterStatus === s
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
                {s !== 'All' && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
                    {stats[s] || 0}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
            <div className="col-span-4">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Applied</div>
            <div className="col-span-3">Notes</div>
            <div className="col-span-1"></div>
          </div>
          {filteredJobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No applications in this status.</div>
          ) : (
            filteredJobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG['Applied'];
              return (
                <div key={job.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition items-center group">
                  <div className="col-span-4 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{job.jobTitle}</p>
                    <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                      <Building2 size={10} />{job.company}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <select
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${cfg.light}`}
                      value={job.status}
                      onChange={async (e) => {
                        const res = await fetch('/api/jobs', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: job.id, status: e.target.value }),
                        });
                        const updated = await res.json();
                        handleUpdate(updated);
                      }}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500">
                    {job.appliedDate ? new Date(job.appliedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                  <div className="col-span-3 text-xs text-gray-500 truncate">
                    {job.notes || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="col-span-1 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                    {(job.resumeKey || job.coverLetterKey) && (
                      <button
                        onClick={() => {
                          // Open doc modal - need state lift here so use inline approach
                          const event = new CustomEvent('open-job-docs', { detail: job });
                          window.dispatchEvent(event);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View documents"
                      >
                        <FileText size={14} />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`Remove "${job.jobTitle}" at ${job.company}?`)) return;
                        await fetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' });
                        handleDelete(job.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showAdd && <AddJobModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      {/* List view doc modal listener */}
      <ListViewDocListener onUpdate={handleUpdate} />
    </div>
  );
}

// Handles doc modal for list view rows (uses custom event to avoid prop drilling)
function ListViewDocListener() {
  const [activeJob, setActiveJob] = useState(null);

  useEffect(() => {
    const handler = (e) => setActiveJob(e.detail);
    window.addEventListener('open-job-docs', handler);
    return () => window.removeEventListener('open-job-docs', handler);
  }, []);

  if (!activeJob) return null;
  return (
    <DocumentModal
      jobId={activeJob.id}
      jobTitle={activeJob.jobTitle}
      company={activeJob.company}
      onClose={() => setActiveJob(null)}
    />
  );
}
