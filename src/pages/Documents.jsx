import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { fmtSize, fmtDate, fmtDateTime, typeOf, endOfDay, toDateInput } from '../lib/format.js';
import { demoDownload, copyText } from '../lib/download.js';
import Modal from '../components/Modal.jsx';
import { TypeBadge } from '../components/Badges.jsx';
import { useToast } from '../components/Toast.jsx';

/* My Vault: the signed-in person's own private documents.
   Upload, search/filter, favorites, share links, version history, delete. */

const MAX_SIZE = 10 * 1024 * 1024;   // 10 MB per file (demo rule)

/* ---------------- upload ---------------- */
function UploadModal({ onClose }) {
  const S = VS.getSession();
  const toast = useToast();
  const fileRef = useRef(null);
  const [folder, setFolder] = useState(VS.FOLDERS[0]);
  const [category, setCategory] = useState(VS.CATEGORIES[0]);
  const [valid, setValid] = useState('');
  const [tags, setTags] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    const files = Array.from(fileRef.current.files || []);
    if (!files.length) { toast('Choose at least one file', 'error'); return; }
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const validTill = valid ? endOfDay(valid) : null;
    const docs = VS.getDocs();
    let added = 0, skipped = 0;

    files.forEach((f) => {
      const type = typeOf(f.name);
      if (!type || f.size > MAX_SIZE) { skipped += 1; return; }
      docs.push({
        id: VS.uid('d'), name: f.name, type: type, size: f.size,
        folder: folder, category: category, tags: tagList,
        favorite: false, owner: S.email, ownerName: S.name, org: S.org,
        uploadedAt: Date.now(), accessCount: 0, currentVersion: 1, validTill: validTill,
        versions: [{ v: 1, size: f.size, date: Date.now(), by: S.name, note: 'Initial upload' }]
      });
      VS.addLog('Upload', f.name + ' → ' + folder);
      added += 1;
    });

    VS.saveDocs(docs);
    if (added) {
      toast(added + ' file(s) uploaded' + (skipped ? ', ' + skipped + ' skipped (type/size)' : ''));
      onClose();
    } else {
      toast('No files uploaded: only PDF, DOCX, PNG, JPG up to 10 MB', 'error');
    }
  }

  return (
    <Modal title="Upload documents" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="upFiles">Files (PDF, DOCX, PNG, JPG - up to 10 MB each)</label>
          <input type="file" id="upFiles" ref={fileRef} multiple accept=".pdf,.docx,.png,.jpg,.jpeg" />
          <div className="hint">Select several files to bulk upload.</div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="upFolder">Folder</label>
            <select id="upFolder" value={folder} onChange={(e) => setFolder(e.target.value)}>
              {VS.FOLDERS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="upCategory">Category</label>
            <select id="upCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
              {VS.CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="upValid">Valid till (optional)</label>
          <input type="date" id="upValid" value={valid} onChange={(e) => setValid(e.target.value)} />
          <div className="hint">For IDs, certificates, etc. You will get expiry warnings on your dashboard.</div>
        </div>
        <div className="field">
          <label htmlFor="upTags">Tags</label>
          <input type="text" id="upTags" placeholder="e.g. result, semester (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Upload</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- share ---------------- */
function ShareModal({ docId, onClose }) {
  const S = VS.getSession();
  const toast = useToast();
  const doc = VS.getDocs().find((d) => d.id === docId);
  const [type, setType] = useState('Public');
  const [perm, setPerm] = useState('download');
  const [expiry, setExpiry] = useState(toDateInput(Date.now() + 7 * 86400000));
  const [max, setMax] = useState(5);
  const [pass, setPass] = useState('');
  const [link, setLink] = useState('');

  if (!doc) return null;

  function onSubmit(e) {
    e.preventDefault();
    const maxN = parseInt(max, 10);
    if (!expiry) { toast('Pick an expiry date', 'error'); return; }
    if (!(maxN >= 1)) { toast('Download limit must be at least 1', 'error'); return; }
    const item = {
      id: VS.uid('l'), token: VS.makeToken(), docId: doc.id, docName: doc.name,
      type: type, permission: perm,
      password: pass.trim(),            // plain text in demo; hashed on the backend later
      expiry: endOfDay(expiry),
      maxDownloads: maxN, downloads: 0, createdBy: S.email, createdAt: Date.now(), active: true
    };
    const links = VS.getLinks();
    links.push(item);
    VS.saveLinks(links);
    VS.addLog('Share', 'Created ' + type.toLowerCase() + ' link for ' + doc.name);
    setLink(VS.shareUrl(item.token));
    toast('Share link created');
  }

  return (
    <Modal title="Share document" onClose={onClose}>
      <div className="muted" style={{ marginBottom: 14 }}>{doc.name}</div>
      <form onSubmit={onSubmit}>
        <div className="row">
          <div className="field">
            <label htmlFor="shType">Link type</label>
            <select id="shType" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Public">Public (anyone with the link)</option>
              <option value="Private">Private (signed-in users only)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="shPerm">Permission</label>
            <select id="shPerm" value={perm} onChange={(e) => setPerm(e.target.value)}>
              <option value="download">View and download</option>
              <option value="view">View only</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="shExpiry">Expiry date</label>
            <input type="date" id="shExpiry" min={toDateInput(Date.now())} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="shMax">Download limit</label>
            <input type="number" id="shMax" min="1" max="100" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="shPass">Password (optional)</label>
          <input type="text" id="shPass" placeholder="Leave empty for no password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary">Create link</button>
        </div>
      </form>
      {link && (
        <div className="result-box">
          <strong>Link created</strong>
          <div className="link-box">
            <input type="text" readOnly value={link} />
            <button type="button" className="btn" onClick={() => copyText(link, () => toast('Link copied'), () => toast('Copy failed', 'error'))}>Copy</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- versions ---------------- */
function VersionModal({ docId, onClose }) {
  useData();
  const S = VS.getSession();
  const toast = useToast();
  const fileRef = useRef(null);
  const doc = VS.getDocs().find((d) => d.id === docId);
  const [note, setNote] = useState('');
  const [cmp, setCmp] = useState({ a: null, b: null, shown: false });

  if (!doc) return null;
  const versions = doc.versions.slice().sort((a, b) => b.v - a.v);
  const cmpA = cmp.a !== null ? cmp.a : versions[versions.length - 1].v;    // default: oldest vs newest
  const cmpB = cmp.b !== null ? cmp.b : versions[0].v;

  function restore(v) {
    const docs = VS.getDocs();
    const d = docs.find((x) => x.id === docId);
    const target = d.versions.find((x) => x.v === v);
    d.currentVersion = v;
    d.size = target.size;
    VS.saveDocs(docs);
    VS.addLog('Restore Version', d.name + ' → v' + v);
    toast('Restored to v' + v);
  }

  function uploadVersion() {
    const f = fileRef.current.files[0];
    if (!f) { toast('Choose a file first', 'error'); return; }
    const docs = VS.getDocs();
    const d = docs.find((x) => x.id === docId);
    if (typeOf(f.name) !== d.type) { toast('New version must be the same file type (' + d.type.toUpperCase() + ')', 'error'); return; }
    if (f.size > MAX_SIZE) { toast('File is larger than 10 MB', 'error'); return; }
    const next = Math.max.apply(null, d.versions.map((x) => x.v)) + 1;
    d.versions.push({ v: next, size: f.size, date: Date.now(), by: S.name, note: note.trim() || 'Updated file' });
    d.currentVersion = next;
    d.size = f.size;
    VS.saveDocs(docs);
    VS.addLog('New Version', d.name + ' → v' + next);
    toast('Version v' + next + ' uploaded');
    fileRef.current.value = '';
    setNote('');
  }

  const a = doc.versions.find((x) => x.v === Number(cmpA));
  const b = doc.versions.find((x) => x.v === Number(cmpB));
  let compareView = null;
  if (cmp.shown && a && b) {
    if (a.v === b.v) {
      compareView = <div className="muted">Pick two different versions to compare.</div>;
    } else {
      const diff = b.size - a.size;
      const diffText = diff === 0 ? 'Same size' : (diff > 0 ? '+' : '-') + fmtSize(Math.abs(diff));
      compareView = (
        <>
          <table>
            <thead><tr><th></th><th>v{a.v}</th><th>v{b.v}</th></tr></thead>
            <tbody>
              <tr><td>Uploaded by</td><td>{a.by}</td><td>{b.by}</td></tr>
              <tr><td>Date</td><td>{fmtDateTime(a.date)}</td><td>{fmtDateTime(b.date)}</td></tr>
              <tr><td>Size</td><td>{fmtSize(a.size)}</td><td>{fmtSize(b.size)}</td></tr>
              <tr><td>Note</td><td>{a.note || '-'}</td><td>{b.note || '-'}</td></tr>
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 8 }}>Size change from v{a.v} to v{b.v}: <strong>{diffText}</strong></p>
        </>
      );
    }
  }

  return (
    <Modal title={'Version history: ' + doc.name} onClose={onClose} wide>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Version</th><th>Date</th><th>By</th><th>Size</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.v}>
                <td><strong>v{v.v}</strong> {v.v === doc.currentVersion && <span className="badge b-ok">Current</span>}</td>
                <td>{fmtDateTime(v.date)}</td><td>{v.by}</td><td>{fmtSize(v.size)}</td><td>{v.note || ''}</td>
                <td>{v.v !== doc.currentVersion && <button type="button" className="btn btn-sm" onClick={() => restore(v.v)}>Restore</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>Upload a new version</h2>
      <div className="row">
        <div className="field"><input type="file" ref={fileRef} accept=".pdf,.docx,.png,.jpg,.jpeg" /></div>
        <div className="field"><input type="text" placeholder="What changed? (optional)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
      <button type="button" className="btn btn-primary" onClick={uploadVersion}>Upload new version</button>

      <h2 style={{ fontSize: 15, margin: '22px 0 10px' }}>Compare versions</h2>
      <div className="toolbar">
        <select value={cmpA} onChange={(e) => setCmp({ ...cmp, a: Number(e.target.value), b: cmpB })}>
          {versions.map((v) => <option key={v.v} value={v.v}>v{v.v}</option>)}
        </select>
        <span className="muted">vs</span>
        <select value={cmpB} onChange={(e) => setCmp({ ...cmp, b: Number(e.target.value), a: cmpA })}>
          {versions.map((v) => <option key={v.v} value={v.v}>v{v.v}</option>)}
        </select>
        <button type="button" className="btn" onClick={() => setCmp({ a: cmpA, b: cmpB, shown: true })}>Compare</button>
      </div>
      <div className="compare">{compareView}</div>
    </Modal>
  );
}

/* ---------------- page ---------------- */
export default function Documents() {
  useData();
  const toast = useToast();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ q: '', type: '', category: '', folder: 'All', fav: false });
  const [uploadOpen, setUploadOpen] = useState(params.get('upload') === '1');
  const [shareId, setShareId] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const S = VS.getSession();
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const q = filters.q.trim().toLowerCase();
  const list = VS.visibleDocs().filter((d) => {
    if (q && d.name.toLowerCase().indexOf(q) === -1 && !d.tags.some((t) => t.toLowerCase().indexOf(q) !== -1)) return false;
    if (filters.type && d.type !== filters.type) return false;
    if (filters.category && d.category !== filters.category) return false;
    if (filters.folder !== 'All' && d.folder !== filters.folder) return false;
    if (filters.fav && !d.favorite) return false;
    return true;
  }).sort((a, b) => b.uploadedAt - a.uploadedAt);

  function toggleFavorite(id) {
    const docs = VS.getDocs();
    const d = docs.find((x) => x.id === id);
    d.favorite = !d.favorite;
    VS.saveDocs(docs);
  }

  function download(id) {
    const docs = VS.getDocs();
    const d = docs.find((x) => x.id === id);
    d.accessCount += 1;
    VS.saveDocs(docs);
    VS.addLog('Download', d.name + ' (v' + d.currentVersion + ')');
    demoDownload(d.name, 'Version: ' + d.currentVersion);
    toast('Download started (demo file)');
  }

  function remove(id) {
    const d = VS.getDocs().find((x) => x.id === id);
    if (!d) return;
    if (VS.getSubs().some((s) => s.docId === id && s.status === 'Approved')) {
      toast('This document is part of an approved submission and cannot be deleted', 'error');
      return;
    }
    if (!window.confirm('Delete "' + d.name + '", revoke its share links and withdraw any pending submission?')) return;
    const subs = VS.getSubs();
    subs.forEach((s) => {
      if (s.docId === id && s.status === 'Pending') {
        s.status = 'Withdrawn';
        s.history.push({ status: 'Withdrawn', by: S.name, at: Date.now(), remark: 'Document deleted' });
      }
    });
    VS.saveSubs(subs);
    VS.saveDocs(VS.getDocs().filter((x) => x.id !== id));
    VS.saveLinks(VS.getLinks().map((l) => (l.docId === id ? Object.assign({}, l, { active: false }) : l)));
    VS.addLog('Delete', d.name);
    toast('Document deleted');
  }

  return (
    <>
      <div className="note">
        🔒 <strong>Private vault.</strong> Only you can see these documents. Others get access to a file only when you
        submit it to a request or share it through a link, and you can see who accessed it in Activity &amp; Access.
      </div>

      <div className="toolbar">
        <input type="text" className="grow" placeholder="Search by file name or tag..." value={filters.q} onChange={(e) => setF('q', e.target.value)} />
        <select value={filters.type} onChange={(e) => setF('type', e.target.value)}>
          <option value="">All types</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="image">Image</option>
        </select>
        <select value={filters.category} onChange={(e) => setF('category', e.target.value)}>
          <option value="">All categories</option>
          {VS.CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button type="button" className={'chip ' + (filters.fav ? 'on' : '')} onClick={() => setF('fav', !filters.fav)}>★ Favorites</button>
        <button type="button" className="btn btn-primary" onClick={() => setUploadOpen(true)}>+ Upload</button>
      </div>

      <div className="chips">
        {['All'].concat(VS.FOLDERS).map((n) => (
          <span key={n} className={'chip ' + (filters.folder === n ? 'on' : '')} onClick={() => setF('folder', n)}>{n}</span>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th></th><th>Name</th><th>Type</th><th>Category</th><th>Tags</th><th>Size</th><th>Uploaded</th><th>Valid till</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const exp = VS.expiryInfo(d);
                return (
                  <tr key={d.id}>
                    <td><button type="button" className={'star ' + (d.favorite ? 'on' : '')} title="Favorite" onClick={() => toggleFavorite(d.id)}>★</button></td>
                    <td><div className="fname">{d.name}</div><div className="muted small">v{d.currentVersion} · {d.folder}</div></td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.category}</td>
                    <td>{d.tags.map((t) => <span key={t} className="tag">{t}</span>)}</td>
                    <td>{fmtSize(d.size)}</td>
                    <td>{fmtDate(d.uploadedAt)}</td>
                    <td>{exp ? <span className={'badge ' + exp.cls}>{exp.text}</span> : <span className="muted">-</span>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-sm" onClick={() => setShareId(d.id)}>Share</button>
                      <button type="button" className="btn btn-sm" onClick={() => setVersionId(d.id)}>Versions</button>
                      <button type="button" className="btn btn-sm" onClick={() => download(d.id)}>Download</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(d.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && <div className="empty">No documents match your search.</div>}
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
      {shareId && <ShareModal docId={shareId} onClose={() => setShareId(null)} />}
      {versionId && <VersionModal docId={versionId} onClose={() => setVersionId(null)} />}
    </>
  );
}
