import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Loader2, School } from 'lucide-react';

// Layout & Guards
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { RoleGuard } from './components/guards/RoleGuard';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { InitialSetupPage } from './pages/auth/InitialSetupPage';

// 1. Registrar (Admin) Pages (6 Features)
import { RegistrarDashboard } from './pages/registrar/RegistrarDashboard';
import { UserManagementPage } from './pages/registrar/UserManagementPage';
import { StudentEnrollmentPage } from './pages/registrar/StudentEnrollmentPage';
import { ClassSchedulingPage } from './pages/registrar/ClassSchedulingPage';
import { ProgramSectionPage } from './pages/registrar/ProgramSectionPage';
import { RegistrarReportsPage } from './pages/registrar/RegistrarReportsPage';

// 2. Program Chair Pages (6 Features)
import { ChairDashboard } from './pages/chair/ChairDashboard';
import { ChairStudentManagePage } from './pages/chair/ChairStudentManagePage';
import { ChairClassAssignPage } from './pages/chair/ChairClassAssignPage';
import { ChairScheduleViewerPage } from './pages/chair/ChairScheduleViewerPage';
import { ChairStudentMonitorPage } from './pages/chair/ChairStudentMonitorPage';
import { ChairReportsPage } from './pages/chair/ChairReportsPage';

// 3. Teacher Pages (6 Features)
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { MyClassesPage } from './pages/teacher/MyClassesPage';
import { AttendanceManagePage } from './pages/teacher/AttendanceManagePage';
import { GradeManagePage } from './pages/teacher/GradeManagePage';
import { ActivitiesManagePage } from './pages/teacher/ActivitiesManagePage';
import { TeacherAnnouncementsPage } from './pages/teacher/TeacherAnnouncementsPage';

// 4. Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MySubjectsPage } from './pages/student/MySubjectsPage';
import { StudentSchedulePage } from './pages/student/StudentSchedulePage';
import { MyGradesPage } from './pages/student/MyGradesPage';
import { StudentAttendancePage } from './pages/student/StudentAttendancePage';
import { StudentActivitiesPage } from './pages/student/StudentActivitiesPage';
import { StudentLedgerPage } from './pages/student/StudentLedgerPage';
import { StudentChecklistPage } from './pages/student/StudentChecklistPage';

// Root Dispatcher
const RootRedirect: React.FC = () => {
  const { user, loading, hasRegistrar } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-[#142D59] flex items-center justify-center text-white shadow-xl shadow-navy-900/10">
            <School className="w-7 h-7 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#142D59] tracking-tight">AcademiaHub</h2>
            <p className="text-xs text-slate-500 font-medium">Connecting to Academic Management System...</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading portal</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to={hasRegistrar ? "/login" : "/setup"} replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  const roleRoutes: Record<string, string> = {
    registrar: '/registrar/dashboard',
    program_chair: '/chair/dashboard',
    teacher: '/teacher/dashboard',
    student: '/student/dashboard',
  };

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<InitialSetupPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Role Routes with AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* 1. Registrar (Admin) Routes */}
                <Route element={<RoleGuard allowedRoles={['registrar']} />}>
                  <Route path="/registrar/dashboard" element={<RegistrarDashboard />} />
                  <Route path="/registrar/users" element={<UserManagementPage />} />
                  <Route path="/registrar/enrollment" element={<StudentEnrollmentPage />} />
                  <Route path="/registrar/schedules" element={<ClassSchedulingPage />} />
                  <Route path="/registrar/programs-sections" element={<ProgramSectionPage />} />
                  <Route path="/registrar/reports" element={<RegistrarReportsPage />} />
                </Route>

                {/* 2. Program Chair Routes */}
                <Route element={<RoleGuard allowedRoles={['program_chair']} />}>
                  <Route path="/chair/dashboard" element={<ChairDashboard />} />
                  <Route path="/chair/students" element={<ChairStudentManagePage />} />
                  <Route path="/chair/schedules" element={<ChairClassAssignPage />} />
                  <Route path="/chair/schedule-viewer" element={<ChairScheduleViewerPage />} />
                  <Route path="/chair/monitoring" element={<ChairStudentMonitorPage />} />
                  <Route path="/chair/reports" element={<ChairReportsPage />} />
                </Route>

                {/* 3. Teacher Routes */}
                <Route element={<RoleGuard allowedRoles={['teacher']} />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/classes" element={<MyClassesPage />} />
                  <Route path="/teacher/attendance" element={<AttendanceManagePage />} />
                  <Route path="/teacher/grades" element={<GradeManagePage />} />
                  <Route path="/teacher/activities" element={<ActivitiesManagePage />} />
                  <Route path="/teacher/announcements" element={<TeacherAnnouncementsPage />} />
                </Route>

                {/* 4. Student Routes */}
                <Route element={<RoleGuard allowedRoles={['student']} />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/subjects" element={<MySubjectsPage />} />
                  <Route path="/student/schedule" element={<StudentSchedulePage />} />
                  <Route path="/student/grades" element={<MyGradesPage />} />
                  <Route path="/student/attendance" element={<StudentAttendancePage />} />
                  <Route path="/student/activities" element={<StudentActivitiesPage />} />
                  <Route path="/student/ledger" element={<StudentLedgerPage />} />
                  <Route path="/student/checklist" element={<StudentChecklistPage />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
