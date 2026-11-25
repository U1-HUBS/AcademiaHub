import React, { useEffect, useState } from 'react';
import { Award, Bell, CheckCircle2, GraduationCap, Megaphone, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getStudentCurriculumProgress } from '../../services/checklistService';
import type { CurriculumProgressSummary } from '../../services/checklistService';
import { getGradesByStudent, getAcademicAwardStatus } from '../../services/gradeService';
import { getStudentCredentialRequirements, getStudentWorkflowRequests } from '../../services/registrarWorkflowService';
import { getAnnouncementsForUser } from '../../services/announcementService';
import { getSchedulesByStudent } from '../../services/scheduleService';
import type { Announcement, CredentialRequirement, RegistrarWorkflowRequest, StudentGrade } from '../../types';

export const StudentProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<CurriculumProgressSummary | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [requests, setRequests] = useState<RegistrarWorkflowRequest[]>([]);
  const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) return; void (async () => {
    setLoading(true);
    try {
      const schedules = await getSchedulesByStudent(user.uid);
      const [nextProgress, nextGrades, nextRequests, nextCredentials, nextAnnouncements] = await Promise.all([
        getStudentCurriculumProgress(user.uid, user.programCode || 'BSCS'), getGradesByStudent(user.uid),
        getStudentWorkflowRequests(user.uid), getStudentCredentialRequirements(user.uid),
        getAnnouncementsForUser({uid: user.uid, role: user.role, programId: user.programId, enrolledScheduleIds: schedules.map(s => s.id)}),
      ]);
      setProgress(nextProgress); setGrades(nextGrades); setRequests(nextRequests); setCredentials(nextCredentials); setAnnouncements(nextAnnouncements);
    } finally { setLoading(false); }
  })(); }, [user]);

  const award = getAcademicAwardStatus(grades);
  const failed = progress?.subjects.filter(item => item.status === 'failed').length || 0;
  const missing = credentials.filter(item => item.status !== 'verified').length;
  const eligible = Boolean(progress && progress.remainingUnits === 0 && failed === 0 && missing === 0);
  const notices = [
    ...requests.filter(item => item.status !== 'submitted').map(item => ({id: `request-${item.id}`, icon: <Bell className="size-4" />, title: item.title, body: `Request status: ${item.status.replaceAll('_', ' ')}`, date: item.updatedAt})),
    ...credentials.filter(item => item.status !== 'verified').map(item => ({id: `credential-${item.id}`, icon: <ShieldAlert className="size-4" />, title: 'Credential requirement', body: `${item.requirement} is still ${item.status}.`, date: item.updatedAt})),
    ...announcements.slice(0, 5).map(item => ({id: `announcement-${item.id}`, icon: <Megaphone className="size-4" />, title: item.title, body: item.content, date: item.createdAt})),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return <div className="space-y-6">
    <PageHeader title="Academic Progress" subtitle="Monitor curriculum completion, awards, graduation readiness, and official notices." />
    {loading ? <Card><CardContent><p role="status" className="py-8 text-center text-sm text-slate-600">Loading academic progress…</p></CardContent></Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Curriculum progress</p><p className="mt-2 text-2xl font-bold text-primary">{progress?.progressPercentage || 0}%</p><p className="mt-1 text-sm text-slate-600">{progress?.completedUnits || 0} of {progress?.totalCurriculumUnits || 0} earned units</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Remaining units</p><p className="mt-2 text-2xl font-bold text-primary">{progress?.remainingUnits || 0}</p><p className="mt-1 text-sm text-slate-600">Failed units are not counted as earned</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Graduation status</p><p className="mt-2 text-xl font-bold text-primary">{eligible ? 'Eligible' : 'Needs review'}</p><p className="mt-1 text-sm text-slate-600">{failed} failed · {missing} missing credentials</p></CardContent></Card>
        <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Academic award</p><p className="mt-2 text-xl font-bold text-primary">{award.label}</p><p className="mt-1 text-sm text-slate-600">{award.reason}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Graduation readiness</CardTitle><p className="mt-1 text-sm text-slate-600">Eligibility requires completed curriculum and clear requirements.</p></div><GraduationCap className="size-5 text-royal" aria-hidden="true" /></div></CardHeader><CardContent><div className="space-y-3 text-sm"><div className="flex justify-between border-b border-slate-100 pb-3"><span>Required subjects completed</span><Badge variant={progress?.remainingUnits === 0 ? 'success' : 'warning'}>{progress?.remainingUnits === 0 ? 'Complete' : `${progress?.remainingUnits} units left`}</Badge></div><div className="flex justify-between border-b border-slate-100 pb-3"><span>Failed subjects</span><Badge variant={failed === 0 ? 'success' : 'danger'}>{failed}</Badge></div><div className="flex justify-between"><span>Credentials and clearance</span><Badge variant={missing === 0 ? 'success' : 'warning'}>{missing === 0 ? 'Complete' : `${missing} missing`}</Badge></div></div></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Academic awards</CardTitle><p className="mt-1 text-sm text-slate-600">Based on verified grades, completed units, and no failed subjects.</p></div><Award className="size-5 text-royal" aria-hidden="true" /></div></CardHeader><CardContent>{award.awards.length ? <div className="space-y-2">{award.awards.map(item => <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-primary"><CheckCircle2 className="size-4 text-royal" />{item}</div>)}</div> : <p className="text-sm text-slate-600">No award is currently qualified.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Notifications & announcements</CardTitle><p className="mt-1 text-sm text-slate-600">Updates from the Registrar and school administration.</p></div><Bell className="size-5 text-royal" aria-hidden="true" /></div></CardHeader><CardContent>{notices.length ? <div className="divide-y divide-slate-100">{notices.map(item => <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="mt-0.5 text-royal" aria-hidden="true">{item.icon}</span><div className="min-w-0"><p className="font-semibold text-primary">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.body}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</p></div></div>)}</div> : <p className="py-6 text-center text-sm text-slate-600">No new notifications.</p>}</CardContent></Card>
    </>}
  </div>;
};
