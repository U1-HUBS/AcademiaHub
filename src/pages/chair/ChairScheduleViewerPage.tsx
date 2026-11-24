import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { getAllSchedules } from '../../services/scheduleService';
import { getAllPrograms } from '../../services/programService';
import { Schedule, Program } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Clock, MapPin, User, Calendar, Eye } from 'lucide-react';

export const ChairScheduleViewerPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadSchedules();
  }, [user]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const [allScheds, allProgs] = await Promise.all([
        getAllSchedules(),
        getAllPrograms(),
      ]);

      const myProg = allProgs.find(p => p.id === user?.programId || p.chairId === user?.uid) || allProgs[0];
      setProgram(myProg);

      if (myProg) {
        const progScheds = allScheds.filter(s => s.programId === myProg.id || s.programCode === myProg.code);
        setSchedules(progScheds);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = schedules.filter(s => {
    if (selectedDay === 'all') return true;
    return s.days.includes(selectedDay);
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader
        title="Schedule Viewer"
        subtitle={`Master timetable of subjects, teachers, rooms, and sections for ${program?.name || 'Department'}.`}
        actions={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                selectedDay === 'all'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Days
            </button>
            {daysOfWeek.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  selectedDay === d
                    ? 'bg-[#142D59] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        }
      />

      {/* Timetable Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(sc => (
          <div
            key={sc.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-[#142D59] bg-blue-50 px-2.5 py-1 rounded-lg">
                  {sc.subjectCode}
                </span>
                <Badge variant="navy">{sc.sectionName}</Badge>
              </div>

              <h4 className="font-bold text-slate-900 text-base mt-2.5 leading-snug">{sc.subjectTitle}</h4>
              <span className="text-xs text-slate-400">{sc.units} Credit Units</span>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{sc.teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {sc.startTime} - {sc.endTime} ({sc.days.join(', ')})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-700">{sc.room}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Enrolled Students:</span>
              <span className="font-bold text-slate-800">
                {sc.enrolledStudentIds.length} / {sc.maxCapacity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
          No class schedules found for the selected day.
        </div>
      )}
    </div>
  );
};
