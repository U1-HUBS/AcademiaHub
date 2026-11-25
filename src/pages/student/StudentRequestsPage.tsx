import { useEffect, useState } from 'react';
import { FilePlus2, Send, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveDoc } from '../../services/storage';
import { getStudentCredentialRequirements, getStudentWorkflowRequests } from '../../services/registrarWorkflowService';
import type { CredentialRequirement, RegistrarWorkflowRequest } from '../../types';

const label = (value: string) => value.replaceAll('_', ' ');

export function StudentRequestsPage() {
  const { user } = useAuth();
  const { error, success } = useToast();
  const [requests, setRequests] = useState<RegistrarWorkflowRequest[]>([]);
  const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
  const [type, setType] = useState<RegistrarWorkflowRequest['type']>('document');
  const [title, setTitle] = useState('Certificate of Enrollment');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!user) return;
    try {
      const [rows, requirements] = await Promise.all([getStudentWorkflowRequests(user.uid), getStudentCredentialRequirements(user.uid)]);
      setRequests(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setCredentials(requirements);
    } catch { error('Could not load your requests.'); }
  };
  useEffect(() => { if (user) void load(); }, [user]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim() || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    const request: RegistrarWorkflowRequest = {
      id: `request-${user.uid}-${Date.now()}`,
      type, studentId: user.uid, studentName: user.fullName, title: title.trim(),
      details: details.trim(), status: 'submitted', createdAt: now, updatedAt: now,
    };
    try {
      await saveDoc('registrarRequests', request.id, request);
      setRequests(current => [request, ...current]); setDetails('');
      success('Request submitted to the Registrar.');
    } catch { error('Could not submit your request.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <PageHeader title="Registrar Requests" subtitle="Submit add/drop requests and request official academic documents." />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Card><CardHeader><div><CardTitle>New request</CardTitle><p className="text-sm text-slate-600">Your request will be reviewed by the appropriate office.</p></div></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
        <Select label="Request type" value={type} onChange={event => { const next = event.target.value as RegistrarWorkflowRequest['type']; setType(next); setTitle(next === 'document' ? 'Certificate of Enrollment' : 'Subject add/drop request'); }}>
          <option value="document">Official document</option><option value="add_drop">Subject add/drop</option>
        </Select>
        {type === 'document' ? <Select label="Document requested" value={title} onChange={event => setTitle(event.target.value)}><option>Certificate of Enrollment</option><option>Transcript of Records</option><option>Certificate of Grades</option><option>Certificate of Good Moral</option><option>Honorable Dismissal</option><option>Other document</option></Select> : <Input label="Subject and requested action" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Add CS101 / Drop HUM102" required />}
        <Input label="Details or remarks" value={details} onChange={event => setDetails(event.target.value)} placeholder="Provide context or supporting information" />
        <Button type="submit" isLoading={busy} icon={<Send className="size-4" />}>Submit request</Button>
      </form></CardContent></Card>
      <Card><CardHeader><div><CardTitle>My requests</CardTitle><p className="text-sm text-slate-600">Track review progress and Registrar remarks.</p></div></CardHeader><CardContent>{requests.length === 0 ? <div className="py-8 text-center text-sm text-slate-600"><FilePlus2 className="mx-auto mb-2 size-7 text-royal" />No requests submitted yet.</div> : <div className="space-y-3">{requests.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-navy">{item.title}</p><p className="text-xs capitalize text-slate-600">{label(item.type)} · {new Date(item.createdAt).toLocaleDateString()}</p></div><Badge variant={item.status === 'denied' ? 'danger' : item.status === 'released' ? 'success' : 'info'}>{label(item.status)}</Badge></div>{item.remarks && <p className="mt-3 text-sm text-slate-700">{item.remarks}</p>}</div>)}</div>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Missing credentials</CardTitle><p className="text-sm text-slate-600">Requirements assigned by the Registrar.</p></div></CardHeader><CardContent>{credentials.length === 0 ? <div className="py-6 text-center text-sm text-slate-600"><ShieldCheck className="mx-auto mb-2 size-7 text-royal" />No missing credentials recorded.</div> : <div className="space-y-3">{credentials.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><p className="font-semibold text-navy">{item.requirement}</p>{item.remarks && <p className="text-xs text-slate-600">{item.remarks}</p>}</div><Badge variant={item.status === 'verified' ? 'success' : 'warning'}>{item.status}</Badge></div>)}</div>}</CardContent></Card>
    </div>
  </div>;
}
