import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TemplateList from './pages/TemplateList';
import TemplateCreate from './pages/TemplateCreate';
import TemplatePreview from './pages/TemplatePreview';
import FormDataList from './pages/FormDataList';
import FormDataDetail from './pages/FormDataDetail';
import DataStatistics from './pages/DataStatistics';
import WebhookRules from './pages/WebhookRules';
import TenantManagement from './pages/TenantManagement';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
