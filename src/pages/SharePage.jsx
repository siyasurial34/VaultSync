import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData, useBodyClass, useTitle } from '../lib/hooks.js';
import { fmtDate, fmtSize } from '../lib/format.js';
import { demoDownload } from '../lib/download.js';
import { useToast } from '../components/Toast.jsx';

/* Public page opened from a share link (#/share/TOKEN).
   Validates the link (exists, active, not expired, limit, private, password) before showing the document.
   On the real system all of these checks run on the server.
   Every event is logged against the document OWNER so they can see who accessed their file. */

const BLOCKED_MSG = {
  expired: 'This link has expired.',
  exhausted: 'The download limit for this link has been reached.',
  revoked: 'This link was revoked by its owner.'
};

export default function SharePage() {
  useData();
  useBodyClass('share');
  useTitle('VaultSync - Shared Document');
  const { token } = useParams();
  const toast = useToast();
  const session = VS.getSession();
  const who = session ? session.email : 'Guest';
  const [unlocked, setUnlocked] = useState(false);
  const [opened, setOpened] = useState(false);     // stay on the document view after the last download is used
  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const logged = useRef(new Set());

  const link = VS.getLinks().find((l) => l.token === token);
  const doc = link ? VS.getDocs().find((d) => d.id === link.docId) : null;

  // Work out which screen to show
  let view;
  if (!link) view = { name: 'notfound' };
  else if (opened && doc) view = { name: 'doc' };
  else {
    const status = VS.linkStatus(link);
    if (status !== 'active') view = { name: 'blocked', status: status };
    else if (link.type === 'Private' && !session) view = { name: 'private' };
    else if (link.password && !unlocked) view = { name: 'password' };
    else if (!doc) view = { name: 'nodoc' };
    else view = { name: 'doc' };
  }

  // Record each outcome once per page visit (the ref also guards against React StrictMode's double effect)
  useEffect(() => {
    if (!link) return;
    const key = view.name + (view.status || '');
    if (logged.current.has(key)) return;
    logged.current.add(key);
    const log = (action, detail) => VS.addLog(action, detail, who, 'personal', link.createdBy);
    if (view.name === 'blocked') log('Failed Access', 'Blocked (' + view.status + '): ' + link.docName);
    else if (view.name === 'private') log('Failed Access', 'Private link opened without login: ' + link.docName);
    else if (view.name === 'doc') { setOpened(true); log('Share Access', 'Opened ' + link.docName); }
  });

  function onUnlock(e) {
    e.preventDefault();
    if (pw === link.password) { setUnlocked(true); setPwMsg(''); return; }
    VS.addLog('Failed Access', 'Wrong password for ' + link.docName, who, 'personal', link.createdBy);
    setPwMsg('Incorrect password.');
  }

  function onDownload() {
    const links = VS.getLinks();
    const l = links.find((x) => x.id === link.id);
    if (VS.linkStatus(l) !== 'active') { setOpened(false); toast('This link is no longer available', 'error'); return; }  // re-check before every download
    l.downloads += 1;
    VS.saveLinks(links);
    const docs = VS.getDocs();
    const d = docs.find((x) => x.id === l.docId);
    d.accessCount += 1;
    VS.saveDocs(docs);
    VS.addLog('Share Download', d.name + ' via link', who, 'personal', l.createdBy);
    demoDownload(d.name);
    toast('Download started (demo file)');
  }

  function problem(icon, title, msg) {
    return <><div className="big-icon">{icon}</div><h2>{title}</h2><p className="muted">{msg}</p></>;
  }

  let body;
  if (view.name === 'notfound') body = problem('⚠', 'Link not found', 'This link does not exist or has been removed.');
  else if (view.name === 'blocked') body = problem('⛔', 'Link unavailable', BLOCKED_MSG[view.status]);
  else if (view.name === 'nodoc') body = problem('⚠', 'Document unavailable', 'The shared document no longer exists.');
  else if (view.name === 'private') {
    body = (
      <>
        <div className="big-icon">🔒</div><h2>Private link</h2>
        <p className="muted">Only signed-in VaultSync users can open this link.</p>
        <RouterLink className="btn btn-primary" style={{ marginTop: 14 }} to="/login">Go to login</RouterLink>
      </>
    );
  } else if (view.name === 'password') {
    body = (
      <>
        <div className="big-icon">🔑</div><h2>Password required</h2>
        <p className="muted">Enter the password to open this document.</p>
        <form onSubmit={onUnlock} style={{ marginTop: 14 }}>
          <input type="password" placeholder="Password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="error-text">{pwMsg}</div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} type="submit">Unlock</button>
        </form>
      </>
    );
  } else {
    const canDownload = link.permission === 'download';
    body = (
      <>
        <div className="big-icon">📄</div><h2>{doc.name}</h2>
        <p className="muted">Shared by {doc.ownerName}</p>
        <div className="share-meta">
          <div><span className="muted">Size</span><span>{fmtSize(doc.size)}</span></div>
          <div><span className="muted">Link expires</span><span>{fmtDate(link.expiry)}</span></div>
          <div><span className="muted">Downloads left</span><span>{Math.max(0, link.maxDownloads - link.downloads)} of {link.maxDownloads}</span></div>
          <div><span className="muted">Permission</span><span>{canDownload ? 'View + download' : 'View only'}</span></div>
        </div>
        {canDownload
          ? <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onDownload}>Download</button>
          : <div className="badge b-warn">Download is disabled for this link</div>}
      </>
    );
  }

  return (
    <div className="share-card">
      <div className="share-brand">VaultSync</div>
      {body}
    </div>
  );
}
