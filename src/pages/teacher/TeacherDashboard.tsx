import React, { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { getSchedulesByTeacher } from '../../services/scheduleService';
import { getAllAssessments, getAllSubmissions } from '../../services/assessmentService';
import { getAllAnnouncements } from '../../services/announcementService';
import { GraduationCap, Users, CalendarCheck, FileCheck, Clock, MapPin, Plus, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardContent } from '../../components/ui/DashboardContent';
import { useDashboardData } from '../useDashboardData';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const loadDashboard = useCallback(async () => {
    if (!uid) return;
    const [schedules, assessments, submissions, announcements] = await Promise.all([
      getSchedulesByTeacher(uid),
      getAllAssessments(),
      getAllSubmissions(),
      getAllAnnouncements(),
    ]);
    const scheduleIds = new Set(schedules.map(schedule => schedule.id));
    return {
      schedules,
      assessments: assessments.filter(item => scheduleIds.has(item.scheduleId) || item.createdBy === uid),
      submissions: submissions.filter(item => scheduleIds.has(item.scheduleId)),
      announcements: announcements.filter(item => item.authorId === uid || (item.scheduleId && scheduleIds.has(item.scheduleId))),
    };
  }, [uid]);

  const { data, loading, failed, retry } = useDashboardData(loadDashboard);
  const { schedules = [], assessments = [], submissions = [], announcements = [] } = data ?? {};

  const totalStudents = schedules.reduce((acc, s) => acc + s.enrolledStudentIds.length, 0);
  const pendingGradingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        variant="dashboard"
        title="Faculty Dashboard"
        subtitle={`Welcome back, ${user?.fullName || 'Faculty Member'}`}
        badge={<Badge variant="navy">Faculty Portal</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to="/teacher/attendance" variant="primary" size="sm" icon={<CalendarCheck className="w-4 h-4" />}>
              Record Attendance
            </ButtonLink>
            <ButtonLink to="/teacher/activities" variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
              New Assessment
            </ButtonLink>
          </div>
        }
      />

      <DashboardContent loading={loading} failed={failed} onRetry={retry}>
        {/* KPI Cards Grid */}
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            title="Assigned Classes"
            value={schedules.length}
            subtitle="Course Sections"
            icon={<GraduationCap className="w-5 h-5" />}
            color="navy"
          />
          <StatCard
            title="Total Students"
            value={totalStudents}
            subtitle="Under Instruction"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Pending Submissions"
            value={pendingGradingCount}
            subtitle="Awaiting Grading"
            icon={<FileCheck className="w-5 h-5" />}
            color={pendingGradingCount > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Course Activities"
            value={assessments.length}
            subtitle="Quizzes & Projects"
            icon={<CalendarCheck className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Schedules & Activities Overview */}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Assigned Classes */}
          <div className="xl:col-span-2">
            <Card className="portal-panel flex h-full flex-col">
              <CardHeader className="min-w-0 flex-wrap gap-3 p-4 sm:p-5">
                <div>
                  <CardTitle>My Active Classes & Schedule</CardTitle>
                  <CardDescription>Official teaching assignments & student loads</CardDescription>
                </div>
                <Link to="/teacher/classes" className="rounded text-sm font-semibold text-primary-light hover:underline">
                  View Class Rosters →
                </Link>
              </CardHeader>

              <CardContent className="space-y-3 p-4 sm:p-5">
                {schedules.map(sc => (
                  <div
                    key={sc.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-blue-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#142D59]">{sc.subjectCode}</span>
                        <Badge variant="navy">{sc.sectionName}</Badge>
                        <span className="text-xs text-slate-500 font-medium">{sc.units || 3} Units</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800">{sc.subjectTitle}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {sc.startTime} - {sc.endTime} ({sc.days.join(', ')})
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {sc.room}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center md:flex-col md:items-end justify-between gap-2.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                      <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        {sc.enrolledStudentIds.length} Enrolled
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <ButtonLink to="/teacher/attendance" variant="outline" size="sm">Attendance</ButtonLink>
                        <ButtonLink to="/teacher/grades" variant="primary" size="sm">Grades</ButtonLink>
                      </div>
                    </div>
                  </div>
                ))}

                {schedules.length === 0 && (
                  <div className="p-8 text-center text-sm leading-relaxed text-slate-600">
                    No classes currently assigned by the Registrar.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Announcements */}
          <div>
            <Card className="h-full flex flex-col justify-between">
              <CardHeader className="min-w-0 flex-wrap gap-3 p-4 sm:p-5">
                <div>
                  <CardTitle>Class Notices</CardTitle>
                  <CardDescription>Active course advisories</CardDescription>
                </div>
                <Link to="/teacher/announcements" className="rounded text-sm font-semibold text-primary-light hover:underline">
                  Manage →
                </Link>
              </CardHeader>

              <CardContent className="space-y-3 p-4 sm:p-5">
                {announcements.slice(0, 3).map(anc => (
                  <div key={anc.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#142D59] truncate">{anc.title}</span>
                      <Badge variant={anc.priority === 'urgent' ? 'danger' : anc.priority === 'important' ? 'warning' : 'info'} size="sm">
                        {anc.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{anc.content}</p>
                    <span className="block pt-1 text-xs text-slate-600">
                      {new Date(anc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <div className="p-8 text-center text-sm leading-relaxed text-slate-600">No active notices.</div>
                )}
              </CardContent>

              <div className="mt-auto p-4 pt-0 sm:p-5 sm:pt-0">
                <ButtonLink to="/teacher/announcements" variant="outline" size="sm" className="w-full" icon={<Megaphone className="w-4 h-4" />}>
                  Post Class Announcement
                </ButtonLink>
              </div>
            </Card>
          </div>
        </div>
      </DashboardContent>
    </div>
  );
};
