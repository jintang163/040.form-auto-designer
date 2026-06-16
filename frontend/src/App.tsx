import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import TemplateList from './pages/TemplateList';
import TemplateCreate from './pages/TemplateCreate';
import TemplatePreview from './pages/TemplatePreview';
import FormDataList from './pages/FormDataList';
import FormDataDetail from './pages/FormDataDetail';
import DataStatistics from './pages/DataStatistics';
import WebhookRules from './pages/WebhookRules';
import TenantManagement from './pages/TenantManagement';
import { useTenantStore } from './store/tenantStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useTenantStore((s) => s.isLoggedIn());
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const initializeTenant = useTenantStore((s) => s.initializeTenant);

  useEffect(() => {
    initializeTenant();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/templates" replace />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="templates/create" element={<TemplateCreate />} />
        <Route path="templates/:id/edit" element={<TemplateCreate />} />
        <Route path="templates/:id/preview" element={<TemplatePreview />} />
        <Route path="form-data" element={<FormDataList />} />
        <Route path="form-data/:templateId" element={<FormDataDetail />} />
        <Route path="statistics" element={<DataStatistics />} />
        <Route path="webhook-rules" element={<WebhookRules />} />
        <Route path="tenants" element={<TenantManagement />} />
      </Route>
    </Routes>
  );
}
