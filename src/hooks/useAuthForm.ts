import { useState, useCallback } from 'react';

export interface UseAuthFormOptions<TResult> {
  submit: () => Promise<TResult>;
  defaultErrorMessage: string;
  validate?: () => boolean;
  onSuccess?: (result: TResult) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseAuthFormReturn<TResult, TField extends string> {
  loading: boolean;
  error: string;
  setError: (message: string) => void;
  fieldErrors: Partial<Record<TField, boolean>>;
  setFieldError: (field: TField, value: boolean) => void;
  clearFieldError: (field: TField) => void;
  resetErrors: () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<TResult | undefined>;
}

/**
 * Unified form state + submission handler shared across auth forms.
 * Provides loading/error state, field-level error tracking, and a handleSubmit
 * that runs validate → submit → success/error callbacks.
 */
export function useAuthForm<TResult = unknown, TField extends string = string>(
  options: UseAuthFormOptions<TResult>
): UseAuthFormReturn<TResult, TField> {
  const { submit, defaultErrorMessage, validate, onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TField, boolean>>>({});

  const setFieldError = useCallback((field: TField, value: boolean) => {
    setFieldErrors(prev => ({ ...prev, [field]: value }));
  }, []);

  const clearFieldError = useCallback((field: TField) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetErrors = useCallback(() => {
    setError('');
    setFieldErrors({});
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (validate && !validate()) return undefined;

      setLoading(true);
      setError('');

      try {
        const result = await submit();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : defaultErrorMessage;
        setError(message);
        onError?.(message);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [submit, validate, defaultErrorMessage, onSuccess, onError]
  );

  return {
    loading,
    error,
    setError,
    fieldErrors,
    setFieldError,
    clearFieldError,
    resetErrors,
    handleSubmit,
  };
}
