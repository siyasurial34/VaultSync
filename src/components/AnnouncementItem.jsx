import { fmtDate } from '../lib/format.js';

/* One announcement. Used on the dashboard (compact, read-only) and on the Announcements page
   (full text; Admin also gets Edit / Delete and sees the expired state). */
export default function AnnouncementItem({ a, compact, admin, onEdit, onDelete }) {
  const expired = a.expired === true;
  return (
    <article className={'ann-item' + (a.important ? ' important' : '') + (expired ? ' expired' : '')}>
      <div className="ann-head">
        <h3 className="ann-title">{a.title}</h3>
        <div className="ann-badges">
          {a.important && <span className="badge b-bad">Important</span>}
          {expired && <span className="badge">Expired</span>}
        </div>
      </div>
      <p className={'ann-msg' + (compact ? ' clamp' : '')}>{a.message}</p>
      <div className="ann-meta">
        <span>Posted {fmtDate(a.createdAt)}</span>
        {a.expiresAt && <span>{expired ? 'Expired' : 'Expires'} {fmtDate(a.expiresAt)}</span>}
        {admin && (
          <span className="ann-actions">
            <button type="button" className="btn btn-sm" onClick={() => onEdit(a)}>Edit</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(a)}>Delete</button>
          </span>
        )}
      </div>
    </article>
  );
}
