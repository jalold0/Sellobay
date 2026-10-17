'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

import { Input, type InputProps } from './input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** UI paketi i18n kontekstiga ega emas — tugma nomlari chaqiruvchidan. */
  labels?: { show: string; hide: string };
}

/**
 * Parol maydoni + «ko'rsatish» tugmasi (ko'z). Foydalanuvchi nima yozayotganini tekshira
 * oladi — ayniqsa telefonda va uzun parollarda xato kamayadi.
 * Tugma `aria-pressed` bilan holatini aytadi; bosilganda fokus maydonda qoladi.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { className, labels = { show: "Parolni ko'rsatish", hide: 'Parolni yashirish' }, ...props },
    ref,
  ) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Sichqoncha bosilganda maydondan fokus ketmasin.
          onMouseDown={(e) => e.preventDefault()}
          aria-label={visible ? labels.hide : labels.show}
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md outline-none focus-visible:ring-2"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
