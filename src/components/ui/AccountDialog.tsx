import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import type { TemporaryCredentials } from '../../services/accountApi';

export function AccountDialog({title, onClose, busy = false, children}: {
  title: string; onClose: () => void; busy?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return (
    <dialog
      ref={ref} aria-labelledby={titleId}
      className="account-dialog credential-theme m-auto w-[calc(100%-2rem)] max-w-md overflow-auto rounded-xl bg-white p-5"
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold text-[#142D59]">{title}</h2>
        <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function CredentialsDialog({credentials, onClose}: {credentials: TemporaryCredentials; onClose: () => void}) {
  const [copyStatus, setCopyStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText('Username: ' + credentials.username + '\nTemporary password: ' + credentials.temporaryPassword);
      setCopyStatus('Credentials copied.');
    } catch {
      setCopyStatus('Could not copy automatically. Select the credentials to copy them.');
    }
  };
  return (
    <AccountDialog title="Temporary sign-in credentials" onClose={onClose}>
      <p className="text-sm text-slate-600">Share these credentials privately. The account holder must choose a new password at sign-in.</p>
      <dl className="my-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
        <div>
          <dt className="font-semibold text-[#142D59]">Username</dt>
          <dd className="break-all font-mono">{credentials.username}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#142D59]">Temporary password</dt>
          <dd className="break-all font-mono">{credentials.temporaryPassword}</dd>
        </div>
      </dl>
      <p role="status" className="mb-3 text-xs text-slate-600">{copyStatus}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={copy}>Copy credentials</Button>
        <Button type="button" onClick={onClose}>Done</Button>
      </div>
    </AccountDialog>
  );
}
