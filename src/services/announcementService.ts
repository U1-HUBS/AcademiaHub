import { Announcement, UserRole } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById, deleteDocById } from './storage';

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const all = await fetchCollection<Announcement>('announcements');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAnnouncementsForUser(user: {
  uid: string;
  role: UserRole;
  programId?: string;
  enrolledScheduleIds?: string[];
}): Promise<Announcement[]> {
  const all = await getAllAnnouncements();
  return all.filter(a => {
    // Campus wide
    if (!a.scheduleId && !a.programId) return true;
    // Program specific
    if (a.programId && a.programId === user.programId) return true;
    // Class specific
    if (a.scheduleId && user.enrolledScheduleIds?.includes(a.scheduleId)) return true;
    // Author themselves
    if (a.authorId === user.uid) return true;
    return false;
  });
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  scheduleId?: string;
  subjectCode?: string;
  programId?: string;
  programCode?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  targetRole?: 'all' | 'students' | 'teachers';
  priority: 'normal' | 'important' | 'urgent';
}): Promise<Announcement> {
  const id = `anc-${Date.now().toString(36)}`;
  const anc: Announcement = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await saveDoc('announcements', id, anc);
  return anc;
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
  await updateDocById('announcements', id, updates);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDocById('announcements', id);
}
