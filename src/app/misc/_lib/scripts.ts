// src/app/misc/_lib/scripts.ts
//
// Registry of scripts runnable from the Misc Tools page. To add a new one,
// add an entry here — the page renders a card with a Run button per entry.
// Commands run with the project root as cwd. Only ids from this registry can
// be executed; the command itself never reaches the client.

export type ScriptDef = {
  id: string;
  label: string;
  description: string;
  command: string;
  args: string[];
};

export const SCRIPTS: ScriptDef[] = [
  {
    id: 'send-to-kindle',
    label: 'Send new books to Kindle',
    description:
      'Emails every unshelved BookLore book to both Kindles, tags it "Sent to kindle", and files it on the Sent to Kindle shelf.',
    command: process.execPath,
    args: ['scripts/send-to-kindle.mjs'],
  },
  {
    id: 'fix-malformed-html-dry',
    label: 'Fix malformed HTML (dry run)',
    description: 'Scans rich-text columns for broken <img> tags and reports what would change. No writes.',
    command: process.execPath,
    args: ['scripts/fix-malformed-html.mjs'],
  },
  {
    id: 'fix-malformed-html-apply',
    label: 'Fix malformed HTML (apply)',
    description: 'Repairs broken <img> tags and writes the cleaned HTML back to the database.',
    command: process.execPath,
    args: ['scripts/fix-malformed-html.mjs', '--apply'],
  },
];

// Shape that is safe to send to the client (no command details).
export type ScriptInfo = Pick<ScriptDef, 'id' | 'label' | 'description'>;

export function getScriptInfos(): ScriptInfo[] {
  return SCRIPTS.map(({ id, label, description }) => ({ id, label, description }));
}
