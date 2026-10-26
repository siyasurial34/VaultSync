import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as VS from '../lib/store.js';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/documents', label: 'My Vault', icon: '▤' },
  { to: '/requests', label: 'Requests', icon: '✓' },
  { to: '/announcements', label: 'Announcements', icon: '✦' },
  { to: '/shared', label: 'Shared Links', icon: '⇄' },
  { to: '/activity', label: 'Activity & Access', icon: '☰' },
  { to: '/users', label: 'User Management', icon: '☺', roles: ['Admin'] }
];

export default function Layout({ children }) {
  const S = VS.getSession();
  const { pathname } = useLocation();
  const item = NAV.find((n) => pathname.startsWith(n.to));

  useEffect(() => { document.title = 'VaultSync - ' + (item ? item.label : ''); }, [item]);

  if (!S) return null;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Vault<span>Sync</span></div>
        <nav className="nav">
          {NAV.filter((n) => !n.roles || n.roles.indexOf(S.role) !== -1).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{S.name}</div>
          <div>{S.role} · {S.org}</div>
          <button type="button" className="btn btn-light btn-sm" onClick={VS.logout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{item ? item.label : ''}</h1>
          <div className="user-chip">
            <div className="avatar">{S.name.charAt(0).toUpperCase()}</div>
            <div><strong>{S.name}</strong><div className="muted small">{S.role}</div></div>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
