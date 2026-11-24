import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSchedulesByStudent } from '../../services/scheduleService';
import { Schedule } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { Clock, MapPin, User, CalendarDays } from 'lucide-react';

export const StudentSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadSchedule();
  }, [user]);

  const loadSchedule = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myScheds = await getSchedulesByStudent(user.uid);
      setSchedules(myScheds);
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
      {/* Standardized Page Header */}
      <PageHeader
        title="Class Timetable & Schedule"
        subtitle="Weekly scheduled time slots, rooms, and instructor allocations."
        badge={<Badge variant="navy">{filtered.length} Class Slots</Badge>}
        actions={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDay === 'all'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Full Week
            </button>
            {daysOfWeek.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
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

      {/* Timetable Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(sc => (
          <div
            key={sc.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
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

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-800">
                    {sc.startTime} - {sc.endTime}
                  </span>
                  <span className="text-slate-400">({sc.days.join(', ')})</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-700">{sc.room}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-600">Faculty: {sc.teacherName}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Term: {sc.academicYear}</span>
              <span className="font-semibold text-[#142D59]">{sc.semester}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
          No scheduled classes on this selected day.
        </div>
      )}
    </div>
  );
};
