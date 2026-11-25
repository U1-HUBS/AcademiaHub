import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { RoleBadge } from '../../components/ui/RoleBadge';
import { ButtonLink } from '../../components/ui/Button';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { getAllSchedules } from '../../services/scheduleService';
import { getAllEnrollments } from '../../services/enrollmentService';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardContent } from '../../components/ui/DashboardContent';
import { useDashboardData } from '../useDashboardData';

const loadDashboard = async () => {
  const [users, programs, schedules, enrollments] = await Promise.all([
    getAllUsers(),
    getAllPrograms(),
    getAllSchedules(),
    getAllEnrollments(),
  ]);
  return {
    users,
    programs,
    schedules,
    enrolledCount: enrollments.filter(record => record.status === 'enrolled' || record.status === 'regular').length,
  };
};

export const RegistrarDashboard: React.FC = () => {
  const { data, loading, failed, retry } = useDashboardData(loadDashboard);
  const { users = [], programs = [], schedules = [], enrolledCount = 0 } = data ?? {};

  const studentCount = users.filter(u => u.role === 'student' && u.status === 'active').length;
  const teacherCount = users.filter(u => u.role === 'teacher' && u.status === 'active').length;
  const chairCount = users.filter(u => u.role === 'program_chair' && u.status === 'active').length;
  const totalCapacity = schedules.reduce((sum, s) => sum + s.maxCapacity, 0);
  const totalEnrolledInClasses = schedules.reduce((sum, s) => sum + s.enrolledStudentIds.length, 0);
  const capacityRate = totalCapacity > 0 ? Math.round((totalEnrolledInClasses / totalCapacity) * 100) : 0;

  const recentUsers = [...users].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, 5);

  return (
    <div className="registrar-dashboard space-y-6">
      {/* Page Title & Action */}
      <PageHeader
        title="Registrar Dashboard"
        subtitle="Manage enrollment, accounts, programs, and class schedules."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-navy">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>Master Admin</span>
          </span>
        }
        actions={
          <>
            <ButtonLink to="/registrar/users" variant="outline" size="sm" icon={<UserPlus className="w-4 h-4" />}>
              Add User
            </ButtonLink>
          </>
        }
      />

      <DashboardContent loading={loading} failed={failed} onRetry={retry}>
        {/* KPI Stats Grid (8px grid: gap-6) */}
        <div className="grid gap-4 min-[360px]:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active Students"
            value={studentCount}
            subtitle={`${enrolledCount} officially enrolled`}
            icon={<Users className="w-5 h-5" />}
            color="navy"
            />
          <StatCard
            title="Faculty Instructors"
            value={teacherCount}
            subtitle={`${chairCount} Program Chairs`}
            icon={<GraduationCap className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Academic Programs"
            value={programs.length}
            subtitle="Institutional curricula"
            icon={<BookOpen className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Class Sections & Load"
            value={schedules.length}
            subtitle={totalCapacity ? `${capacityRate}% of seats filled` : 'No class capacity recorded'}
            icon={<CalendarDays className="w-5 h-5" />}
            color="amber"
          />
        </div>

        {/* Overview Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Programs Overview */}
          <section className="xl:col-span-5 portal-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div><h2 className="text-base font-bold text-navy">Academic Programs</h2><p className="mt-1 text-xs text-slate-600">Programs currently maintained by the registrar.</p></div>
              <Link to="/registrar/programs-sections" className="rounded text-sm font-semibold text-royal hover:underline">
                Manage
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {programs.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600">No academic programs yet.</p>}
              {programs.map(prog => (
                <div key={prog.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#142D59]">{prog.code}</span>
                    <Badge variant={prog.active ? "success" : "neutral"}>{prog.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="break-words text-sm text-slate-700">{prog.name}</p>
                  <span className="mt-0.5 text-xs text-slate-600">Chair: {prog.chairName || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recently Created Accounts Table */}
          <section className="xl:col-span-7 portal-panel flex min-w-0 flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-navy">Recently Provisioned Accounts</h2>
                <p className="mt-1 text-xs text-slate-600">The latest accounts created by the registrar.</p>
              </div>
              <Link to="/registrar/users" className="rounded text-sm font-semibold text-royal hover:underline">
                View All Users
              </Link>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200" role="region" aria-label="Recent accounts" tabIndex={0}>
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Recently provisioned accounts</caption>
                <thead className="border-b border-slate-200 bg-white text-navy uppercase font-semibold tracking-wide">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">User</th>
                    <th scope="col" className="py-2.5 px-3">ID Number</th>
                    <th scope="col" className="py-2.5 px-3">Role</th>
                    <th scope="col" className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-600">No accounts to show.</td></tr>}
                  {recentUsers.map(u => (
                    <tr key={u.uid} className="border-b border-slate-100 last:border-0 hover:bg-blue-50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{u.fullName}</div>
                        <div className="text-xs text-slate-600">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{u.idNumber}</td>
                      <td className="py-3 px-3">
                        <RoleBadge role={u.role} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DashboardContent>
    </div>
  );
};
