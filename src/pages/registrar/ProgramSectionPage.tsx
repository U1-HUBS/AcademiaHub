import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getAllSections,
  createSection,
  updateSection,
  deleteSection,
} from '../../services/programService';
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../../services/subjectService';
import { getAllUsers } from '../../services/userService';
import { Curriculum, Program, Section, Subject, UserProfile } from '../../types';
import { createCurriculum, updateCurriculum, getAllCurriculums } from '../../services/curriculumService';
import { FolderKanban, Plus, Edit, Trash2, BookOpen, Layers, Library } from 'lucide-react';

type CurriculumDraft = {
  code: string;
  title: string;
  units: number;
  lectureHours: number;
  yearLevel: number;
  semester: Subject['semester'];
  prerequisites: string[];
};

export const ProgramSectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'programs' | 'sections' | 'subjects'>('programs');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(null);
  const [chairs, setChairs] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<Program | null>(null);
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [progDept, setProgDept] = useState('');
  const [progChairId, setProgChairId] = useState('');
  const [progDesc, setProgDesc] = useState('');

  const [isSecModalOpen, setIsSecModalOpen] = useState(false);
  const [editingSec, setEditingSec] = useState<Section | null>(null);
  const [secName, setSecName] = useState('');
  const [secProgramId, setSecProgramId] = useState('');
  const [secYear, setSecYear] = useState(1);
  const [secAdviserId, setSecAdviserId] = useState('');
  const [secCapacity, setSecCapacity] = useState(35);

  const [isSubjModalOpen, setIsSubjModalOpen] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [editingSubj, setEditingSubj] = useState<Subject | null>(null);
  const [subjCode, setSubjCode] = useState('');
  const [subjTitle, setSubjTitle] = useState('');
  const [subjUnits, setSubjUnits] = useState(3);
  const [subjLec, setSubjLec] = useState(2);
  const [subjProgramId, setSubjProgramId] = useState('');
  const [subjYearLevel, setSubjYearLevel] = useState(1);
  const [subjSemester, setSubjSemester] = useState<Subject['semester']>('1st Semester');
  const [subjPrerequisites, setSubjPrerequisites] = useState<string[]>([]);
  const [subjStudentType, setSubjStudentType] = useState<'regular' | 'evening'>('regular');
  const [curriculumId, setCurriculumId] = useState('');
  const [curriculumStudentType, setCurriculumStudentType] = useState<'regular' | 'evening'>('regular');
  const [newCurriculumProgramId, setNewCurriculumProgramId] = useState('');
  const [curriculumRows, setCurriculumRows] = useState<CurriculumDraft[]>([]);

  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, subjs, curriculumList, users] = await Promise.all([
        getAllPrograms(),
        getAllSections(),
        getAllSubjects(),
        getAllCurriculums(),
        getAllUsers(),
      ]);
      setPrograms(p);
      setSections(s);
      setSubjects(subjs);
      setCurriculums(curriculumList);
      setSelectedCurriculumId(current => current || curriculumList[0]?.id || null);
      setChairs(users.filter(u => u.role === 'program_chair' && u.status === 'active'));
      setTeachers(users.filter(u => u.role === 'teacher' && u.status === 'active'));
    } finally {
      setLoading(false);
    }
  };

  // Program Handlers
  const openProgModal = (p?: Program) => {
    if (p) {
      setEditingProg(p);
      setProgCode(p.code);
      setProgName(p.name);
      setProgDept(p.department);
      setProgChairId(p.chairId || '');
      setProgDesc(p.description);
    } else {
      setEditingProg(null);
      setProgCode('');
      setProgName('');
      setProgDept('College of Computer Studies');
      setProgChairId(chairs[0]?.uid || '');
      setProgDesc('');
    }
    setIsProgModalOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    const chair = chairs.find(c => c.uid === progChairId);
    try {
      if (editingProg) {
        await updateProgram(editingProg.id, {
          code: progCode.toUpperCase(),
          name: progName,
          department: progDept,
          chairId: progChairId,
          chairName: chair?.fullName,
          description: progDesc,
        });
        success('Program updated.');
      } else {
        await createProgram({
          code: progCode.toUpperCase(),
          name: progName,
          department: progDept,
          chairId: progChairId,
          chairName: chair?.fullName,
          description: progDesc,
          active: true,
        });
        success('New Program registered.');
      }
      setIsProgModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save program.');
    }
  };

  const handleDeleteProgram = async (id: string, code: string) => {
    if (!confirm(`Delete Program ${code}?`)) return;
    try {
      await deleteProgram(id);
      success('Program removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete program.');
    }
  };

  // Section Handlers
  const openSecModal = (s?: Section) => {
    if (s) {
      setEditingSec(s);
      setSecName(s.name);
      setSecProgramId(s.programId);
      setSecYear(s.yearLevel);
      setSecAdviserId(s.adviserId || '');
      setSecCapacity(s.maxCapacity);
    } else {
      setEditingSec(null);
      setSecName('');
      setSecProgramId(programs[0]?.id || '');
      setSecYear(1);
      setSecAdviserId(teachers[0]?.uid || '');
      setSecCapacity(35);
    }
    setIsSecModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const prog = programs.find(p => p.id === secProgramId);
    const adv = teachers.find(t => t.uid === secAdviserId);
    try {
      if (editingSec) {
        await updateSection(editingSec.id, {
          name: secName,
          programId: secProgramId,
          programCode: prog?.code || '',
          yearLevel: Number(secYear),
          adviserId: secAdviserId,
          adviserName: adv?.fullName,
          maxCapacity: Number(secCapacity),
        });
        success('Section updated.');
      } else {
        await createSection({
          name: secName,
          programId: secProgramId,
          programCode: prog?.code || '',
          yearLevel: Number(secYear),
          academicYear: '2026-2027',
          adviserId: secAdviserId,
          adviserName: adv?.fullName,
          maxCapacity: Number(secCapacity),
        });
        success('New Section created.');
      }
      setIsSecModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save section.');
    }
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete Section ${name}?`)) return;
    try {
      await deleteSection(id);
      success('Section removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete section.');
    }
  };

  // Subject Handlers
  const openSubjModal = (sub?: Subject) => {
    if (sub) {
      setEditingSubj(sub);
      setSubjCode(sub.code);
      setSubjTitle(sub.title);
      setSubjUnits(sub.units);
      setSubjLec(sub.lectureHours);
      setSubjProgramId(sub.programId);
      setSubjYearLevel(sub.yearLevel || 1);
      setSubjSemester(sub.semester || '1st Semester');
      setSubjStudentType(sub.studentType || 'regular');
      setSubjPrerequisites(sub.prerequisites || []);
      setCurriculumId(sub.curriculumId || '');
      setCurriculumRows([]);
    } else {
      setEditingSubj(null);
      setSubjCode('');
      setSubjTitle('');
      setSubjUnits(3);
      setSubjLec(2);
      setSubjProgramId(programs[0]?.id || '');
      setSubjYearLevel(1);
      setSubjSemester('1st Semester');
      setSubjStudentType('regular');
      setSubjPrerequisites([]);
      setCurriculumRows([{code: '', title: '', units: 3, lectureHours: 2, yearLevel: 1, semester: '1st Semester', prerequisites: []}]);
      setCurriculumId('');
      setCurriculumStudentType('regular');
    }
    setIsSubjModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const prog = programs.find(p => p.id === subjProgramId);
    try {
      if (editingSubj) {
        await updateSubject(editingSubj.id, {
          code: subjCode.toUpperCase(),
          title: subjTitle,
          units: Number(subjUnits),
          lectureHours: Number(subjLec),
          programId: subjProgramId,
          programCode: prog?.code || '',
          yearLevel: Number(subjYearLevel),
          semester: subjSemester,
          curriculumId,
          studentType: undefined,
          prerequisites: subjPrerequisites,
        });
        success('Curriculum updated.');
      } else {
        for (const row of curriculumRows) {
          if (!row.code.trim() || !row.title.trim()) throw new Error('Complete the course code and title for every curriculum subject.');
          if (row.prerequisites.includes(row.code.trim().toUpperCase())) throw new Error(`${row.code.toUpperCase()} cannot be its own prerequisite.`);
        }
        const draftCodes = new Set(curriculumRows.map(row => row.code.trim().toUpperCase()).filter(Boolean));
        const graph = new Map<string, string[]>();
        curriculumRows.forEach(row => graph.set(row.code.trim().toUpperCase(), row.prerequisites.map(code => code.toUpperCase())));
        const visiting = new Set<string>(); const visited = new Set<string>();
        const hasCycle = (code: string): boolean => {
          if (visiting.has(code)) return true;
          if (visited.has(code)) return false;
          visiting.add(code);
          for (const prerequisite of graph.get(code) || []) if (draftCodes.has(prerequisite) && hasCycle(prerequisite)) return true;
          visiting.delete(code); visited.add(code); return false;
        };
        if ([...draftCodes].some(hasCycle)) throw new Error('Circular prerequisites are not allowed.');
        const loadGroups = new Map<string, number>();
        curriculumRows.forEach(row => {
          const key = `${curriculumStudentType}-${row.yearLevel}-${row.semester}`;
          loadGroups.set(key, (loadGroups.get(key) || 0) + Number(row.units));
        });
        for (const [key, totalUnits] of loadGroups) {
          const limit = key.startsWith('evening-') ? 18 : 27;
          if (totalUnits > limit) throw new Error(`${key.split('-')[0]} curriculum exceeds the ${limit}-unit semester limit.`);
        }
        if (!selectedCurriculum) throw new Error('Select a curriculum before adding subjects.');
        const curriculum = selectedCurriculum;
        const subjectIds: string[] = [];
        for (const row of curriculumRows) {
          const created = await createSubject({
            code: row.code.toUpperCase(), title: row.title.trim(), units: Number(row.units),
            lectureHours: Number(row.lectureHours),
            yearLevel: Number(row.yearLevel), semester: row.semester, curriculumId: curriculum.id,
            programId: curriculum.programId, programCode: curriculum.programCode, prerequisites: row.prerequisites,
          });
          subjectIds.push(created.id);
        }
        await updateCurriculum(curriculum.id, {subjectIds});
        success(`${curriculumRows.length} curriculum subject${curriculumRows.length === 1 ? '' : 's'} created.`);
      }
      setIsSubjModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save curriculum.');
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    if (!confirm(`Delete Curriculum ${code}?`)) return;
    try {
      await deleteSubject(id);
      success('Curriculum removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete subject.');
    }
  };

  const handleCreateCurriculum = async (event: React.FormEvent) => {
    event.preventDefault();
    const program = programs.find(item => item.id === newCurriculumProgramId);
    if (!program) { error('Select a program first.'); return; }
    try {
      const created = await createCurriculum({
        programId: program.id, programCode: program.code, studentType: curriculumStudentType,
        durationYears: curriculumStudentType === 'evening' ? 5 : 4,
        maxUnitsPerSemester: curriculumStudentType === 'evening' ? 18 : 27,
        subjectIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setCurriculums(items => [...items, created]);
      setSelectedCurriculumId(created.id);
      setIsCurriculumModalOpen(false);
      success(`${program.code} ${curriculumStudentType === 'evening' ? 'Evening' : 'Regular'} Curriculum created.`);
    } catch (err: any) { error(err.message || 'Failed to create curriculum.'); }
  };

  const selectedCurriculum = curriculums.find(item => item.id === selectedCurriculumId);
  const displayedSubjects = selectedCurriculum
    ? subjects.filter(subject => selectedCurriculum.subjectIds?.includes(subject.id) || subject.curriculumId === selectedCurriculum.id)
    : subjects;
  const semesterOrder: Record<string, number> = {'1st Semester': 1, '2nd Semester': 2, Summer: 3};
  const curriculumGroups = Array.from(displayedSubjects.reduce((groups, subject) => {
    const key = `${subject.yearLevel || 0}-${subject.semester || 'Unassigned'}`;
    const group = groups.get(key) || {yearLevel: subject.yearLevel || 0, semester: subject.semester || 'Unassigned', subjects: [] as Subject[]};
    group.subjects.push(subject); groups.set(key, group); return groups;
  }, new Map<string, {yearLevel: number; semester: string; subjects: Subject[]}>()).values())
    .sort((a, b) => a.yearLevel - b.yearLevel || (semesterOrder[a.semester] || 9) - (semesterOrder[b.semester] || 9));
  curriculumGroups.forEach(group => group.subjects.sort((a, b) => a.code.localeCompare(b.code)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs & Curriculum Catalog"
        subtitle="Establish degree programs and organize curriculum subjects."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('programs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
                activeTab === 'programs'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Programs ({programs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
                activeTab === 'subjects'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Curriculum ({curriculums.length})</span>
            </button>
          </div>
        }
      />

      {/* Tab 1: Programs */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => openProgModal()} icon={<Plus className="w-4 h-4" />}>
              Add Program
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#142D59] bg-blue-50 px-2.5 py-1 rounded-lg">
                      {p.code}
                    </span>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mt-2">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{p.department}</p>
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {p.description}
                  </p>
                  <div className="mt-3 text-xs text-slate-600">
                    <span className="font-semibold text-[#142D59]">Assigned Chair:</span>{' '}
                    {p.chairName || 'Unassigned'}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button variant="ghost" size="sm" onClick={() => openProgModal(p)} icon={<Edit className="w-3.5 h-3.5" />}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProgram(p.id, p.code)} className="text-rose-600" icon={<Trash2 className="w-3.5 h-3.5" />}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Sections */}
      {false && activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => openSecModal()} icon={<Plus className="w-4 h-4" />}>
              Add Section
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#142D59]">{s.programCode}</span>
                    <Badge variant="navy" size="sm">Year {s.yearLevel}</Badge>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 mt-1">{s.name}</h4>
                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div>Adviser: <span className="font-semibold text-slate-700">{s.adviserName || 'None'}</span></div>
                    <div>Capacity: <span className="font-semibold text-slate-700">{s.maxCapacity} students</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 pt-3 mt-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" onClick={() => openSecModal(s)} icon={<Edit className="w-3 h-3" />}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(s.id, s.name)} className="text-rose-600" icon={<Trash2 className="w-3 h-3" />}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Curriculum */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => { setNewCurriculumProgramId(programs[0]?.id || ''); setCurriculumStudentType('regular'); setIsCurriculumModalOpen(true); }} icon={<Plus className="w-4 h-4" />}>
              Add Curriculum
            </Button>
          </div>
          {curriculums.length > 0 && <div className="grid gap-4 md:grid-cols-2">
            {curriculums.map(curriculum => {
              const program = programs.find(item => item.id === curriculum.programId);
              const curriculumSubjects = subjects.filter(subject => curriculum.subjectIds?.includes(subject.id) || subject.curriculumId === curriculum.id);
              const selected = curriculum.id === selectedCurriculumId;
              return <button type="button" key={curriculum.id} onClick={() => setSelectedCurriculumId(curriculum.id)} aria-pressed={selected} className={`rounded-xl border bg-white p-5 text-left shadow-xs ${selected ? 'border-royal ring-2 ring-blue-100' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-royal">{curriculum.programCode || program?.code}</p><h3 className="mt-1 text-lg font-bold text-primary">{curriculum.programCode || program?.code} Curriculum</h3><p className="mt-1 text-sm text-slate-600">{curriculum.studentType === 'evening' ? 'Evening track' : 'Regular track'} · {curriculum.durationYears} years · up to {curriculum.maxUnitsPerSemester} units/semester</p></div>
                  <Badge variant="navy">{curriculumSubjects.length} subjects</Badge>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-royal">{selected ? 'Selected · View subjects below' : 'Select to view subjects'}</div>
              </button>;
            })}
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-primary">{selectedCurriculum ? `${selectedCurriculum.programCode} ${selectedCurriculum.studentType === 'evening' ? 'Evening' : 'Regular'} Curriculum Subjects` : 'Curriculum subjects'}</h3><p className="text-sm text-slate-600">{selectedCurriculum ? 'Subjects included in the selected curriculum.' : 'Select a curriculum to view its subjects.'}</p></div>{selectedCurriculum && <Button type="button" variant="primary" size="sm" onClick={() => openSubjModal()} icon={<Plus className="size-4" />}>Add Subject</Button>}</div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Sub Code</th>
                  <th className="py-3.5 px-4">Sub Desc</th>
                  <th className="py-3.5 px-4">Total Unit</th>
                  <th className="py-3.5 px-4">Credit Earned</th>
                  <th className="py-3.5 px-4">Prerequisites</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {curriculumGroups.map(group => <React.Fragment key={`${group.yearLevel}-${group.semester}`}>
                  <tr className="bg-blue-50"><td colSpan={6} className="px-4 py-3 font-bold text-primary underline">{group.yearLevel ? `${group.yearLevel}${group.yearLevel === 1 ? 'st' : group.yearLevel === 2 ? 'nd' : group.yearLevel === 3 ? 'rd' : 'th'} Year, ${group.semester}` : group.semester}</td></tr>
                  {group.subjects.map(sub => <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-primary">{sub.code}</td><td className="py-3 px-4 font-medium text-slate-800">{sub.title}</td><td className="py-3 px-4 font-semibold text-slate-700">{sub.units}.0</td><td className="py-3 px-4 text-slate-500">—</td><td className="py-3 px-4 text-slate-600">{sub.prerequisites?.length ? sub.prerequisites.join(', ') : 'None'}</td><td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1.5"><Button variant="ghost" size="sm" onClick={() => openSubjModal(sub)} icon={<Edit className="size-3.5" />}>Edit</Button><Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(sub.id, sub.code)} className="text-rose-600" icon={<Trash2 className="size-3.5" />}>Delete</Button></div></td>
                  </tr>)}
                  <tr className="border-b border-slate-200"><td colSpan={6} className="px-4 py-3 text-right text-xs font-bold uppercase text-primary">Total required units: {group.subjects.reduce((sum, subject) => sum + subject.units, 0).toFixed(1)}</td></tr>
                </React.Fragment>)}
                {displayedSubjects.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-600">No subjects are linked to this curriculum yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Program Modal */}
      <Modal
        isOpen={isProgModalOpen}
        onClose={() => setIsProgModalOpen(false)}
        title={editingProg ? 'Edit Academic Program' : 'New Academic Program'}
        subtitle="Master Curriculum Registration"
      >
        <form onSubmit={handleSaveProgram} className="space-y-4">
          <Input label="Program Code" placeholder="BSCS" value={progCode} onChange={e => setProgCode(e.target.value)} required />
          <Input label="Full Degree Name" placeholder="Bachelor of Science in Computer Science" value={progName} onChange={e => setProgName(e.target.value)} required />
          <Select label="Assign Program Chair" value={progChairId} onChange={e => setProgChairId(e.target.value)}>
            <option value="">Select Program Chair...</option>
            {chairs.map(c => (
              <option key={c.uid} value={c.uid}>{c.fullName} ({c.idNumber})</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProgModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Program</Button>
          </div>
        </form>
      </Modal>

      {/* Section Modal */}
      <Modal
        isOpen={isSecModalOpen}
        onClose={() => setIsSecModalOpen(false)}
        title={editingSec ? 'Edit Section' : 'New Section'}
        subtitle="Section Cohort Allocation"
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <Input label="Section Name" placeholder="BSCS 1-A" value={secName} onChange={e => setSecName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Program" value={secProgramId} onChange={e => setSecProgramId(e.target.value)}>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </Select>
            <Select label="Year Level" value={secYear} onChange={e => setSecYear(Number(e.target.value))}>
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
            </Select>
          </div>
          <Select label="Section Adviser" value={secAdviserId} onChange={e => setSecAdviserId(e.target.value)}>
            <option value="">Select Faculty Adviser...</option>
            {teachers.map(t => (
              <option key={t.uid} value={t.uid}>{t.fullName}</option>
            ))}
          </Select>
          <Input label="Max Student Capacity" type="number" min={10} max={100} value={secCapacity} onChange={e => setSecCapacity(Number(e.target.value))} required />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSecModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Section</Button>
          </div>
        </form>
      </Modal>

      {/* Curriculum Modal */}
      <Modal isOpen={isCurriculumModalOpen} onClose={() => setIsCurriculumModalOpen(false)} title="New Curriculum" subtitle="Create a curriculum container before adding subjects">
        <form onSubmit={handleCreateCurriculum} className="space-y-4">
          <Select label="Program / Course" value={newCurriculumProgramId} onChange={e => setNewCurriculumProgramId(e.target.value)} required>
            <option value="">Select program</option>
            {programs.map(program => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
          </Select>
          <Select label="Student Type" value={curriculumStudentType} onChange={e => setCurriculumStudentType(e.target.value as 'regular' | 'evening')}>
            <option value="regular">Regular — 4 years, up to 27 units/semester</option>
            <option value="evening">Evening — 5 years, up to 18 units/semester</option>
          </Select>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="outline" size="sm" onClick={() => setIsCurriculumModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" size="sm">Create Curriculum</Button></div>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjModalOpen}
        onClose={() => setIsSubjModalOpen(false)}
        title={editingSubj ? 'Edit Curriculum Entry' : 'New Curriculum Entry'}
        subtitle="Course Catalog Registry"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {editingSubj && <Select label="Program" value={subjProgramId} onChange={e => setSubjProgramId(e.target.value)}>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
          </Select>}
          {false && <Select label="Curriculum Student Type" value={curriculumStudentType} onChange={e => setCurriculumStudentType(e.target.value as 'regular' | 'evening')}>
            <option value="regular">Regular — 4 years, up to 27 units/semester</option>
            <option value="evening">Evening — 5 years, up to 18 units/semester</option>
          </Select>}
          {editingSubj ? <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Course Code" placeholder="CS101" value={subjCode} onChange={e => setSubjCode(e.target.value)} required />
              <Input label="Course Title" placeholder="Introduction to Programming" value={subjTitle} onChange={e => setSubjTitle(e.target.value)} required />
            </div>
            <Select label="Prerequisites" multiple value={subjPrerequisites} onChange={e => setSubjPrerequisites(Array.from(e.target.selectedOptions, option => option.value))} className="min-h-24">
              {subjects.filter(item => item.id !== editingSubj?.id && item.programId === subjProgramId).map(item => <option key={item.id} value={item.code}>{item.code} · {item.title}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Year Level" value={subjYearLevel} onChange={e => setSubjYearLevel(Number(e.target.value))}>
                <option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option><option value={5}>5th Year</option>
              </Select>
              <Select label="Semester" value={subjSemester} onChange={e => setSubjSemester(e.target.value as Subject['semester'])}>
                <option>1st Semester</option><option>2nd Semester</option><option>Summer</option>
              </Select>
            </div>
            <Select label="Student Type" value={subjStudentType} onChange={e => setSubjStudentType(e.target.value as 'regular' | 'evening')}>
              <option value="regular">Regular — up to 27 units/semester</option>
              <option value="evening">Evening — up to 18 units/semester</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Units" type="number" min={1} max={6} value={subjUnits} onChange={e => setSubjUnits(Number(e.target.value))} required />
              <Input label="Lecture Hours" type="number" min={0} max={10} value={subjLec} onChange={e => setSubjLec(Number(e.target.value))} required />
            </div>
          </> : <div className="space-y-3">
            {curriculumRows.map((row, index) => <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold text-primary">Subject {index + 1}</p>{curriculumRows.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setCurriculumRows(rows => rows.filter((_, i) => i !== index))}>Remove</Button>}</div>
              <div className="grid gap-3 sm:grid-cols-2"><Input label="Course Code" placeholder="CS101" value={row.code} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, code: e.target.value} : item))} required /><Input label="Course Title" placeholder="Introduction to Programming" value={row.title} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, title: e.target.value} : item))} required /></div>
              <Select label="Prerequisites" multiple value={row.prerequisites} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, prerequisites: Array.from(e.target.selectedOptions, option => option.value)} : item))} className="min-h-24" helperText="Hold Ctrl or Command to select multiple subjects.">
                {[
                  ...subjects.filter(item => item.programId === subjProgramId),
                  ...curriculumRows.filter((item, i) => i !== index && item.code.trim()).map((item, i) => ({id: `draft-${i}`, code: item.code.trim().toUpperCase(), title: item.title || 'New subject'})),
                ].filter((item, optionIndex, list) => item.code !== row.code.trim().toUpperCase() && list.findIndex(candidate => candidate.code === item.code) === optionIndex).map(item => <option key={item.id} value={item.code}>{item.code} · {item.title}</option>)}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Select label="Year Level" value={row.yearLevel} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, yearLevel: Number(e.target.value)} : item))}><option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option><option value={5}>5th Year</option></Select><Select label="Semester" value={row.semester} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, semester: e.target.value as Subject['semester']} : item))}><option>1st Semester</option><option>2nd Semester</option><option>Summer</option></Select><Input label="Units" type="number" min={1} max={6} value={row.units} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, units: Number(e.target.value)} : item))} required /><Input label="Lecture Hours" type="number" min={0} max={10} value={row.lectureHours} onChange={e => setCurriculumRows(rows => rows.map((item, i) => i === index ? {...item, lectureHours: Number(e.target.value)} : item))} required /></div>
            </div>)}
            <Button type="button" variant="outline" size="sm" icon={<Plus className="size-4" />} onClick={() => setCurriculumRows(rows => [...rows, {code: '', title: '', units: 3, lectureHours: 2, yearLevel: 1, semester: '1st Semester', prerequisites: []}])}>Add another subject</Button>
          </div>}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSubjModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Curriculum</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
