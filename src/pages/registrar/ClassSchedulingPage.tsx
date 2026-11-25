import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../../services/scheduleService';
import { getAllSubjects } from '../../services/subjectService';
import { getAllPrograms } from '../../services/programService';
import { getAllUsers } from '../../services/userService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { Schedule, Subject, Program, UserProfile, EnrollmentRecord } from '../../types';
import { CalendarDays, Plus, Edit, Trash2, AlertTriangle, Clock, MapPin, User } from 'lucide-react';

export const ClassSchedulingPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedRoster, setSelectedRoster] = useState<Schedule | null>(null);

  // Form State
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [programId, setProgramId] = useState('');
  const [sectionNameInput, setSectionNameInput] = useState('');
  const [room, setRoom] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [maxCapacity, setMaxCapacity] = useState<number | ''>(35);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState('1st Semester');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedList, subjList, progList, userList, enrollmentList] = await Promise.all([
        getAllSchedules(),
        getAllSubjects(),
        getAllPrograms(),
        getAllUsers(),
        getAllEnrollments(),
      ]);
      const visibleProgramId = user?.role === 'program_chair' ? user.programId : undefined;
      const visiblePrograms = visibleProgramId ? progList.filter(program => program.id === visibleProgramId) : progList;
      setSchedules(visibleProgramId ? schedList.filter(schedule => schedule.programId === visibleProgramId) : schedList);
      setSubjects(visibleProgramId ? subjList.filter(subject => subject.programId === visibleProgramId) : subjList);
      setPrograms(visiblePrograms);
      setTeachers(userList.filter(u => u.role === 'teacher' && u.status === 'active'));
      setStudents(userList.filter(u => u.role === 'student' && u.status === 'active' && (!visibleProgramId || u.programId === visibleProgramId)));
      setEnrollments(enrollmentList);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setSubjectId(subjects[0]?.id || '');
    setTeacherId(teachers[0]?.uid || '');
    setProgramId(programs[0]?.id || '');
    setSectionNameInput('');
    setRoom('Room 201');
    setSelectedDays(['Monday', 'Wednesday']);
    setStartTime('08:00');
    setEndTime('09:30');
    setMaxCapacity(35);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Schedule) => {
    setEditingSchedule(s);
    setSubjectId(s.subjectId);
    setTeacherId(s.teacherId);
    setProgramId(s.programId);
    setSectionNameInput(s.sectionName);
    setRoom(s.room);
    setSelectedDays(s.days);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setMaxCapacity(s.maxCapacity);
    setAcademicYear(s.academicYear);
    setSemester(s.semester);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Keep at least one
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    const subject = subjects.find(s => s.id === subjectId);
    const teacher = teachers.find(t => t.uid === teacherId);
    const program = programs.find(p => p.id === programId);
    const sectionName = sectionNameInput.trim();

    if (!subject || !teacher || !program || !sectionName) {
      error('Please select all required schedule parameters.');
      return;
    }

    if (startTime >= endTime) {
      setConflictError('Start time must be strictly before end time.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, {
          subjectId,
          subjectCode: subject.code,
          subjectTitle: subject.title,
          units: subject.units,
          teacherId,
          teacherName: teacher.fullName,
          programId,
          programCode: program.code,
          sectionId: sectionName,
          sectionName,
          room: room.trim(),
          days: selectedDays,
          startTime,
          endTime,
          maxCapacity: Number(maxCapacity),
          academicYear,
          semester,
        });
        success(`Schedule for ${subject.code} (${sectionName}) updated.`);
      } else {
        await createSchedule({
          subjectId,
          subjectCode: subject.code,
          subjectTitle: subject.title,
          units: subject.units,
          teacherId,
          teacherName: teacher.fullName,
          programId,
          programCode: program.code,
          sectionId: sectionName,
          sectionName,
          room: room.trim(),
          days: selectedDays,
          startTime,
          endTime,
          maxCapacity: Number(maxCapacity),
          enrolledStudentIds: [],
          academicYear,
          semester,
        });
        success(`Class schedule for ${subject.code} created successfully.`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setConflictError(err.message || 'Schedule conflict detected.');
      error(err.message || 'Scheduling conflict.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete class schedule for ${code}?`)) return;
    try {
      await deleteSchedule(id);
      success('Schedule removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to remove schedule.');
    }
  };

  const filtered = schedules.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.subjectCode.toLowerCase().includes(q) ||
      s.subjectTitle.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q) ||
      s.sectionName.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      key: 'subject',
      header: 'Subject Code & Title',
      render: (s: Schedule) => (
        <div>
          <div className="font-bold text-[#142D59]">{s.subjectCode}</div>
          <div className="text-xs text-slate-500 line-clamp-1">{s.subjectTitle}</div>
          <span className="text-[10px] text-slate-400">{s.units || 3} units</span>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Section & Program',
      render: (s: Schedule) => (
        <div>
          <div className="font-semibold text-slate-800">{s.sectionName}</div>
          <div className="text-xs text-slate-400">{s.programCode}</div>
        </div>
      ),
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (s: Schedule) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{s.teacherName}</span>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Time & Days',
      render: (s: Schedule) => (
        <div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{s.startTime} - {s.endTime}</span>
          </div>
          <div className="text-[11px] text-slate-500">{s.days.join(', ')}</div>
        </div>
      ),
    },
    {
      key: 'room',
      header: 'Room',
      render: (s: Schedule) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          <MapPin className="w-3 h-3 text-slate-500" />
          {s.room}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'Enrolled / Cap',
      render: (s: Schedule) => {
        const isFull = s.enrolledStudentIds.length >= s.maxCapacity;
        return (
          <span className={`text-xs font-semibold ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
            {s.enrolledStudentIds.length} / {s.maxCapacity}
            {isFull && <span className="ml-1 text-[10px] uppercase font-bold text-rose-500">(Full)</span>}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s: Schedule) => (
        <div className="flex items-center gap-1.5" onClick={event => event.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(s)}
            icon={<Edit className="w-3.5 h-3.5 text-slate-500" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(s.id, s.subjectCode)}
            className="text-rose-600 hover:text-rose-700"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Scheduling"
        subtitle="Master scheduling authority with automated Room, Teacher, and Section Conflict Detection."
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Create Class Schedule
          </Button>
        }
      />

      <Table
        label="Class schedules"
        data={filtered}
        columns={columns}
        keyExtractor={s => s.id}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search schedule by subject, teacher, section, or room..."
        onRowClick={setSelectedRoster}
      />

      <Modal maxWidth="5xl" isOpen={Boolean(selectedRoster)} onClose={() => setSelectedRoster(null)} title={`${selectedRoster?.subjectCode || 'Subject'} enrolled students`} subtitle={`${selectedRoster?.subjectTitle || ''} · ${selectedRoster?.sectionName || ''}`}>
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-5 py-4 text-base text-primary"><span>Enrolled students</span><strong>{selectedRoster?.enrolledStudentIds.length || 0} / {selectedRoster?.maxCapacity || 0}</strong></div>
          {selectedRoster?.enrolledStudentIds.length ? <div className="space-y-4">{selectedRoster.enrolledStudentIds.map(studentId => { const student = students.find(item => item.uid === studentId); const enrollment = enrollments.find(item => item.studentId === studentId && item.programId === selectedRoster.programId); return <div key={studentId} className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-bold text-primary">{student?.fullName || enrollment?.studentName || 'Student record unavailable'}</p><p className="text-base text-slate-600">{student?.idNumber || enrollment?.studentIdNumber || studentId}</p></div><Badge variant="navy">{enrollment?.status || 'Enrolled'}</Badge></div><div className="mt-5 grid gap-5 text-base sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"><div className="xl:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p><p className="whitespace-nowrap text-slate-800">{student?.email || enrollment?.studentEmail || '—'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p><p className="text-slate-800">{student?.phone || '—'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program</p><p className="text-slate-800">{student?.programCode || enrollment?.programCode || '—'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year level</p><p className="text-slate-800">Year {student?.yearLevel || enrollment?.yearLevel || '—'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student type</p><p className="capitalize text-slate-800">{student?.studentType || enrollment?.studentType || '—'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p><p className="text-slate-800">{enrollment?.sectionName || student?.sectionName || selectedRoster.sectionName || '—'}</p></div></div></div>; })}</div> : <p className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-600">No students are enrolled in this subject yet.</p>}
        </div>
      </Modal>

      {/* Modal with Conflict Detection */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Modify Class Schedule' : 'Create Class Schedule'}
        subtitle="Automatic Conflict & Room Capacity Validation"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {conflictError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{conflictError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Subject Offering"
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
            >
              <option value="">Select Subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title} ({s.units}u)
                </option>
              ))}
            </Select>

            <Select
              label="Assigned Teacher"
              value={teacherId}
              onChange={e => setTeacherId(e.target.value)}
            >
              <option value="">Select Faculty...</option>
              {teachers.map(t => (
                <option key={t.uid} value={t.uid}>
                  {t.fullName} ({t.idNumber})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Program"
              value={programId}
              onChange={e => setProgramId(e.target.value)}
            >
              <option value="">Select Program...</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </Select>

            <Input
              label="Class Section"
              placeholder="e.g. BSIT 1-A or Evening 2-B"
              value={sectionNameInput}
              onChange={e => setSectionNameInput(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Room / Laboratory"
              placeholder="e.g. Lab 301, Room 204"
              value={room}
              onChange={e => setRoom(e.target.value)}
              required
            />
            <Input
              label="Maximum Capacity"
              type="number"
              min={5}
              max={100}
              value={maxCapacity}
              onChange={e => setMaxCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          {/* Days Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Class Days
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(d => {
                const active = selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#142D59] text-white border-[#142D59]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingSchedule ? 'Save Changes' : 'Validate & Create Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
