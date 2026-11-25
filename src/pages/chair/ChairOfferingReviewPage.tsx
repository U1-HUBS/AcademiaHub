import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSubjectOfferings, updateOffering } from '../../services/registrarWorkflowService';
import type { SubjectOffering } from '../../types';

export function ChairOfferingReviewPage() {
  const { user } = useAuth(); const { error, success } = useToast();
  const [rows, setRows] = useState<SubjectOffering[]>([]); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const all = await getSubjectOfferings(); setRows(all.filter(item => !user?.programId || item.programId === user.programId)); } catch { error('Could not load subject offerings.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [user?.programId]);
  const review = async (item: SubjectOffering, status: SubjectOffering['status']) => { try { await updateOffering(item.id, {status, reviewedBy: user?.uid}); setRows(current => current.map(row => row.id === item.id ? {...row, status} : row)); success(status === 'approved' ? 'Subject offering approved.' : 'Revision requested.'); } catch { error('Could not update the subject offering.'); } };
  return <div className="space-y-6"><PageHeader title="Subject Offering Review" subtitle="Review Registrar proposals for your assigned academic program." actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} /><Card><CardHeader><div><CardTitle>Proposed offerings</CardTitle><p className="text-sm text-slate-600">Approve only offerings supported by curriculum sequence and student demand.</p></div></CardHeader><CardContent>{loading ? <p role="status">Loading proposals…</p> : rows.length === 0 ? <p className="text-sm text-slate-600">No offerings are waiting for review.</p> : <div className="space-y-3">{rows.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-navy">{item.subjectCode} · {item.subjectTitle}</p><p className="text-xs text-slate-600">{item.programCode} · Year {item.yearLevel} · {item.academicYear} · {item.semester}</p>{item.demandNote && <p className="mt-2 text-sm text-slate-700">{item.demandNote}</p>}</div><Badge variant={item.status === 'approved' ? 'success' : 'info'}>{item.status.replaceAll('_', ' ')}</Badge></div>{item.status !== 'approved' && <div className="mt-3 flex gap-2"><Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => void review(item, 'approved')}>Approve</Button><Button size="sm" variant="outline" onClick={() => void review(item, 'revision_requested')}>Request revision</Button></div>}</div>)}</div>}</CardContent></Card></div>;
}
