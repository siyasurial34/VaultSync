import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData, useBodyClass, useTitle } from '../lib/hooks.js';
import { useToast } from '../components/Toast.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMOS = [
  { label: 'Admin', email: 'admin@vaultsync.com', pass: 'admin123' },
  { label: 'Manager', email: 'manager@vaultsync.com', pass: 'manager123' },
  { label: 'User', email: 'user@vaultsync.com', pass: 'user123' }
];

export default function Login() {
  useData();
  useBodyClass('auth');
  useTitle('VaultSync - Login');
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [reg, setReg] = useState({ name: '', email: '', org: '', pass: '' });
  const [regMsg, setRegMsg] = useState('');

  if (VS.getSession()) return <Navigate to="/dashboard" replace />;

  function onLogin(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(loginEmail.trim()) || !loginPass) { setLoginMsg('Enter a valid email and password.'); return; }
    if (!VS.login(loginEmail.trim(), loginPass)) { setLoginMsg('Invalid email or password.'); return; }
    navigate('/dashboard', { replace: true });
  }

  // New accounts always get the "User" role
  function onRegister(e) {
    e.preventDefault();
    const name = reg.name.trim();
    const email = reg.email.trim().toLowerCase();
    const org = reg.org.trim() || 'Demo University';
    if (name.length < 2) { setRegMsg('Please enter your name.'); return; }
    if (!EMAIL_RE.test(email)) { setRegMsg('Enter a valid email address.'); return; }
    if (reg.pass.length < 6) { setRegMsg('Password must be at least 6 characters.'); return; }
    const users = VS.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) { setRegMsg('An account with this email already exists.'); return; }
    users.push({ id: VS.uid('u'), name: name, email: email, password: reg.pass, role: 'User', org: org });
    VS.saveUsers(users);
    VS.addLog('Register', 'New account created', email, 'org');
    setReg({ name: '', email: '', org: '', pass: '' });
    setRegMsg('');
    setLoginEmail(email);
    setLoginPass('');
    setTab('login');
    toast('Account created. Please log in.');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-intro">
        <h1>Vault<span>Sync</span></h1>
        <p>Secure document collection, verification and sharing for colleges, teams and organizations.</p>
        <ul>
          <li>A private vault for every person</li>
          <li>Document requests with approve / reject review</li>
          <li>Expiring, password-protected share links</li>
          <li>See exactly who accessed your documents</li>
        </ul>
      </div>

      <div className="auth-card">
        <div className="tabs">
          <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>Login</button>
          <button type="button" className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>Register</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={onLogin} noValidate>
            <div className="field">
              <label htmlFor="loginEmail">Email</label>
              <input type="email" id="loginEmail" placeholder="you@example.com" autoComplete="username"
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="loginPass">Password</label>
              <input type="password" id="loginPass" placeholder="Your password" autoComplete="current-password"
                value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Login</button>
            <div className="error-text">{loginMsg}</div>

            <div className="demo-box">
              <div className="muted small">Demo accounts (click to fill):</div>
              <br></br>
              {DEMOS.map((d) => (
                <span key={d.label} className="chip" onClick={() => { setLoginEmail(d.email); setLoginPass(d.pass); }}>{d.label}</span>
              ))}
            </div>
          </form>
        ) : (
          <form onSubmit={onRegister} noValidate>
            <div className="field">
              <label htmlFor="regName">Full name</label>
              <input type="text" id="regName" placeholder="Your name" value={reg.name}
                onChange={(e) => setReg({ ...reg, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="regEmail">Email</label>
              <input type="email" id="regEmail" placeholder="you@example.com" value={reg.email}
                onChange={(e) => setReg({ ...reg, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="regOrg">Organization</label>
              <input type="text" id="regOrg" placeholder="Demo University" value={reg.org}
                onChange={(e) => setReg({ ...reg, org: e.target.value })} />
              <div className="hint">Leave blank to join the demo organization.</div>
            </div>
            <div className="field">
              <label htmlFor="regPass">Password</label>
              <input type="password" id="regPass" placeholder="At least 6 characters" autoComplete="new-password"
                value={reg.pass} onChange={(e) => setReg({ ...reg, pass: e.target.value })} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Create account</button>
            <div className="error-text">{regMsg}</div>
          </form>
        )}
      </div>
    </div>
  );
}
