import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ChallansPage } from '@/pages/ChallansPage';
import { CreateChallanPage } from '@/pages/CreateChallanPage';
import { ChallanDetailPage } from '@/pages/ChallanDetailPage';
import { UsersPage } from '@/pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — all authenticated roles */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />

              {/* Customers */}
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              {/* Products */}
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />

              {/* Challans — view for all roles */}
              <Route path="/challans" element={<ChallansPage />} />
              <Route path="/challans/:id" element={<ChallanDetailPage />} />
            </Route>

            {/* Protected — Admin + Sales can create challans */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES']} />}>
              <Route path="/challans/new" element={<CreateChallanPage />} />
            </Route>

            {/* Protected — Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
