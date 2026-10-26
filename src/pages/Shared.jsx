import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { fmtDate } from '../lib/format.js';
import { copyText } from '../lib/download.js';
import { useToast } from '../components/Toast.jsx';

const BADGE = { active: 'b-ok', expired: 'b-bad', exhausted: 'b-warn', revoked: 'b-bad' };

export default function Shared() {
  useData();
  const toast = useToast();
  const links = VS.visibleLinks().sort((a, b) => b.createdAt - a.createdAt);

  function revoke(id) {
    if (!window.confirm('Revoke this link? It will stop working immediately.')) return;
    const all = VS.getLinks();
    const l = all.find((x) => x.id === id);
    l.active = false;
    VS.saveLinks(all);
    VS.addLog('Revoke Link', l.docName);
    toast('Link revoked');
  }

  return (
    <>
      <p className="muted" style={{ marginBottom: 14 }}>
        Links you created from your private vault. You decide who gets access, for how long and how many times. Create a new link from My Vault.
      </p>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Document</th><th>Type</th><th>Permission</th><th>Password</th><th>Expires</th><th>Downloads</th><th>Created by</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const st = VS.linkStatus(l);
                return (
                  <tr key={l.id}>
                    <td><div className="fname">{l.docName}</div></td>
                    <td>{l.type}</td>
                    <td>{l.permission === 'download' ? 'View + download' : 'View only'}</td>
                    <td>{l.password ? 'Yes' : 'No'}</td>
                    <td>{fmtDate(l.expiry)}</td>
                    <td>{l.downloads} / {l.maxDownloads}</td>
                    <td>{VS.nameOf(l.createdBy)}</td>
                    <td><span className={'badge ' + BADGE[st]}>{st.charAt(0).toUpperCase() + st.slice(1)}</span></td>
                    <td className="actions">
                      <button type="button" className="btn btn-sm" onClick={() => copyText(VS.shareUrl(l.token), () => toast('Link copied'), () => toast('Copy failed', 'error'))}>Copy link</button>
                      {st === 'active' && <button type="button" className="btn btn-sm btn-danger" onClick={() => revoke(l.id)}>Revoke</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!links.length && <div className="empty">No share links yet.</div>}
      </div>
    </>
  );
}
