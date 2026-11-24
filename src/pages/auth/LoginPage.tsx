import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { PasswordField } from '../../components/ui/PasswordField';
import { authErrorMessage } from '../../services/authService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { login, user } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    if (!identifier || !password) {
      setFormError('Enter your Student ID or institutional email and password.');
      return;
    }

    setFormError('');
    setIsLoading(true);
    try {
      const user = await login(identifier, password);
      success(`Welcome back, ${user.fullName}!`);

      const roleRedirect: Record<string, string> = {
        registrar: '/registrar/dashboard',
        program_chair: '/chair/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
      };
      navigate(user.mustChangePassword ? '/change-password' : roleRedirect[user.role] || '/', {replace: true});
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (user && !isLoading) return <Navigate to="/" replace />;

  return (
    <AuthLayout title="Sign in to your portal" description="Students sign in with their Student ID Number. Staff sign in with their institutional email.">
      <form className="space-y-5" onSubmit={handleLogin}>
        <Input
          label="Student ID or institutional email"
          name="username"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="username"
          placeholder="2026-0001 or name@example.edu"
          value={identifier}
          onChange={event => setIdentifier(event.target.value)}
          leftIcon={<UserRound className="size-4" />}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
        />
        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-relaxed text-rose-800">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isLoading} icon={<ArrowRight className="size-4" />}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-600">
        Need account access or forgot your password? Contact the Registrar.
      </p>
    </AuthLayout>
  );
};
