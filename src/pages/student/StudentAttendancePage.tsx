import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSchedulesByStudent } from '../../services/scheduleService';
import {
  getAllAttendanceSessions,
  getStudentAttendanceSummary,
  StudentAttendanceSummary,
} from '../../services/attendanceService';
import { Schedule, AttendanceSession } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { CalendarCheck, AlertTriangle, CheckCircle2, Clock, XCircle, ShieldAlert } from 'lucide-react';

interface SubjectAttendanceItem {
  schedule: Schedule;
  summary: StudentAttendanceSummary;
  recentSessions: { date: string; status: string; remarks?: string }[];
}

export const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [subjectItems, setSubjectItems] = useState<SubjectAttendanceItem[]>([]);
  const [overallSummary, setOverallSummary] = useState<StudentAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [user]);

  const loadAttendance = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myScheds, allSessions, overall] = await Promise.all([
        getSchedulesByStudent(user.uid),
        getAllAttendanceSessions(),
        getStudentAttendanceSummary(user.uid),
      ]);
      // Do not present the calculated 100% default as a real attendance record.
      setOverallSummary(overall.totalSessions > 0 ? overall : null);

      const items: SubjectAttendanceItem[] = await Promise.all(
        myScheds.map(async sched => {
          const summary = await getStudentAttendanceSummary(user.uid, sched.id);
          const schedSessions = allSessions.filter(s => s.scheduleId === sched.id);
          const history = schedSessions.map(s => {
            const rec = s.records[user.uid];
            return {
              date: s.date,
              status: rec?.status || 'unrecorded',
              remarks: rec?.remarks,
            };
          });

          return {
            schedule: sched,
            summary,
            recentSessions: history,
          };
        })
      );

      // Only show classes with an actual recorded attendance session.
      setSubjectItems(items.filter(item => item.recentSessions.length > 0));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Records & History"
        subtitle="Real-time attendance tracking per enrolled subject. Minimum institutional requirement is 75%."
        badge={
          overallSummary ? (
            <Badge variant={overallSummary.hasWarning ? 'danger' : 'success'}>
              Overall: {overallSummary.attendanceRate}%
            </Badge>
          ) : undefined
        }
      />

      {overallSummary?.hasWarning && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-sm">Low Attendance Warning Triggered</div>
            <p className="mt-0.5 leading-relaxed">
              One or more subjects have dropped below the institutional 75% attendance threshold. Please consult your instructors to submit formal excuse letters if applicable.
            </p>
          </div>
        </div>
      )}

      {/* Per Subject Breakdown */}
      <div className="space-y-4">
        {subjectItems.map(({ schedule, summary, recentSessions }) => (
          <div key={schedule.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#142D59]">{schedule.subjectCode}</span>
                  <Badge variant="navy">{schedule.sectionName}</Badge>
                </div>
                <h4 className="text-xs font-semibold text-slate-800 mt-0.5">{schedule.subjectTitle}</h4>
                <span className="text-[11px] text-slate-400">Instructor: {schedule.teacherName}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Rate</div>
                  <div
                    className={`text-lg font-extrabold ${
                      summary.hasWarning ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {summary.attendanceRate}%
                  </div>
                </div>
                {summary.hasWarning ? (
                  <Badge variant="danger">Low Attendance (&lt;75%)</Badge>
                ) : (
                  <Badge variant="success">Good Standing</Badge>
                )}
              </div>
            </div>

            {/* Attendance Metrics Counters */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Present</span>
                <span className="text-base font-extrabold text-emerald-700">{summary.presentCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Late</span>
                <span className="text-base font-extrabold text-amber-700">{summary.lateCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">Absent</span>
                <span className="text-base font-extrabold text-rose-700">{summary.absentCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Excused</span>
                <span className="text-base font-extrabold text-blue-700">{summary.excusedCount}</span>
              </div>
            </div>

            {/* Session Logs */}
            {recentSessions.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase text-slate-500">
                  Recorded Sessions Log
                </div>
                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {recentSessions.map((sess, idx) => (
                    <div key={idx} className="px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{sess.date}</span>
                      <div className="flex items-center gap-2">
                        {sess.remarks && <span className="text-slate-400 italic text-[11px]">"{sess.remarks}"</span>}
                        <span
                          className={`font-bold capitalize text-xs px-2 py-0.5 rounded ${
                            sess.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sess.status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : sess.status === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {subjectItems.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No attendance records logged for your classes.
          </div>
        )}
      </div>
    </div>
  );
};
