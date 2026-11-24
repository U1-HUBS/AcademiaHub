import { Schedule, ConflictCheckResult } from '../types';

/**
 * Checks if two time intervals overlap (assuming 'HH:mm' strings in 24-hr format)
 */
export function timeOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/**
 * Detects schedule collisions: Room conflict, Teacher conflict, or Section conflict.
 */
export function checkScheduleConflict(
  candidate: {
    room: string;
    teacherId: string;
    teacherName: string;
    sectionId: string;
    sectionName: string;
    days: string[];
    startTime: string;
    endTime: string;
  },
  existingSchedules: Schedule[],
  excludeScheduleId?: string
): ConflictCheckResult {
  for (const existing of existingSchedules) {
    if (excludeScheduleId && existing.id === excludeScheduleId) {
      continue;
    }

    // Check if there is any shared day
    const sharesDay = candidate.days.some(day => existing.days.includes(day));
    if (!sharesDay) {
      continue;
    }

    // Check if time intervals overlap
    const overlaps = timeOverlaps(
      candidate.startTime,
      candidate.endTime,
      existing.startTime,
      existing.endTime
    );
    if (!overlaps) {
      continue;
    }

    // 1. Room Conflict
    if (candidate.room.trim().toLowerCase() === existing.room.trim().toLowerCase()) {
      return {
        hasConflict: true,
        type: 'room',
        message: `Room Collision: Room "${existing.room}" is already scheduled for ${existing.subjectCode} (${existing.sectionName}) on ${existing.days.join(', ')} from ${existing.startTime} to ${existing.endTime}.`,
        conflictingSchedule: existing,
      };
    }

    // 2. Teacher Conflict
    if (candidate.teacherId === existing.teacherId) {
      return {
        hasConflict: true,
        type: 'teacher',
        message: `Teacher Collision: ${existing.teacherName} already has a class scheduled for ${existing.subjectCode} (${existing.sectionName}) on ${existing.days.join(', ')} from ${existing.startTime} to ${existing.endTime}.`,
        conflictingSchedule: existing,
      };
    }

    // 3. Section Conflict
    if (candidate.sectionId === existing.sectionId) {
      return {
        hasConflict: true,
        type: 'section',
        message: `Section Collision: Section "${existing.sectionName}" already has ${existing.subjectCode} scheduled on ${existing.days.join(', ')} from ${existing.startTime} to ${existing.endTime}.`,
        conflictingSchedule: existing,
      };
    }
  }

  return { hasConflict: false };
}
