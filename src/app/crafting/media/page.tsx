// src/app/crafting/media/page.tsx
import { db } from '@/db';
import { MediaGrid } from './_components/MediaGrid';

export const dynamic = 'force-dynamic';

export default async function MediaLibraryPage() {
    // Every image, with whichever pattern/project/yarn it's attached to.
    const allMedia = await db.query.images.findMany({
        with: { pattern: true, project: true, yarn: true },
    });

    return (
        <main>
            <MediaGrid media={allMedia} />
        </main>
    );
}
