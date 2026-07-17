'use server';

// src/app/misc/_actions/scriptActions.ts
import { execFile } from 'child_process';
import { SCRIPTS } from '../_lib/scripts';

export type RunResult = {
  ok: boolean;
  output: string;
};

const TIMEOUT_MS = 5 * 60 * 1000;

export async function runScript(id: string): Promise<RunResult> {
  const script = SCRIPTS.find((s) => s.id === id);
  if (!script) {
    return { ok: false, output: `Unknown script: ${id}` };
  }

  return new Promise((resolve) => {
    execFile(
      script.command,
      script.args,
      { cwd: process.cwd(), timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join('\n').trim();
        if (error) {
          resolve({ ok: false, output: output || error.message });
        } else {
          resolve({ ok: true, output: output || '(no output)' });
        }
      }
    );
  });
}
