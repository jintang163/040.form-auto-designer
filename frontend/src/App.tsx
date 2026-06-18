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
import ApprovalCenter from './pages/ApprovalCenter';
import CollaborationFill from './pages/CollaborationFill';
import FieldPermissionConfig from './pages/FieldPermissionConfig';
import PrintTemplateManage from './pages/PrintTemplateManage';
import { useTenantStore } from './store/tenantStore';
import { I18nProvider } from './contexts/I18nContext';

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
    <I18nProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/share/:shareCode" element={<CollaborationFill />} />
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
          <Route path="form-data/:id" element={<FormDataDetail />} />
          <Route path="statistics" element={<DataStatistics />} />
          <Route path="webhook-rules" element={<WebhookRules />} />
          <Route path="tenants" element={<TenantManagement />} />
          <Route path="approval" element={<ApprovalCenter />} />
          <Route path="field-permissions" element={<FieldPermissionConfig />} />
          <Route path="print-templates" element={<PrintTemplateManage />} />
        </Route>
      </Routes>
    </I18nProvider>
  );
}
