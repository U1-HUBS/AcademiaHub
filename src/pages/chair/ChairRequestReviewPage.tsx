import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { getWorkflowRequests, updateWorkflowRequest } from '../../services/registrarWorkflowService';
import type { RegistrarWorkflowRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';

export function ChairRequestReviewPage() {
  const {error, success} = useToast(); const {user} = useAuth(); const [rows, setRows] = useState<RegistrarWorkflowRequest[]>([]); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setRows((await getWorkflowRequests()).filter(item => item.type === 'add_drop')); } catch { error('Could not load Add/Drop requests.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const review = async (item: RegistrarWorkflowRequest, status: RegistrarWorkflowRequest['status']) => { try { const reviewedAt = new Date().toISOString(); await updateWorkflowRequest(item.id, {status, reviewedBy: user?.uid, reviewedAt}); setRows(current => current.map(row => row.id === item.id ? {...row, status, reviewedBy: user?.uid, reviewedAt} : row)); success('Request moved to review history.'); } catch { error('Could not update the request.'); } };
  const activeRows = useMemo(() => rows.filter(item => ['submitted', 'under_review'].includes(item.status)), [rows]);
  const historyRows = useMemo(() => rows.filter(item => !['submitted', 'under_review'].includes(item.status)), [rows]);
  const requestCard = (item: RegistrarWorkflowRequest, history = false) => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-navy">{item.title}</p><p className="text-xs text-slate-600">{item.studentName}</p><p className="mt-2 text-sm text-slate-700">{item.details || 'No additional details.'}</p>{history && item.reviewedAt && <p className="mt-2 text-xs text-slate-500">Reviewed {new Date(item.reviewedAt).toLocaleString()}</p>}</div><Badge variant="info">{item.status.replaceAll('_', ' ')}</Badge></div>{!history && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" icon={<FileCheck2 className="size-4" />} onClick={() => void review(item, 'processing')}>Approve for Registrar</Button><Button size="sm" variant="outline" onClick={() => void review(item, 'for_compliance')}>For compliance</Button><Button size="sm" variant="ghost" onClick={() => void review(item, 'denied')}>Deny</Button></div>}</div>;
  return <div className="space-y-6"><PageHeader title="Add/Drop Review" subtitle="Review student requests before Registrar verification." actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} /><Card><CardHeader><div><CardTitle>Active student requests</CardTitle><p className="text-sm text-slate-600">Requests here still need a Chair decision. Completed decisions move to history.</p></div><Badge variant="navy">{activeRows.length} active</Badge></CardHeader><CardContent>{loading ? <p role="status">Loading requests…</p> : activeRows.length === 0 ? <p className="py-6 text-center text-sm text-slate-600">No Add/Drop requests are waiting.</p> : <div className="space-y-3">{activeRows.map(item => requestCard(item))}</div>}</CardContent></Card><Card><CardHeader><div><CardTitle>Review history</CardTitle><p className="text-sm text-slate-600">Approved, returned for compliance, and denied requests remain saved here.</p></div><Badge variant="info">{historyRows.length} records</Badge></CardHeader><CardContent>{historyRows.length === 0 ? <p className="py-6 text-center text-sm text-slate-600">No reviewed requests yet.</p> : <div className="space-y-3">{historyRows.map(item => requestCard(item, true))}</div>}</CardContent></Card></div>;
}
