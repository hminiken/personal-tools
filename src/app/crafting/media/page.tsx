// src/app/crafting/media/page.tsx
import { db } from '@/db';
import { images, patterns, projects, yarns } from '@/db/schema';
import { MediaGrid } from './_components/MediaGrid';


export default async function MediaLibraryPage() {
    const allMedia = await db.query.images.findMany({
        with: {
            pattern: true,
            project: true,
            yarn: true
        }
    });

    // A simple way to log and see what's actually coming back from the DB
    // console.log(JSON.stringify(allMedia, null, 2));

    return (
        <main>
            {/* Added a small helper to filter orphans */}
            <MediaGrid media={allMedia} />
        </main>
    );
}