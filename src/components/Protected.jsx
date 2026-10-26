import { Navigate } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import Layout from './Layout.jsx';

// Wraps a page: requires login, optionally restricts by role, and adds the sidebar/top bar.
export default function Protected({ roles, children }) {
  useData();
  const S = VS.getSession();
  if (!S) return <Navigate to="/login" replace />;
  if (roles && roles.indexOf(S.role) === -1) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}
