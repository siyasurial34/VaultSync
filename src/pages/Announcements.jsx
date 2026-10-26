import { useState } from 'react';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { toDateInput } from '../lib/format.js';
import Modal from '../components/Modal.jsx';
import AnnouncementItem from '../components/AnnouncementItem.jsx';
import { useToast } from '../components/Toast.jsx';

/* Announcements board.
   Everyone logged in can read. Only Admin sees the create / edit / delete controls and the expired ones.
   The store enforces the same rule, so these buttons are a convenience, not the security. */

function AnnouncementForm({ editing, onClose }) {
  const toast = useToast();
  const L = VS.ANNOUNCEMENT_LIMITS;
  const [form, setForm] = useState({
    title: editing ? editing.title : '',
    message: editing ? editing.message : '',
    important: editing ? editing.important : false,
    expiresAt: editing && editing.expiresAt ? toDateInput(editing.expiresAt) : ''
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e) {
    e.preventDefault();
    try {
      if (editing) VS.updateAnnouncement(editing.id, form);
      else VS.createAnnouncement(form);
      toast(editing ? 'Announcement updated' : 'Announcement published');
      onClose();
    } catch (err) {
      if (err instanceof VS.ApiError) {
        setErrors(err.fields || {});
        if (!err.fields) toast(err.message, 'error');
      } else {
        throw err;
      }
    }
  }

  return (
    <Modal title={editing ? 'Edit announcement' : 'Create announcement'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="annTitle">Title</label>
          <input type="text" id="annTitle" maxLength={L.titleMax} placeholder="e.g. Fee receipt deadline"
            value={form.title} onChange={(e) => set('title', e.target.value)} />
          {errors.title && <div className="field-error">{errors.title}</div>}
        </div>
        <div className="field">
          <label htmlFor="annMessage">Message</label>
          <textarea id="annMessage" maxLength={L.messageMax} placeholder="What should everyone know?"
            value={form.message} onChange={(e) => set('message', e.target.value)} />
          <div className="hint">{form.message.length} / {L.messageMax}</div>
          {errors.message && <div className="field-error">{errors.message}</div>}
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="annExpiry">Expiry date (optional)</label>
            <input type="date" id="annExpiry" min={editing ? undefined : toDateInput(Date.now())}
              value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
            <div className="hint">
              Hidden from users after this date. Leave empty to keep it up.
              {editing && ' Pick a past date to take it down now.'}
            </div>
            {errors.expiresAt && <div className="field-error">{errors.expiresAt}</div>}
          </div>
          <div className="field">
            <label>Priority</label>
            <label className="checkline" htmlFor="annImportant">
              <input type="checkbox" id="annImportant" checked={form.important} onChange={(e) => set('important', e.target.checked)} />
              Mark as Important
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Publish'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Announcements() {
  useData();
  const S = VS.getSession();
  const toast = useToast();
  const isAdmin = S.role === 'Admin';
  const [filter, setFilter] = useState('all');          // Admin only: all | active | expired
  const [formState, setFormState] = useState(null);     // null | { editing: announcement | null }

  const all = VS.listAnnouncements();                   // non-admins only ever receive active ones
  const list = all.filter((a) => filter === 'all' || (filter === 'active' ? !a.expired : a.expired));
  const expiredCount = all.filter((a) => a.expired).length;

  function onDelete(a) {
    if (!window.confirm('Delete "' + a.title + '"? This cannot be undone.')) return;
    try {
      VS.deleteAnnouncement(a.id);
      toast('Announcement deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="ann-page">
      <div className="toolbar">
        <div className="grow muted">
          {isAdmin
            ? 'You publish announcements for the whole organization. Everyone can read them; only you can change them.'
            : 'Notices from your organization\'s Admin.'}
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setFormState({ editing: null })}>+ Create Announcement</button>
        )}
      </div>

      {isAdmin && (
        <div className="chips">
          {[['all', 'All (' + all.length + ')'], ['active', 'Active (' + (all.length - expiredCount) + ')'], ['expired', 'Expired (' + expiredCount + ')']].map(([k, label]) => (
            <span key={k} className={'chip ' + (filter === k ? 'on' : '')} onClick={() => setFilter(k)}>{label}</span>
          ))}
        </div>
      )}

      {list.length ? (
        <div className="ann-list">
          {list.map((a) => (
            <AnnouncementItem key={a.id} a={a} admin={isAdmin}
              onEdit={(item) => setFormState({ editing: item })} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="card empty">{isAdmin && filter !== 'all' ? 'Nothing in this view.' : 'No announcements right now.'}</div>
      )}

      {formState && <AnnouncementForm editing={formState.editing} onClose={() => setFormState(null)} />}
    </div>
  );
}
