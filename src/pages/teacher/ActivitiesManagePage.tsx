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
  getAllAssessments,
  createAssessment,
  deleteAssessment,
  getSubmissionsByAssessment,
  gradeSubmission,
} from '../../services/assessmentService';
import { Schedule, Assessment, Submission, AssessmentType } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { ListTodo, Plus, Trash2, CheckCircle2, Clock, ExternalLink, MessageSquare } from 'lucide-react';

export const ActivitiesManagePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Create Assessment
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssessmentType>('assignment');
  const [maxScore, setMaxScore] = useState(100);
  const [weight, setWeight] = useState(20);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Grading
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState(100);
  const [gradeFeedback, setGradeFeedback] = useState('');

  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myScheds, allAsmts] = await Promise.all([
        getSchedulesByTeacher(user.uid),
        getAllAssessments(),
      ]);
      setSchedules(myScheds);

      const schedIds = myScheds.map(s => s.id);
      const filteredAsmts = allAsmts.filter(a => schedIds.includes(a.scheduleId) || a.createdBy === user.uid);
      setAssessments(filteredAsmts);

      if (filteredAsmts.length > 0) {
        setSelectedAssessment(filteredAsmts[0]);
        const subs = await getSubmissionsByAssessment(filteredAsmts[0].id);
        setSubmissions(subs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssessment = async (a: Assessment) => {
    setSelectedAssessment(a);
    const subs = await getSubmissionsByAssessment(a.id);
    setSubmissions(subs);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !classId || !title || !dueDate) {
      error('Please complete all required assessment fields.');
      return;
    }

    const sched = schedules.find(s => s.id === classId);
    if (!sched) return;

    setIsSubmitting(true);
    try {
      await createAssessment({
        scheduleId: sched.id,
        subjectCode: sched.subjectCode,
        sectionName: sched.sectionName,
        title,
        type,
        maxScore: Number(maxScore),
        weight: Number(weight),
        dueDate,
        description,
        createdBy: user.uid,
        createdByName: user.fullName,
      });

      success(`Assessment "${title}" created successfully.`);
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete assessment "${name}"?`)) return;
    try {
      await deleteAssessment(id);
      success('Assessment removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete assessment.');
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    try {
      await gradeSubmission(gradingSubmission.id, gradeScore, gradeFeedback);
      success('Submission scored and feedback submitted.');
      setGradingSubmission(null);
      if (selectedAssessment) {
        const subs = await getSubmissionsByAssessment(selectedAssessment.id);
        setSubmissions(subs);
      }
    } catch (err: any) {
      error(err.message || 'Failed to grade submission.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Course Activities & Assessments"
        subtitle="Create homework, quizzes, and projects; review student submissions and record feedback."
        badge={<Badge variant="navy">{assessments.length} Total Activities</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setClassId(schedules[0]?.id || '');
              setIsCreateModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            New Activity / Assessment
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assessments List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Course Activities ({assessments.length})
          </div>

          {assessments.map(asmt => {
            const isSelected = selectedAssessment?.id === asmt.id;
            return (
              <div
                key={asmt.id}
                onClick={() => handleSelectAssessment(asmt)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#2563EB] shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#142D59]">{asmt.subjectCode}</span>
                  <Badge variant="navy">{asmt.type.toUpperCase()}</Badge>
                </div>
                <h4 className="font-bold text-xs text-slate-800 mt-1">{asmt.title}</h4>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due {new Date(asmt.dueDate).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-slate-700">{asmt.maxScore} pts</span>
                </div>
              </div>
            );
          })}

          {assessments.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No assessments created yet. Click "New Activity" to publish one.
            </div>
          )}
        </div>

        {/* Right: Selected Assessment Submissions */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          {selectedAssessment ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#142D59]">{selectedAssessment.title}</h3>
                    <Badge variant="navy">{selectedAssessment.type}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{selectedAssessment.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>Due: {new Date(selectedAssessment.dueDate).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-bold text-[#142D59]">{selectedAssessment.maxScore} Points Max</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAssessment(selectedAssessment.id, selectedAssessment.title)}
                  className="text-rose-600"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Activity
                </Button>
              </div>

              {/* Submissions List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#142D59]">Student Submissions</h4>
                  <span className="text-xs text-slate-400">{submissions.length} Turn-ins</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Turned-in Date</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{sub.studentName}</div>
                            <div className="text-xs text-slate-400 font-mono">{sub.studentIdNumber}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {sub.score !== undefined ? (
                              <span className="font-bold text-emerald-700">
                                {sub.score} / {selectedAssessment.maxScore}
                              </span>
                            ) : (
                              <Badge variant="warning">Pending Review</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeScore(sub.score ?? 90);
                                setGradeFeedback(sub.feedback ?? '');
                              }}
                            >
                              {sub.score !== undefined ? 'Update Score' : 'Grade Submission'}
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {submissions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            No student submissions for this assessment yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select an assessment to inspect submissions.</div>
          )}
        </div>
      </div>

      {/* Modal: Create Assessment */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Course Assessment / Activity"
        subtitle="Publish exercises, quizzes, or major term projects"
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4">
          <Select
            label="Target Class Offering"
            value={classId}
            onChange={e => setClassId(e.target.value)}
            required
          >
            {schedules.map(sc => (
              <option key={sc.id} value={sc.id}>
                {sc.subjectCode} - {sc.sectionName} ({sc.subjectTitle})
              </option>
            ))}
          </Select>

          <Input
            label="Assessment Title"
            placeholder="e.g. Lab Exercise 1: Bubble Sort Algorithm"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as AssessmentType)}
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="project">Project</option>
              <option value="exam">Term Exam</option>
            </Select>

            <Input
              label="Max Points"
              type="number"
              min={1}
              value={maxScore}
              onChange={e => setMaxScore(Number(e.target.value))}
              required
            />

            <Input
              label="Weight %"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Submission Deadline"
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            required
          />

          <Input
            label="Instructions & Requirements"
            placeholder="Detailed prompt, guidelines, and submission links..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Publish Assessment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Score & Feedback */}
      <Modal
        isOpen={Boolean(gradingSubmission)}
        onClose={() => setGradingSubmission(null)}
        title={`Grade Submission: ${gradingSubmission?.studentName}`}
        subtitle={`Assessment: ${selectedAssessment?.title} (Max: ${selectedAssessment?.maxScore} pts)`}
      >
        <form onSubmit={handleSaveGrade} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-700">Student Submission Details:</div>
            <p className="text-slate-800 italic">"{gradingSubmission?.content}"</p>
            {gradingSubmission?.linkUrl && (
              <a
                href={gradingSubmission.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Attachment / Project Link</span>
              </a>
            )}
          </div>

          <Input
            label="Score Awarded"
            type="number"
            min={0}
            max={selectedAssessment?.maxScore || 100}
            value={gradeScore}
            onChange={e => setGradeScore(Number(e.target.value))}
            required
          />

          <Input
            label="Teacher Feedback & Comments"
            placeholder="Great work on algorithmic efficiency..."
            value={gradeFeedback}
            onChange={e => setGradeFeedback(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setGradingSubmission(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Submit Grade & Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
