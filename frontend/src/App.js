import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login        from './pages/Login';
import Layout       from './components/Layout';
import Dashboard    from './pages/Dashboard';
import Patients     from './pages/Patients';
import Appointments from './pages/Appointments';
import Doctors      from './pages/Doctors';
import Beds         from './pages/Beds';
import Billing      from './pages/Billing';
import Pharmacy     from './pages/Pharmacy';
import LabReports   from './pages/LabReports';

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } }
});

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hms_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('hms_token'));

  const signIn = ({ user: nextUser, token: nextToken }) => {
    localStorage.setItem('hms_token', nextToken);
    localStorage.setItem('hms_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const signOut = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, token, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

function Protected() {
  const { token } = useAuth();
  return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/patients"     element={<Patients />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/doctors"      element={<Doctors />} />
              <Route path="/beds"         element={<Beds />} />
              <Route path="/billing"      element={<Billing />} />
              <Route path="/pharmacy"     element={<Pharmacy />} />
              <Route path="/lab"          element={<LabReports />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
