import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import Protected from './components/Protected.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Requests from './pages/Requests.jsx';
import Announcements from './pages/Announcements.jsx';
import Shared from './pages/Shared.jsx';
import SharePage from './pages/SharePage.jsx';
import Activity from './pages/Activity.jsx';
import Users from './pages/Users.jsx';

// HashRouter keeps the URLs simple (#/dashboard) and needs no server configuration.
export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/documents" element={<Protected><Documents /></Protected>} />
          <Route path="/requests" element={<Protected><Requests /></Protected>} />
          <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
          <Route path="/shared" element={<Protected><Shared /></Protected>} />
          <Route path="/activity" element={<Protected><Activity /></Protected>} />
          <Route path="/users" element={<Protected roles={['Admin']}><Users /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
}
