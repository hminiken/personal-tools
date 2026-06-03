import { getYarnStash } from "./_actions/stash_actions";
import StashClient from "./_components/StashClient";

export const dynamic = 'force-dynamic';

export default async function YarnStashPage() {
  // 1. Fetch data on the server
  const rawYarn = await getYarnStash();

  // 2. Format it into simple JSON data
  const stashItems = rawYarn.map(yarn => ({
    ...yarn,
    coverImagePath: yarn.coverImagePath || 'https://placehold.co/600x400?text=No+Photo',
  }));

  // 3. Pass the simple data across the boundary to the Client Wrapper
  return <StashClient stashItems={stashItems} />;
}