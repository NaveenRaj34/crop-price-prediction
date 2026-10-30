import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from '@/routes/guards';
import AppLayout from '@/layouts/AppLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import CropsPage from '@/pages/CropsPage';
import MarketsPage from '@/pages/MarketsPage';
import PricesPage from '@/pages/PricesPage';
import PredictPage from '@/pages/PredictPage';
import PredictionHistoryPage from '@/pages/PredictionHistoryPage';
import MarketComparePage from '@/pages/MarketComparePage';
import ReportsPage from '@/pages/ReportsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import DatasetManagementPage from '@/pages/DatasetManagementPage';
import ModelManagementPage from '@/pages/ModelManagementPage';
import NotFoundPage from '@/pages/NotFoundPage';

function WithLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth routes — redirect if already logged in */}
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected user routes */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<WithLayout><DashboardPage /></WithLayout>} />
            <Route path="/crops" element={<WithLayout><CropsPage /></WithLayout>} />
            <Route path="/markets" element={<WithLayout><MarketsPage /></WithLayout>} />
            <Route path="/prices" element={<WithLayout><PricesPage /></WithLayout>} />
            <Route path="/predict" element={<WithLayout><PredictPage /></WithLayout>} />
            <Route path="/predictions" element={<WithLayout><PredictionHistoryPage /></WithLayout>} />
            <Route path="/compare" element={<WithLayout><MarketComparePage /></WithLayout>} />
            <Route path="/reports" element={<WithLayout><ReportsPage /></WithLayout>} />
            <Route path="/profile" element={<WithLayout><ProfilePage /></WithLayout>} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<WithLayout><AdminDashboardPage /></WithLayout>} />
            <Route path="/admin/datasets" element={<WithLayout><DatasetManagementPage /></WithLayout>} />
            <Route path="/admin/models" element={<WithLayout><ModelManagementPage /></WithLayout>} />
          </Route>

          {/* Fallback */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
