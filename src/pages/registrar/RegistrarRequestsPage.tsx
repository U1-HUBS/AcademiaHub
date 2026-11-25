import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, RefreshCw, XCircle, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getWorkflowRequests, updateWorkflowRequest, deleteWorkflowRequest } from '../../services/registrarWorkflowService';
import type { RegistrarWorkflowRequest } from '../../types';

const activeStatuses = ['submitted', 'under_review'];
const label = (status: string) => status.replaceAll('_', ' ');

export function RegistrarRequestsPage() {
  const { user } = useAuth();
  const { error, success } = useToast();
  const [rows, setRows] = useState<RegistrarWorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrarWorkflowRequest | null>(null);
  const load = async () => { setLoading(true); try { setRows((await getWorkflowRequests()).filter(item => item.type === 'add_drop')); } catch { error('Could not load Registrar requests.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const active = useMemo(() => rows.filter(item => activeStatuses.includes(item.status)), [rows]);
  const history = useMemo(() => rows.filter(item => !activeStatuses.includes(item.status)), [rows]);
  const decide = async (item: RegistrarWorkflowRequest, status: RegistrarWorkflowRequest['status']) => {
    const reviewedAt = new Date().toISOString();
    try { await updateWorkflowRequest(item.id, {status, reviewedBy: user?.uid, reviewedAt}); setRows(current => current.map(row => row.id === item.id ? {...row, status, reviewedBy: user?.uid, reviewedAt} : row)); success(`Request ${status === 'approved' ? 'accepted' : status === 'denied' ? 'denied' : 'moved to review'}.`); } catch { error('Could not update this request.'); }
  };
  const remove = async (item: RegistrarWorkflowRequest) => { if (!window.confirm(`Delete the request from ${item.studentName}? This cannot be undone.`)) return; try { await deleteWorkflowRequest(item.id); setRows(current => current.filter(row => row.id !== item.id)); success('Request deleted.'); } catch { error('Could not delete this request.'); } };
  const card = (item: RegistrarWorkflowRequest, isHistory = false) => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><button type="button" className="text-left font-semibold text-navy underline-offset-2 focus-visible:underline" onClick={() => setSelectedRequest(item)}>{item.title}</button><p className="text-xs text-slate-600">{item.studentName}</p><p className="mt-2 text-sm text-slate-700">{item.details || 'No additional details.'}</p>{isHistory && item.reviewedAt && <p className="mt-2 text-xs text-slate-500">Updated {new Date(item.reviewedAt).toLocaleString()}</p>}</div><Badge variant="info">{label(item.status)}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" icon={<Eye className="size-4" />} onClick={() => setSelectedRequest(item)}>View request</Button>{!isHistory && <><Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => void decide(item, 'approved')}>Accept</Button><Button size="sm" variant="outline" onClick={() => void decide(item, 'under_review')}>Review</Button><Button size="sm" variant="ghost" icon={<XCircle className="size-4" />} onClick={() => void decide(item, 'denied')}>Deny</Button></>}{isHistory && <Button size="sm" variant="outline" icon={<Trash2 className="size-4" />} onClick={() => void remove(item)}>Delete record</Button>}</div></div>;
  return <div className="space-y-6"><PageHeader title="Registrar Requests" subtitle="Accept, review, or deny student Add/Drop requests. Completed decisions are retained in history." actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} /><Card><CardHeader><div><CardTitle>Active requests</CardTitle><p className="text-sm text-slate-600">Requests requiring a Registrar decision.</p></div><Badge variant="navy">{active.length} active</Badge></CardHeader><CardContent>{loading ? <p role="status">Loading requests…</p> : active.length ? <div className="space-y-3">{active.map(item => card(item))}</div> : <p className="py-8 text-center text-sm text-slate-600">No active requests.</p>}</CardContent></Card><Card><CardHeader><div><CardTitle>Request history</CardTitle><p className="text-sm text-slate-600">Accepted, reviewed, and denied requests remain saved here.</p></div><Badge variant="info">{history.length} records</Badge></CardHeader><CardContent>{history.length ? <div className="space-y-3">{history.map(item => card(item, true))}</div> : <p className="py-8 text-center text-sm text-slate-600">No request history.</p>}</CardContent></Card><Modal isOpen={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} title={selectedRequest?.title || 'Request details'} subtitle={selectedRequest?.studentName}><div className="space-y-4 text-sm"><div className="rounded-lg border border-slate-200 p-4"><p className="text-xs uppercase text-slate-500">Status</p><p className="mt-1 font-semibold text-navy">{selectedRequest ? label(selectedRequest.status) : ''}</p></div><div><p className="text-xs uppercase text-slate-500">Request details</p><p className="mt-1 whitespace-pre-wrap text-slate-700">{selectedRequest?.details || 'No additional details.'}</p></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-slate-500">Submitted</p><p className="mt-1 text-slate-700">{selectedRequest?.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : '—'}</p></div><div><p className="text-xs uppercase text-slate-500">Last reviewed</p><p className="mt-1 text-slate-700">{selectedRequest?.reviewedAt ? new Date(selectedRequest.reviewedAt).toLocaleString() : 'Not reviewed'}</p></div></div><div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button></div></div></Modal></div>;
}
