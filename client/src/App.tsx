import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { PageLoader } from '@/components/ui/Spinner';

// Route-level code splitting: each page (and heavy deps like Recharts) loads on demand.
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'));
const NewPlanPage = lazy(() => import('@/pages/student/NewPlanPage'));
const MyPlansPage = lazy(() => import('@/pages/student/MyPlansPage'));
const PlanDetailPage = lazy(() => import('@/pages/student/PlanDetailPage'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const TeacherStudentPage = lazy(() => import('@/pages/teacher/TeacherStudentPage'));
const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'));

/**
 * Routes:
 *   /login                       public
 *   /, /plans, /plans/new, /plans/:id          student
 *   /teacher, /teacher/students/:id            teacher
 *   /admin                                     admin
 *   *                                          404
 * Anonymous users are sent to /login; wrong-role users to their own home.
 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route element={<ProtectedRoute roles={['student']} />}>
              <Route index element={<StudentDashboard />} />
              <Route path="plans" element={<MyPlansPage />} />
              <Route path="plans/new" element={<NewPlanPage />} />
              <Route path="plans/:id" element={<PlanDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['teacher']} />}>
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/students/:id" element={<TeacherStudentPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="admin" element={<AdminPanel />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
