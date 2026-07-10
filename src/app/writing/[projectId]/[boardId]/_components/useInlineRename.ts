'use client';

import { useState } from 'react';

// Shared "double-click (or menu) to rename" behavior used by group/list
// headers: a local draft seeded from `value`, committed (trimmed) on
// blur/Enter only if it actually changed and isn't empty — otherwise the
// draft reverts to `value`. Escape reverts and exits editing immediately.
export function useInlineRename({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== value) onCommit(t);
    else setDraft(value);
    setEditing(false);
  };

  const inputProps = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.currentTarget.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    },
    autoFocus: true,
  };

  return { editing, setEditing, draft, setDraft, inputProps };
}
