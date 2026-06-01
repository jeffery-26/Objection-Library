import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Edit2, Trash2, Play, Filter, Tag, Users, Copy, Check } from 'lucide-react';
import { supabase } from './supabase';

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function getThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export default function App() {
  const [videos, setVideos] = useState([]);
  const [objectionTypes, setObjectionTypes] = useState([]);
  const [icpTypes, setIcpTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeObjectionFilters, setActiveObjectionFilters] = useState([]);
  const [activeIcpFilters, setActiveIcpFilters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [showManageObjections, setShowManageObjections] = useState(false);
  const [showManageIcps, setShowManageIcps] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: vids } = await supabase.from('videos').select('*').order('added_at', { ascending: false });
    const { data: objs } = await supabase.from('objection_types').select('*').order('name');
    const { data: icps } = await supabase.from('icps').select('*').order('name');
    setVideos((vids || []).map(v => ({ ...v, icps: v.icps || [] })));
    setObjectionTypes((objs || []).map(o => o.name));
    setIcpTypes((icps || []).map(i => i.name));
    setLoading(false);
  }

  async function handleSave(video) {
    if (editingVideo) {
      await supabase.from('videos').update({
        title: video.title, url: video.url, presenter: video.presenter,
        objections: video.objections, icps: video.icps, notes: video.notes
      }).eq('id', video.id);
    } else {
      await supabase.from('videos').insert({
        title: video.title, url: video.url, presenter: video.presenter,
        objections: video.objections, icps: video.icps, notes: video.notes
      });
    }
    setShowAddModal(false);
    setEditingVideo(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this video?')) return;
    await supabase.from('videos').delete().eq('id', id);
    loadData();
  }

  async function saveObjectionTypes(newTypes) {
    const toAdd = newTypes.filter(t => !objectionTypes.includes(t));
    const toRemove = objectionTypes.filter(t => !newTypes.includes(t));
    if (toAdd.length) {
      await supabase.from('objection_types').insert(toAdd.map(name => ({ name })));
    }
    if (toRemove.length) {
      await supabase.from('objection_types').delete().in('name', toRemove);
    }
    loadData();
  }

  async function saveIcpTypes(newTypes) {
    const toAdd = newTypes.filter(t => !icpTypes.includes(t));
    const toRemove = icpTypes.filter(t => !newTypes.includes(t));
    if (toAdd.length) {
      await supabase.from('icps').insert(toAdd.map(name => ({ name })));
    }
    if (toRemove.length) {
      await supabase.from('icps').delete().in('name', toRemove);
    }
    loadData();
  }

  const toggleObjectionFilter = (obj) => {
    setActiveObjectionFilters(prev => prev.includes(obj) ? prev.filter(f => f !== obj) : [...prev, obj]);
  };
  const toggleIcpFilter = (icp) => {
    setActiveIcpFilters(prev => prev.includes(icp) ? prev.filter(f => f !== icp) : [...prev, icp]);
  };

  const filtered = useMemo(() => {
    return videos.filter(v => {
      const vIcps = v.icps || [];
      const matchesSearch = !search ||
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        v.presenter.toLowerCase().includes(search.toLowerCase()) ||
        (v.notes && v.notes.toLowerCase().includes(search.toLowerCase())) ||
        v.objections.some(o => o.toLowerCase().includes(search.toLowerCase())) ||
        vIcps.some(i => i.toLowerCase().includes(search.toLowerCase()));
      const matchesObjections = activeObjectionFilters.length === 0 || activeObjectionFilters.some(f => v.objections.includes(f));
      const matchesIcps = activeIcpFilters.length === 0 || activeIcpFilters.some(f => vIcps.includes(f));
      return matchesSearch && matchesObjections && matchesIcps;
    });
  }, [videos, search, activeObjectionFilters, activeIcpFilters]);

  const objectionCounts = useMemo(() => {
    const counts = {};
    videos.forEach(v => v.objections.forEach(o => { counts[o] = (counts[o] || 0) + 1; }));
    return counts;
  }, [videos]);

  const icpCounts = useMemo(() => {
    const counts = {};
    videos.forEach(v => (v.icps || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; }));
    return counts;
  }, [videos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm tracking-wide">Loading library…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .card-hover { transition: all 0.15s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      `}</style>

      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Objection Library</h1>
            <p className="text-xs text-stone-500 mt-0.5">{videos.length} videos · weekly updates</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManageObjections(true)} className="text-xs text-stone-600 hover:text-stone-900 px-3 py-2 rounded-md hover:bg-stone-100 flex items-center gap-1.5">
              <Tag size={14} /> Objections
            </button>
            <button onClick={() => setShowManageIcps(true)} className="text-xs text-stone-600 hover:text-stone-900 px-3 py-2 rounded-md hover:bg-stone-100 flex items-center gap-1.5">
              <Users size={14} /> ICPs
            </button>
            <button onClick={() => setShowAddModal(true)} className="bg-stone-900 text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-stone-700 flex items-center gap-1.5">
              <Plus size={14} /> Add video
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, presenter, objection, ICP, or keyword…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100" />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-stone-500" />
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Filter by objection</span>
            {activeObjectionFilters.length > 0 && (
              <button onClick={() => setActiveObjectionFilters([])} className="text-xs text-stone-500 hover:text-stone-900 ml-2">
                Clear ({activeObjectionFilters.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {objectionTypes.map(obj => {
              const active = activeObjectionFilters.includes(obj);
              return (
                <button key={obj} onClick={() => toggleObjectionFilter(obj)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>
                  {obj}
                  <span className="ml-1.5 text-stone-400">{objectionCounts[obj] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-stone-500" />
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Filter by ICP</span>
            {activeIcpFilters.length > 0 && (
              <button onClick={() => setActiveIcpFilters([])} className="text-xs text-stone-500 hover:text-stone-900 ml-2">
                Clear ({activeIcpFilters.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {icpTypes.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No ICPs yet — click "ICPs" in the header to add some.</p>
            ) : (
              icpTypes.map(icp => {
                const active = activeIcpFilters.includes(icp);
                return (
                  <button key={icp} onClick={() => toggleIcpFilter(icp)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>
                    {icp}
                    <span className={`ml-1.5 ${active ? 'text-amber-200' : 'text-stone-400'}`}>{icpCounts[icp] || 0}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">No videos match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(v => (
              <VideoCard key={v.id} video={v}
                onEdit={() => { setEditingVideo(v); setShowAddModal(true); }}
                onDelete={() => handleDelete(v.id)} />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <VideoFormModal video={editingVideo} objectionTypes={objectionTypes} icpTypes={icpTypes} onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditingVideo(null); }} />
      )}
      {showManageObjections && (
        <ManageTagsModal title="Manage objection tags" placeholder="New objection type…" tags={objectionTypes} onSave={saveObjectionTypes} onClose={() => setShowManageObjections(false)} />
      )}
      {showManageIcps && (
        <ManageTagsModal title="Manage ICPs" placeholder="New ICP…" tags={icpTypes} onSave={saveIcpTypes} onClose={() => setShowManageIcps(false)} />
      )}
    </div>
  );
}

function VideoCard({ video, onEdit, onDelete }) {
  const thumb = getThumbnail(video.url);
  const icps = video.icps || [];
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(video.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = video.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 overflow-hidden card-hover group">
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-stone-100">
        {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center text-stone-300"><Play size={32} /></div>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="bg-white/0 group-hover:bg-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100">
            <Play size={20} className="text-stone-900" fill="currentColor" />
          </div>
        </div>
      </a>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-stone-900 leading-tight">{video.title}</h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1 text-stone-400 hover:text-stone-900" title="Edit"><Edit2 size={13} /></button>
            <button onClick={onDelete} className="p-1 text-stone-400 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
        <p className="text-xs text-stone-500 mb-3">by {video.presenter}</p>
        {video.notes && <p className="text-xs text-stone-600 mb-3 leading-relaxed line-clamp-2">{video.notes}</p>}
        <div className="flex flex-wrap gap-1 mb-3">
          {video.objections.map(o => (
            <span key={`obj-${o}`} className="text-[10px] font-medium px-2 py-0.5 bg-stone-100 text-stone-700 rounded">{o}</span>
          ))}
          {icps.map(i => (
            <span key={`icp-${i}`} className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-800 rounded">{i}</span>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md border transition-colors ${
            copied
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
          }`}
        >
          {copied ? (<><Check size={13} /> Link copied</>) : (<><Copy size={13} /> Copy link</>)}
        </button>
      </div>
    </div>
  );
}

function VideoFormModal({ video, objectionTypes, icpTypes, onSave, onClose }) {
  const [form, setForm] = useState(video ?
    { ...video, icps: video.icps || [] } :
    { title: '', url: '', presenter: '', objections: [], icps: [], notes: '' });

  const toggleObjection = (obj) => {
    setForm(f => ({ ...f, objections: f.objections.includes(obj) ? f.objections.filter(o => o !== obj) : [...f.objections, obj] }));
  };
  const toggleIcp = (icp) => {
    setForm(f => ({ ...f, icps: f.icps.includes(icp) ? f.icps.filter(i => i !== icp) : [...f.icps, icp] }));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.url.trim() || !form.presenter.trim()) { alert('Title, URL, and presenter are required.'); return; }
    if (form.objections.length === 0) { alert('Select at least one objection.'); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{video ? 'Edit video' : 'Add video'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Title">
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="e.g., Reframing price as investment" className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400" />
          </Field>
          <Field label="YouTube URL">
            <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})}
              placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400" />
          </Field>
          <Field label="Presenter / video is about">
            <input type="text" value={form.presenter} onChange={e => setForm({...form, presenter: e.target.value})}
              placeholder="e.g., Sarah Chen" className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400" />
          </Field>
          <Field label="Objections this video handles">
            <div className="flex flex-wrap gap-1.5">
              {objectionTypes.map(obj => {
                const active = form.objections.includes(obj);
                return (
                  <button key={obj} onClick={() => toggleObjection(obj)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>{obj}</button>
                );
              })}
            </div>
          </Field>
          <Field label="ICPs this video applies to">
            {icpTypes.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No ICPs yet — close this form, click "ICPs" in the header to add some.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {icpTypes.map(icp => {
                  const active = form.icps.includes(icp);
                  return (
                    <button key={icp} onClick={() => toggleIcp(icp)}
                      className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}>{icp}</button>
                  );
                })}
              </div>
            )}
          </Field>
          <Field label="Notes (optional)">
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              placeholder="When to use this, key takeaway, etc." rows={3}
              className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400 resize-none" />
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-100">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-stone-900 text-white rounded-md hover:bg-stone-700">{video ? 'Save changes' : 'Add video'}</button>
        </div>
      </div>
    </div>
  );
}

function ManageTagsModal({ title, placeholder, tags, onSave, onClose }) {
  const [localTags, setLocalTags] = useState([...tags]);
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    const t = newTag.trim();
    if (t && !localTags.includes(t)) { setLocalTags([...localTags, t]); setNewTag(''); }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="flex gap-2 mb-4">
            <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()} placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-stone-400" />
            <button onClick={addTag} className="px-3 py-2 bg-stone-900 text-white text-sm rounded-md hover:bg-stone-700">Add</button>
          </div>
          <div className="space-y-1.5">
            {localTags.map(tag => (
              <div key={tag} className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-md text-sm">
                <span className="text-stone-800">{tag}</span>
                <button onClick={() => setLocalTags(localTags.filter(t => t !== tag))} className="text-stone-400 hover:text-red-600"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-100">Cancel</button>
          <button onClick={() => { onSave(localTags); onClose(); }} className="px-4 py-2 text-sm bg-stone-900 text-white rounded-md hover:bg-stone-700">Save tags</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
