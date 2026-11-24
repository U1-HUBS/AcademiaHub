import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { getSchedulesByStudent } from '../../services/scheduleService';
import {
  getAllAssessments,
  getSubmissionsByStudent,
  submitAssessment,
} from '../../services/assessmentService';
import { getAllAnnouncements } from '../../services/announcementService';
import { Schedule, Assessment, Submission, Announcement } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Sparkles, Megaphone, Clock, CheckCircle2, Send, ExternalLink, Calendar } from 'lucide-react';

export const StudentActivitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activities' | 'announcements'>('activities');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission Modal
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadStudentActivities();
  }, [user]);

  const loadStudentActivities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myScheds, allAsmts, mySubs, allAncs] = await Promise.all([
        getSchedulesByStudent(user.uid),
        getAllAssessments(),
        getSubmissionsByStudent(user.uid),
        getAllAnnouncements(),
      ]);

      const schedIds = myScheds.map(s => s.id);
      const relevantAsmts = allAsmts.filter(a => schedIds.includes(a.scheduleId));
      const relevantAncs = allAncs.filter(
        a => !a.scheduleId || schedIds.includes(a.scheduleId) || (a.programId && a.programId === user.programId)
      );

      setSchedules(myScheds);
      setAssessments(relevantAsmts);
      setSubmissions(mySubs);
      setAnnouncements(relevantAncs);
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = (a: Assessment) => {
    setSelectedAssessment(a);
    const existing = submissions.find(s => s.assessmentId === a.id);
    if (existing) {
      setContent(existing.content);
      setLinkUrl(existing.linkUrl || '');
    } else {
      setContent('');
      setLinkUrl('');
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !user || !content) {
      error('Please input your submission details.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAssessment({
        assessmentId: selectedAssessment.id,
        scheduleId: selectedAssessment.scheduleId,
        studentId: user.uid,
        studentName: user.fullName,
        studentIdNumber: user.idNumber,
        content,
        linkUrl,
      });

      success(`Submitted coursework for "${selectedAssessment.title}".`);
      setSelectedAssessment(null);
      await loadStudentActivities();
    } catch (err: any) {
      error(err.message || 'Failed to submit coursework.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Activities & Announcements"
        subtitle="Turn in academic assessments and view official campus advisories."
        badge={<Badge variant="navy">{assessments.length} Course Activities</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'activities'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coursework Activities ({assessments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'announcements'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Notices ({announcements.length})</span>
            </button>
          </div>
        }
      />

      {/* Tab 1: Course Activities */}
      {activeTab === 'activities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map(asmt => {
            const sub = submissions.find(s => s.assessmentId === asmt.id);
            const isTurnedIn = Boolean(sub);

            return (
              <div
                key={asmt.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#142D59] bg-blue-50 px-2.5 py-1 rounded-lg">
                      {asmt.subjectCode}
                    </span>
                    <Badge variant={isTurnedIn ? 'success' : 'warning'}>
                      {isTurnedIn ? 'Turned In' : 'Pending'}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-2.5 leading-snug">{asmt.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {asmt.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Due {new Date(asmt.dueDate).toLocaleString()}
                    </span>
                    <span className="font-bold text-[#142D59]">{asmt.maxScore} Points</span>
                  </div>

                  {sub?.score !== undefined && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <div className="font-bold">Score: {sub.score} / {asmt.maxScore}</div>
                      {sub.feedback && <p className="italic mt-0.5">Feedback: "{sub.feedback}"</p>}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant={isTurnedIn ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => openSubmitModal(asmt)}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {isTurnedIn ? 'Update Submission' : 'Submit Coursework'}
                  </Button>
                </div>
              </div>
            );
          })}

          {assessments.length === 0 && (
            <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No active coursework assignments for your enrolled subjects.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map(anc => (
            <div key={anc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#142D59]">{anc.title}</span>
                  {anc.subjectCode && <Badge variant="navy">{anc.subjectCode}</Badge>}
                </div>
                <Badge variant={anc.priority === 'urgent' ? 'danger' : anc.priority === 'important' ? 'warning' : 'info'}>
                  {anc.priority.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{anc.content}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {anc.authorName}</span>
                <span>{new Date(anc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No official announcements posted.
            </div>
          )}
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        isOpen={Boolean(selectedAssessment)}
        onClose={() => setSelectedAssessment(null)}
        title={`Turn in: ${selectedAssessment?.title}`}
        subtitle={`Max Points: ${selectedAssessment?.maxScore} | Due: ${selectedAssessment?.dueDate ? new Date(selectedAssessment.dueDate).toLocaleString() : ''}`}
      >
        <form onSubmit={handleSubmitWork} className="space-y-4">
          <Input
            label="Work Summary / Text Answer"
            placeholder="Describe your solution, analysis, or answer..."
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />

          <Input
            label="Repository or Document Attachment URL (Optional)"
            placeholder="https://github.com/username/project or Google Drive link"
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAssessment(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Turn In Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
