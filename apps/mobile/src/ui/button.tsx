import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { cn } from './cn';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const containerByVariant: Record<Variant, string> = {
  default: 'bg-primary active:opacity-85',
  outline: 'border border-border bg-transparent active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-danger active:opacity-85',
  secondary: 'bg-muted active:opacity-85',
};

const textByVariant: Record<Variant, string> = {
  default: 'text-primary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-white',
  secondary: 'text-foreground',
};

const containerBySize: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-lg',
  md: 'h-11 px-4 rounded-xl',
  lg: 'h-12 px-5 rounded-2xl',
};

const textBySize: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
};

export function Button({
  variant = 'default',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  children,
  fullWidth,
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        containerByVariant[variant],
        containerBySize[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-60',
      )}
      style={style}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' || variant === 'destructive' ? '#fff' : '#0A0A0C'}
        />
      ) : (
        leftIcon
      )}
      <Text className={cn('font-semibold', textByVariant[variant], textBySize[size])}>
        {children}
      </Text>
      {!loading && rightIcon}
    </Pressable>
  );
}
