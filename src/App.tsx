import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { SecretaryDashboard } from './pages/SecretaryDashboard';
import { PatientSecretaryDashboard } from './pages/PatientSecretaryDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import './index.css';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'secretaria' | 'medico' | 'secretaria_pacientes' }) {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile?.role !== allowedRole) {
    // If they are logged in but don't have the right role, send to their correct dashboard
    if (profile?.role === 'secretaria') return <Navigate to="/secretaria" replace />;
    if (profile?.role === 'secretaria_pacientes') return <Navigate to="/secretaria_pacientes" replace />;
    if (profile?.role === 'medico') return <Navigate to="/medico" replace />;
    return <div className="p-8 text-center">Perfil inválido.</div>;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { profile, session, isLoading } = useAuth();
  
  if (isLoading) {
     return <div className="min-h-screen bg-slate-50"></div>;
  }

  // Redirect based on role
  let redirectUrl = "/secretaria";
  if (profile?.role === 'medico') redirectUrl = "/medico";
  if (profile?.role === 'secretaria_pacientes') redirectUrl = "/secretaria_pacientes";

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={redirectUrl} replace /> : <Login />} />
      
      <Route path="/secretaria" element={
        <ProtectedRoute allowedRole="secretaria">
          <SecretaryDashboard />
        </ProtectedRoute>
      } />

      <Route path="/secretaria_pacientes" element={
        <ProtectedRoute allowedRole="secretaria_pacientes">
          <PatientSecretaryDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/medico" element={
        <ProtectedRoute allowedRole="medico">
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
