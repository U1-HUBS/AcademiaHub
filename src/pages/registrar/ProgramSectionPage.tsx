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
import { Program, Section, Subject, UserProfile } from '../../types';
import { FolderKanban, Plus, Edit, Trash2, BookOpen, Layers, Library } from 'lucide-react';

export const ProgramSectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'programs' | 'sections' | 'subjects'>('programs');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
  const [editingSubj, setEditingSubj] = useState<Subject | null>(null);
  const [subjCode, setSubjCode] = useState('');
  const [subjTitle, setSubjTitle] = useState('');
  const [subjUnits, setSubjUnits] = useState(3);
  const [subjLec, setSubjLec] = useState(2);
  const [subjLab, setSubjLab] = useState(3);
  const [subjProgramId, setSubjProgramId] = useState('');

  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, subjs, users] = await Promise.all([
        getAllPrograms(),
        getAllSections(),
        getAllSubjects(),
        getAllUsers(),
      ]);
      setPrograms(p);
      setSections(s);
      setSubjects(subjs);
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
      setSubjLab(sub.labHours);
      setSubjProgramId(sub.programId);
    } else {
      setEditingSubj(null);
      setSubjCode('');
      setSubjTitle('');
      setSubjUnits(3);
      setSubjLec(2);
      setSubjLab(3);
      setSubjProgramId(programs[0]?.id || '');
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
          labHours: Number(subjLab),
          programId: subjProgramId,
          programCode: prog?.code || '',
        });
        success('Subject updated.');
      } else {
        await createSubject({
          code: subjCode.toUpperCase(),
          title: subjTitle,
          units: Number(subjUnits),
          lectureHours: Number(subjLec),
          labHours: Number(subjLab),
          programId: subjProgramId,
          programCode: prog?.code || '',
        });
        success('New Subject catalog item created.');
      }
      setIsSubjModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save subject.');
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    if (!confirm(`Delete Subject ${code}?`)) return;
    try {
      await deleteSubject(id);
      success('Subject removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete subject.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs, Sections & Catalog"
        subtitle="Establish degree programs, cohort sections, and academic course catalogs."
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
              onClick={() => setActiveTab('sections')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
                activeTab === 'sections'
                  ? 'bg-[#142D59] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Sections ({sections.length})</span>
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
              <span>Subjects ({subjects.length})</span>
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
      {activeTab === 'sections' && (
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

      {/* Tab 3: Subjects */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => openSubjModal()} icon={<Plus className="w-4 h-4" />}>
              Add Subject
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Subject Code</th>
                  <th className="py-3.5 px-4">Subject Title</th>
                  <th className="py-3.5 px-4">Units</th>
                  <th className="py-3.5 px-4">Hours (Lec/Lab)</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-[#142D59]">{sub.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{sub.title}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{sub.units}</td>
                    <td className="py-3 px-4 text-slate-500">{sub.lectureHours}h lec / {sub.labHours}h lab</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">{sub.programCode}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openSubjModal(sub)} icon={<Edit className="w-3.5 h-3.5" />}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(sub.id, sub.code)} className="text-rose-600" icon={<Trash2 className="w-3.5 h-3.5" />}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
          <div className="grid grid-cols-2 gap-3">
            <Input label="Program Code" placeholder="BSCS" value={progCode} onChange={e => setProgCode(e.target.value)} required />
            <Input label="Department" placeholder="College of Computer Studies" value={progDept} onChange={e => setProgDept(e.target.value)} required />
          </div>
          <Input label="Full Degree Name" placeholder="Bachelor of Science in Computer Science" value={progName} onChange={e => setProgName(e.target.value)} required />
          <Select label="Assign Program Chair" value={progChairId} onChange={e => setProgChairId(e.target.value)}>
            <option value="">Select Program Chair...</option>
            {chairs.map(c => (
              <option key={c.uid} value={c.uid}>{c.fullName} ({c.idNumber})</option>
            ))}
          </Select>
          <Input label="Curriculum Description" placeholder="Overview of program..." value={progDesc} onChange={e => setProgDesc(e.target.value)} />
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

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjModalOpen}
        onClose={() => setIsSubjModalOpen(false)}
        title={editingSubj ? 'Edit Subject Offering' : 'New Subject Offering'}
        subtitle="Course Catalog Registry"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" placeholder="CS101" value={subjCode} onChange={e => setSubjCode(e.target.value)} required />
            <Select label="Program" value={subjProgramId} onChange={e => setSubjProgramId(e.target.value)}>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </Select>
          </div>
          <Input label="Course Title" placeholder="Introduction to Programming" value={subjTitle} onChange={e => setSubjTitle(e.target.value)} required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Units" type="number" min={1} max={6} value={subjUnits} onChange={e => setSubjUnits(Number(e.target.value))} required />
            <Input label="Lecture Hours" type="number" min={0} max={10} value={subjLec} onChange={e => setSubjLec(Number(e.target.value))} required />
            <Input label="Lab Hours" type="number" min={0} max={10} value={subjLab} onChange={e => setSubjLab(Number(e.target.value))} required />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSubjModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Subject</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
