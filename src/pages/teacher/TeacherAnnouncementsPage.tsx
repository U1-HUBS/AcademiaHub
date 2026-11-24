import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { getSchedulesByTeacher } from '../../services/scheduleService';
import {
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../../services/announcementService';
import { Schedule, Announcement } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Megaphone, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';

export const TeacherAnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [priority, setPriority] = useState<Announcement['priority']>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadAnnouncements();
  }, [user]);

  const loadAnnouncements = async () => {
    if (!user) return;
    try {
      const [myScheds, allAncs] = await Promise.all([
        getSchedulesByTeacher(user.uid),
        getAllAnnouncements(),
      ]);
      setSchedules(myScheds);

      const mySchedIds = myScheds.map(s => s.id);
      const filtered = allAncs.filter(a => a.authorId === user.uid || (a.scheduleId && mySchedIds.includes(a.scheduleId)));
      setAnnouncements(filtered);
    } catch (err: any) {
      console.warn('Failed to load announcements:', err);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) {
      error('Please complete title and announcement message.');
      return;
    }

    const sched = schedules.find(s => s.id === scheduleId);

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title,
        content,
        scheduleId: sched?.id,
        subjectCode: sched?.subjectCode,
        authorId: user.uid,
        authorName: user.fullName,
        authorRole: 'teacher',
        priority,
      });

      success('Announcement broadcast published.');
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      await loadAnnouncements();
    } catch (err: any) {
      error(err.message || 'Failed to publish notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      success('Announcement removed.');
      await loadAnnouncements();
    } catch (err: any) {
      error(err.message || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Class Announcements"
        subtitle="Broadcast class announcements, examination schedules, and course advisories."
        badge={<Badge variant="navy">{announcements.length} Published</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setScheduleId(schedules[0]?.id || '');
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Publish Announcement
          </Button>
        }
      />

      <div className="space-y-4">
        {announcements.map(anc => (
          <div key={anc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#142D59]">{anc.title}</span>
                  {anc.subjectCode && <Badge variant="navy">{anc.subjectCode}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={anc.priority === 'urgent' ? 'danger' : anc.priority === 'important' ? 'warning' : 'info'}>
                    {anc.priority.toUpperCase()}
                  </Badge>
                  {anc.authorId === user?.uid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(anc.id)}
                      className="text-rose-600 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">{anc.content}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Published by {anc.authorName}</span>
              <span>{new Date(anc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No class announcements published yet.
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Class Announcement"
        subtitle="Broadcast to enrolled course sections"
      >
        <form onSubmit={handlePost} className="space-y-4">
          <Select
            label="Target Audience / Class"
            value={scheduleId}
            onChange={e => setScheduleId(e.target.value)}
          >
            <option value="">Broadcast to All My Classes</option>
            {schedules.map(sc => (
              <option key={sc.id} value={sc.id}>
                {sc.subjectCode} - {sc.sectionName}
              </option>
            ))}
          </Select>

          <Input
            label="Announcement Title"
            placeholder="e.g. Midterm Examination Schedule Advisory"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <Select
            label="Priority Level"
            value={priority}
            onChange={e => setPriority(e.target.value as any)}
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </Select>

          <Input
            label="Message Content"
            placeholder="Please be in the examination room 15 minutes before schedule..."
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Publish Notice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
