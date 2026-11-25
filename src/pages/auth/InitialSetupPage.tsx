import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Mail, User, Phone } from 'lucide-react';
import { setupRegistrarClient } from '../../services/accountApi';
import { isFirebaseConfigured } from '../../services/firebase';
import { authErrorMessage, isStrongPassword, PASSWORD_GUIDANCE } from '../../services/authService';
import { PasswordField } from '../../components/ui/PasswordField';

export const InitialSetupPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const freeHostedSetup = isFirebaseConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true';

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!firstName || !lastName || !email || !password || (!freeHostedSetup && !setupKey)) {
      setFormError('Please complete all required fields.');
      return;
    }

    if (!isStrongPassword(password)) {
      setFormError(PASSWORD_GUIDANCE);
      return;
    }
    setFormError('');
    setIsLoading(true);
    try {
      await setupRegistrarClient({firstName, lastName, email, password, phone});
      await login(email, password);
      success('Initial Registrar account configured successfully.');
      navigate('/registrar/dashboard');
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set up the Registrar account"
      description="Create the primary Registrar account to initialize the academic system."
    >
      <form className="space-y-4" onSubmit={handleSetup}>
        <PasswordField label={freeHostedSetup ? 'Local setup note (optional)' : 'Registrar setup key'} name="setupKey" autoComplete="off" value={setupKey}
          onChange={event => setSetupKey(event.target.value)} required />
        <div className="grid gap-4 min-[420px]:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={event => setFirstName(event.target.value)}
            leftIcon={<User className="size-4" />}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={event => setLastName(event.target.value)}
            required
          />
        </div>

        <Input
          label="Institutional email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="registrar@example.edu"
          value={email}
          onChange={event => setEmail(event.target.value)}
          leftIcon={<Mail className="size-4" />}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          helperText={PASSWORD_GUIDANCE}
          required
        />
        <Input
          label="Contact phone (optional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          leftIcon={<Phone className="size-4" />}
        />
        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-relaxed text-rose-800">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Setting up…' : 'Create Registrar account'}
        </Button>
      </form>
    </AuthLayout>
  );
};
