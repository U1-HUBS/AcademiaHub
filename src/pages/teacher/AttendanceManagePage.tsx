import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { getSchedulesByTeacher } from '../../services/scheduleService';
import { getAllUsers } from '../../services/userService';
import {
  getAttendanceBySchedule,
  saveAttendanceSession,
  getStudentAttendanceSummary,
} from '../../services/attendanceService';
import { Schedule, UserProfile, AttendanceSession, AttendanceStatus } from '../../types';
import { CalendarCheck, Save, CheckCircle2, XCircle, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

export const AttendanceManagePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [records, setRecords] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [studentStats, setStudentStats] = useState<Record<string, { rate: number; warning: boolean }>>({});
  const [pastSessions, setPastSessions] = useState<AttendanceSession[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadTeacherSchedules();
  }, [user]);

  const loadTeacherSchedules = async () => {
    if (!user) return;
    try {
      const myScheds = await getSchedulesByTeacher(user.uid);
      setSchedules(myScheds);
      if (myScheds.length > 0) {
        setSelectedSchedule(myScheds[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load schedules:', err);
    }
  };

  useEffect(() => {
    if (selectedSchedule) {
      loadClassAttendance();
    }
  }, [selectedSchedule, date]);

  const loadClassAttendance = async () => {
    if (!selectedSchedule) return;
    try {
      const [allUsers, sessions] = await Promise.all([
        getAllUsers(),
        getAttendanceBySchedule(selectedSchedule.id),
      ]);

      const classStudents = allUsers.filter(u => selectedSchedule.enrolledStudentIds.includes(u.uid));
      setStudents(classStudents);
      setPastSessions(sessions);

      // Check if session exists for selected date
      const existing = sessions.find(s => s.date === date);
      const recs: Record<string, { status: AttendanceStatus; remarks: string }> = {};

      if (existing) {
        setTopic(existing.topic || '');
        for (const st of classStudents) {
          const entry = existing.records[st.uid];
          recs[st.uid] = {
            status: entry?.status || 'present',
            remarks: entry?.remarks || '',
          };
        }
      } else {
        setTopic('');
        for (const st of classStudents) {
          recs[st.uid] = { status: 'present', remarks: '' };
        }
      }
      setRecords(recs);

      // Load attendance rate summary
      const statsMap: Record<string, { rate: number; warning: boolean }> = {};
      await Promise.all(
        classStudents.map(async st => {
          const summary = await getStudentAttendanceSummary(st.uid, selectedSchedule.id);
          statsMap[st.uid] = { rate: summary.attendanceRate, warning: summary.hasWarning };
        })
      );
      setStudentStats(statsMap);
    } catch (err: any) {
      console.warn('Error loading attendance session:', err);
    }
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const setStudentRemarks = (studentId: string, remarks: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: typeof records = {};
    for (const st of students) {
      updated[st.uid] = {
        status: 'present',
        remarks: records[st.uid]?.remarks || '',
      };
    }
    setRecords(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSchedule || !user) return;
    setIsSubmitting(true);
    try {
      const entries: Record<string, any> = {};
      for (const st of students) {
        entries[st.uid] = {
          studentId: st.uid,
          studentName: st.fullName,
          studentIdNumber: st.idNumber,
          status: records[st.uid]?.status || 'present',
          remarks: records[st.uid]?.remarks || '',
        };
      }

      await saveAttendanceSession({
        scheduleId: selectedSchedule.id,
        subjectCode: selectedSchedule.subjectCode,
        sectionName: selectedSchedule.sectionName,
        date,
        topic,
        takenBy: user.uid,
        takenByName: user.fullName,
        records: entries,
      });

      success(`Attendance for ${selectedSchedule.subjectCode} (${date}) saved.`);
      await loadClassAttendance();
    } catch (err: any) {
      error(err.message || 'Failed to save attendance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Class Attendance Management"
        subtitle="Record, mark, and track student session attendance and auto-calculated attendance rates."
        badge={<Badge variant="navy">{selectedSchedule ? `${selectedSchedule.subjectCode} - ${selectedSchedule.sectionName}` : 'Select Class'}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              Mark All Present
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAttendance}
              isLoading={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              Save Attendance
            </Button>
          </div>
        }
      />

      {/* Control Bar: Class & Date Selection */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Select Class Schedule"
          value={selectedSchedule?.id || ''}
          onChange={e => {
            const found = schedules.find(s => s.id === e.target.value);
            setSelectedSchedule(found || null);
          }}
        >
          {schedules.map(sc => (
            <option key={sc.id} value={sc.id}>
              {sc.subjectCode} - {sc.sectionName} ({sc.room})
            </option>
          ))}
        </Select>

        <Input
          label="Session Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <Input
          label="Session Topic / Lesson"
          placeholder="e.g. Chapter 4: Array Algorithms"
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
      </div>

      {/* Attendance Roster Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-[#142D59]">
              Class Attendance Register: {selectedSchedule?.subjectCode} ({selectedSchedule?.sectionName})
            </h3>
            <span className="text-xs text-slate-400">Date: {date}</span>
          </div>
          <span className="text-xs font-semibold text-slate-700">{students.length} Students</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Student Name & ID</th>
                <th className="py-3 px-4">Historical Rate</th>
                <th className="py-3 px-4 text-center">Status Selection</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(st => {
                const current = records[st.uid] || { status: 'present', remarks: '' };
                const stat = studentStats[st.uid];

                return (
                  <tr key={st.uid} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{st.fullName}</div>
                      <div className="text-xs text-slate-400 font-mono">{st.idNumber}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {stat ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-extrabold text-xs px-2 py-0.5 rounded ${
                              stat.warning ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {stat.rate}%
                          </span>
                          {stat.warning && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              &lt;75%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(st.uid, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            current.status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(st.uid, 'late')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            current.status === 'late'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(st.uid, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            current.status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(st.uid, 'excused')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            current.status === 'excused'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={current.remarks}
                        onChange={e => setStudentRemarks(st.uid, e.target.value)}
                        placeholder="Reason or notes..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563EB]"
                      />
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                    No students currently assigned to this class section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
