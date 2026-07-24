// Character cards carry an ordered list of named text fields (in addition to
// the normal image gallery + content editor) — see cards.characterFields in
// the schema. Stored as a JSON array so fields can be freely added, renamed,
// reordered, and deleted per card without a separate table.
export type CharacterField = {
  id: string;
  label: string;
  value: string;
};

// Seeded onto a card the first time it's switched to a character card.
export function defaultCharacterFields(): CharacterField[] {
  return [
    { id: crypto.randomUUID(), label: 'Background', value: '' },
    { id: crypto.randomUUID(), label: 'Appearance', value: '' },
    { id: crypto.randomUUID(), label: 'Internal conflicts', value: '' },
    { id: crypto.randomUUID(), label: 'External conflicts', value: '' },
    { id: crypto.randomUUID(), label: 'Personality', value: '' },
    { id: crypto.randomUUID(), label: 'Role in story', value: '' },
  ];
}

export function parseCharacterFields(json: string | null | undefined): CharacterField[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is CharacterField => f && typeof f.id === 'string' && typeof f.label === 'string' && typeof f.value === 'string'
    );
  } catch {
    return [];
  }
}

export function serializeCharacterFields(fields: CharacterField[]): string {
  return JSON.stringify(fields);
}
