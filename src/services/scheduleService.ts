import { Schedule } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById, deleteDocById } from './storage';
import { checkScheduleConflict } from './scheduleConflict';

export async function getAllSchedules(): Promise<Schedule[]> {
  return fetchCollection<Schedule>('schedules');
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  return fetchDocById<Schedule>('schedules', id);
}

export async function getSchedulesByTeacher(teacherId: string): Promise<Schedule[]> {
  const all = await getAllSchedules();
  return all.filter(s => s.teacherId === teacherId);
}

export async function getSchedulesByProgram(programId: string): Promise<Schedule[]> {
  const all = await getAllSchedules();
  return all.filter(s => s.programId === programId);
}

export async function getSchedulesByStudent(studentId: string): Promise<Schedule[]> {
  const all = await getAllSchedules();
  return all.filter(s => s.enrolledStudentIds.includes(studentId));
}

export async function createSchedule(data: Omit<Schedule, 'id' | 'createdAt'>): Promise<Schedule> {
  const existingSchedules = await getAllSchedules();

  // Enforce conflict detection
  const conflict = checkScheduleConflict(
    {
      room: data.room,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      sectionId: data.sectionId,
      sectionName: data.sectionName,
      days: data.days,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    existingSchedules
  );

  if (conflict.hasConflict) {
    throw new Error(conflict.message || 'Schedule conflict detected.');
  }

  const id = `sched-${Date.now().toString(36)}`;
  const newSched: Schedule = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };

  await saveDoc('schedules', id, newSched);
  return newSched;
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<void> {
  const existingSchedules = await getAllSchedules();
  const current = existingSchedules.find(s => s.id === id);
  if (!current) {
    throw new Error('Schedule not found.');
  }

  const candidate = {
    room: updates.room ?? current.room,
    teacherId: updates.teacherId ?? current.teacherId,
    teacherName: updates.teacherName ?? current.teacherName,
    sectionId: updates.sectionId ?? current.sectionId,
    sectionName: updates.sectionName ?? current.sectionName,
    days: updates.days ?? current.days,
    startTime: updates.startTime ?? current.startTime,
    endTime: updates.endTime ?? current.endTime,
  };

  const conflict = checkScheduleConflict(candidate, existingSchedules, id);
  if (conflict.hasConflict) {
    throw new Error(conflict.message || 'Schedule conflict detected.');
  }

  await updateDocById('schedules', id, updates);
}

export async function deleteSchedule(id: string): Promise<void> {
  await deleteDocById('schedules', id);
}

/**
 * Assigns student to schedule; enforces duplicate and capacity checks.
 */
export async function addStudentToSchedule(scheduleId: string, studentId: string): Promise<void> {
  const sched = await getScheduleById(scheduleId);
  if (!sched) throw new Error('Schedule not found.');

  if (sched.enrolledStudentIds.includes(studentId)) {
    throw new Error('Student is already enrolled in this class schedule.');
  }

  if (sched.enrolledStudentIds.length >= sched.maxCapacity) {
    throw new Error(`Class capacity limit reached (${sched.maxCapacity} students maximum). Cannot enroll additional students.`);
  }

  const updatedIds = [...sched.enrolledStudentIds, studentId];
  await updateDocById('schedules', scheduleId, { enrolledStudentIds: updatedIds });
}

/**
 * Removes student from a schedule.
 */
export async function removeStudentFromSchedule(scheduleId: string, studentId: string): Promise<void> {
  const sched = await getScheduleById(scheduleId);
  if (!sched) throw new Error('Schedule not found.');

  const updatedIds = sched.enrolledStudentIds.filter(id => id !== studentId);
  await updateDocById('schedules', scheduleId, { enrolledStudentIds: updatedIds });
}
