// src/app/misc/page.tsx
import { MiscTools } from './_components/MiscTools';
import { getScriptInfos } from './_lib/scripts';

export default function MiscToolsPage() {
  return (
    <main>
      <MiscTools scripts={getScriptInfos()} />
    </main>
  );
}
