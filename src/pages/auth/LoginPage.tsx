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
    <AuthLayout title="Sign in to AUTOMATE" description="Access your academic management portal." showEyebrow={false} cardClassName="auth-card-login">
      <form className="auth-form" onSubmit={handleLogin}>
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
          <p role="alert" className="auth-error">
            {formError}
          </p>
        )}
        <Button type="submit" variant="accent" className="auth-submit w-full" isLoading={isLoading} icon={<ArrowRight className="size-4" />}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="auth-help">
        Need account access or forgot your password? <span>Contact the Registrar.</span>
      </p>
    </AuthLayout>
  );
};
