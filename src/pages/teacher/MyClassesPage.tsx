import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSchedulesByTeacher } from '../../services/scheduleService';
import { getAllUsers } from '../../services/userService';
import { Schedule, UserProfile } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { GraduationCap, Users, Clock, MapPin, Mail, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    loadClasses();
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const isScheduleInProgress = (schedule: Schedule) => {
    const day = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    if (!schedule.days.includes(day)) return false;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return now >= start && now < end;
  };

  const loadClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myScheds, allUsers] = await Promise.all([
        getSchedulesByTeacher(user.uid),
        getAllUsers(),
      ]);
      setSchedules(myScheds);
      setStudents(allUsers.filter(u => u.role === 'student'));

      if (myScheds.length > 0) {
        setSelectedSchedule(myScheds.find(isScheduleInProgress) || myScheds[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const classStudents = selectedSchedule
    ? students.filter(s => selectedSchedule.enrolledStudentIds.includes(s.uid))
    : [];

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="My Assigned Classes"
        subtitle="Assigned subjects, sections, schedules, and student enrollment rosters under your instruction."
        badge={<Badge variant="navy">{schedules.length} Classes Assigned</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection Cards */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Assigned Courses ({schedules.length})
          </div>

          {schedules.map(sc => {
            const isSelected = selectedSchedule?.id === sc.id;
            const isInProgress = isScheduleInProgress(sc);
            return (
              <button
                key={sc.id}
                onClick={() => setSelectedSchedule(sc)}
                className={`w-full text-left p-4 rounded-2xl border ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#2563EB] shadow-xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#142D59]">{sc.subjectCode}</span>
                  {isInProgress ? <Badge variant="navy">In progress now</Badge> : <Badge variant="navy">{sc.sectionName}</Badge>}
                </div>
                <h4 className="font-semibold text-xs text-slate-800 mt-1 truncate">{sc.subjectTitle}</h4>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {sc.startTime} - {sc.endTime}
                  </span>
                  <span className="font-semibold text-slate-700">{sc.enrolledStudentIds.length} Students</span>
                </div>
                {isInProgress && <p className="mt-3 border-t border-slate-200 pt-2 text-xs font-semibold text-[#142D59]">This class is currently scheduled. Attendance is ready to take.</p>}
              </button>
            );
          })}
        </div>

        {/* Selected Class Roster */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          {selectedSchedule ? (
            <div className="space-y-6">
              {/* Class Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#142D59]">{selectedSchedule.subjectCode}</h3>
                    <Badge variant="navy">{selectedSchedule.sectionName}</Badge>
                    {isScheduleInProgress(selectedSchedule) && <Badge variant="navy">Class in progress</Badge>}
                    <span className="text-xs text-slate-500 font-medium">{selectedSchedule.units} Units</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{selectedSchedule.subjectTitle}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSchedule.days.join(', ')} ({selectedSchedule.startTime} - {selectedSchedule.endTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSchedule.room}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to="/teacher/attendance">
                    <Button variant="primary" size="sm">Take Attendance</Button>
                  </Link>
                  <Link to="/teacher/grades">
                    <Button variant="outline" size="sm">Open Gradebook</Button>
                  </Link>
                </div>
              </div>

              {/* Students Roster */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#142D59]">Official Student Roster</h4>
                  <span className="text-xs text-slate-400">{classStudents.length} Students Enrolled</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
                      <tr>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Program & Year</th>
                        <th className="py-3 px-4">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map(st => (
                        <tr key={st.uid} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{st.fullName}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{st.idNumber}</td>
                          <td className="py-3 px-4">{st.programCode} (Yr {st.yearLevel || 1})</td>
                          <td className="py-3 px-4 text-slate-500">{st.email}</td>
                        </tr>
                      ))}
                      {classStudents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            No students enrolled in this section yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select a class to view its details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
