import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSchedulesByStudent } from '../../services/scheduleService';
import { Schedule } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { BookMarked, User, Clock, MapPin, Layers } from 'lucide-react';

export const MySubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnrolledSubjects();
  }, [user]);

  const loadEnrolledSubjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myScheds = await getSchedulesByStudent(user.uid);
      setSchedules(myScheds);
    } finally {
      setLoading(false);
    }
  };

  const totalUnits = schedules.reduce((acc, s) => acc + (s.units || 3), 0);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Enrolled Subjects"
        subtitle="Official curriculum courses, unit loads, and faculty instructors for this term."
        badge={<Badge variant="navy">{totalUnits} Credit Units</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedules.map(sc => (
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

              <h3 className="font-bold text-slate-900 text-base mt-2.5 leading-snug">{sc.subjectTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">{sc.programCode} Curriculum</p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800">Faculty: {sc.teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{sc.days.join(', ')} ({sc.startTime} - {sc.endTime})</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Room: {sc.room}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Course Load:</span>
              <span className="font-bold text-[#142D59]">{sc.units || 3} Credit Units</span>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No subjects registered for your student profile. Contact the Program Chair or Registrar.
          </div>
        )}
      </div>
    </div>
  );
};
