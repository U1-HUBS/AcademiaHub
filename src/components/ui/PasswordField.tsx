import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from './Input';

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type' | 'leftIcon' | 'rightIcon'> & {label: string};

export function PasswordField({label, ...props}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      label={label}
      type={visible ? 'text' : 'password'}
      leftIcon={<Lock className="size-4" />}
      rightIcon={(
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-[#142D59] hover:bg-blue-50"
          aria-label={(visible ? 'Hide ' : 'Show ') + label.toLowerCase()}
          aria-pressed={visible}
          onClick={() => setVisible(value => !value)}
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      )}
    />
  );
}
