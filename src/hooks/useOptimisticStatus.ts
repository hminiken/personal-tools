import { useState } from 'react';

/**
 * Status dropdown state that updates instantly and rolls back if the save
 * fails. `save` is the server action, e.g. (s) => updatePatternStatus(id, s).
 */
export function useOptimisticStatus(
  initial: string | null | undefined,
  save: (status: string) => Promise<{ success: boolean }>,
) {
  const [status, setStatus] = useState(initial ?? '');

  const updateStatus = async (next: string) => {
    const previous = status;
    setStatus(next);
    try {
      const result = await save(next);
      if (!result.success) throw new Error('Database update failed');
    } catch {
      setStatus(previous);
      alert('Failed to save status. Reverting...');
    }
  };

  return [status, updateStatus] as const;
}
