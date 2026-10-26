import { useState } from 'react';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { useToast } from '../components/Toast.jsx';

/* User Management (Admin only): add users, change roles, remove users. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['Admin', 'Manager', 'User'];

export default function Users() {
  useData();
  const S = VS.getSession();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', role: 'User' });
  const reqs = VS.getRequests();
  const users = VS.getUsers().filter((u) => u.org === S.org);

  function onAdd(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (name.length < 2) { toast('Enter the user\'s name', 'error'); return; }
    if (!EMAIL_RE.test(email)) { toast('Enter a valid email', 'error'); return; }
    const all = VS.getUsers();
    if (all.some((u) => u.email.toLowerCase() === email)) { toast('That email is already registered', 'error'); return; }
    all.push({ id: VS.uid('u'), name: name, email: email, password: 'welcome123', role: form.role, org: S.org });
    VS.saveUsers(all);
    VS.addLog('User Added', name + ' as ' + form.role, null, 'org');
    setForm({ name: '', email: '', role: 'User' });
    toast('User added');
  }

  function changeRole(id, role) {
    const all = VS.getUsers();
    const u = all.find((x) => x.id === id);
    u.role = role;
    VS.saveUsers(all);
    VS.addLog('Role Changed', u.name + ' is now ' + role, null, 'org');
    toast('Role updated');
  }

  function remove(u) {
    if (!window.confirm('Remove ' + u.name + '? Their documents will stay in the system.')) return;
    VS.saveUsers(VS.getUsers().filter((x) => x.id !== u.id));
    VS.addLog('User Removed', u.name, null, 'org');
    toast('User removed');
  }

  return (
    <>
      <div className="note">
        Admins manage <strong>accounts and roles</strong>, not personal files. Nobody, including the Admin, can browse another
        person's vault. Documents reach a reviewer only when the owner submits them to a request.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Add a user</h2>
        <form onSubmit={onAdd} noValidate>
          <div className="row" style={{ gridTemplateColumns: '1fr 1fr 160px auto', alignItems: 'end' }}>
            <div className="field" style={{ margin: 0 }}><label htmlFor="uName">Name</label>
              <input type="text" id="uName" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field" style={{ margin: 0 }}><label htmlFor="uEmail">Email</label>
              <input type="email" id="uEmail" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field" style={{ margin: 0 }}><label htmlFor="uRole">Role</label>
              <select id="uRole" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option>User</option><option>Manager</option><option>Admin</option>
              </select></div>
            <button className="btn btn-primary" type="submit">Add user</button>
          </div>
          <div className="hint">New users get the temporary password <strong>welcome123</strong>.</div>
        </form>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Organization</th><th>Role</th><th>Open requests</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.email === S.email;
                const open = reqs.filter((r) => r.assignees.indexOf(u.email) !== -1 && VS.needsAction(VS.statusFor(r, u.email))).length;
                return (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong>{isMe && <> <span className="badge b-brand">You</span></>}</td>
                    <td>{u.email}</td>
                    <td>{u.org}</td>
                    <td>
                      <select style={{ width: 130 }} value={u.role} disabled={isMe} onChange={(e) => changeRole(u.id, e.target.value)}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>{open}</td>
                    <td>{!isMe && <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(u)}>Remove</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
