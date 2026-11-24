import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { PasswordField } from '../../components/ui/PasswordField';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authErrorMessage, isStrongPassword, PASSWORD_GUIDANCE } from '../../services/authService';

export function ChangePasswordPage() {
  const { user, loading, logout, changePassword } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!isStrongPassword(next) || next === current || next !== confirmation) {
      setError('Check the password requirements and make sure the new passwords match.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await changePassword(current, next, confirmation);
      success('Password changed successfully.');
      navigate('/', {replace: true});
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !busy && !user) return <p className="p-8 text-[#142D59]" role="status">Verifying your session…</p>;
  if (!user && !busy) return <Navigate to="/login" replace />;
  if (user && !user.mustChangePassword && user.role !== 'student' && !busy) return <Navigate to="/" replace />;

  const meetsPolicy = isStrongPassword(next);
  const matches = confirmation.length > 0 && next === confirmation;

  return (
    <AuthLayout
      title="Change your password"
      description={user?.mustChangePassword ? 'Set a new password to continue to your portal.' : 'Confirm your current password and choose a new one.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField label="Current password" name="currentPassword" autoComplete="current-password"
          value={current} onChange={event => setCurrent(event.target.value)} required />
        <PasswordField label="New password" name="newPassword" autoComplete="new-password" maxLength={128}
          value={next} onChange={event => setNext(event.target.value)} helperText={PASSWORD_GUIDANCE} required />
        <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" maxLength={128}
          value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
        {(next || confirmation) && (
          <ul className="space-y-1 text-xs text-slate-700" aria-label="Password validation">
            {next && <li>{meetsPolicy ? '✓ Password meets the strength requirements.' : 'Password does not yet meet the strength requirements.'}</li>}
            {current && next === current && <li>Choose a password different from your current password.</li>}
            {confirmation && <li>{matches ? '✓ New passwords match.' : 'New passwords do not match.'}</li>}
          </ul>
        )}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <Button type="submit" className="w-full" isLoading={busy}>{busy ? 'Updating password…' : 'Change password'}</Button>
        <Button type="button" className="w-full" variant="ghost" disabled={busy} onClick={logout}>Sign out</Button>
      </form>
    </AuthLayout>
  );
}
