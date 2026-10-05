import { getYarnStash } from "./_actions/stash_actions";
import StashClient from "./_components/StashClient";

export const dynamic = 'force-dynamic';

export default async function YarnStashPage() {
  const stashItems = await getYarnStash();
  return <StashClient stashItems={stashItems} />;
}
