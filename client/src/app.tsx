import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireRole } from './auth/guards';
import Layout from './components/Layout';
import PlazaOverviewPage from './pages/PlazaOverviewPage/PlazaOverviewPage';
import HomePage from './pages/HomePage/HomePage';
import MyDemandPage from './pages/MyDemandPage/MyDemandPage';
import DemandDetailPage from './pages/DemandDetailPage/DemandDetailPage';
import MergedCategoryListPage from './pages/MergedCategoryListPage/MergedCategoryListPage';
import MergedDemandPage from './pages/MergedDemandPage/MergedDemandPage';
import RuleManagementPage from './pages/RuleManagementPage/RuleManagementPage';
import NotFound from './pages/NotFound/NotFound';
import { AdminUsersPage } from './pages/AdminUsersPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlazaOverviewPage />} />
        <Route path="category/:categoryId" element={<HomePage />} />
        <Route path="my-demands" element={<MyDemandPage />} />
        <Route path="demand/:id" element={<DemandDetailPage />} />
        <Route path="merged-demands" element={<MergedCategoryListPage />} />
        <Route
          path="merged-demands/:categoryId"
          element={<MergedDemandPage />}
        />
        <Route path="rule-plaza" element={<Navigate to="/" replace />} />
        <Route path="rule-management" element={<RuleManagementPage />} />
        <Route element={<RequireRole roles={['super_admin']} />}>
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default RoutesComponent;
