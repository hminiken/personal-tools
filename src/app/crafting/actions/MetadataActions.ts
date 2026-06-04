// _actions/tag_actions.ts
'use server';

import { db } from '@/db'; // Adjust this to your Drizzle db instance
import { patterns } from '@/db/schema'; // Adjust this to your Drizzle schema

export async function getTagSuggestions() {
    try {
        // 1. Fetch only the specific columns we need using Drizzle
        const items = await db.select({
            categories: patterns.categories,
            hookSizes: patterns.hooks,
            yarnWeights: patterns.weights,
        }).from(patterns);

        // 2. Helper function to process comma-separated strings into unique arrays
        const extractUniqueTags = (field: keyof typeof items[0]) => {
            const allTags = items
                .map(item => item[field]) // Grab the string (e.g., "Blanket, Wearable")
                .filter((val): val is string => Boolean(val)) // Remove nulls
                .flatMap(val => val.split(',')) // Split into individual tags
                .map(tag => tag.trim()) // Clean up whitespace
                .filter(tag => tag.length > 0); // Remove empty strings

            // Use a Set to instantly remove duplicates, then sort alphabetically
            return Array.from(new Set(allTags)).sort();
        };

        // 3. Return the clean arrays
        return {
            categories: extractUniqueTags('categories'),
            hooks: extractUniqueTags('hookSizes'),
            weights: extractUniqueTags('yarnWeights'),
        };
    } catch (error) {
        console.error("Failed to fetch tag suggestions:", error);
        return { categories: [], hooks: [], weights: [] };
    }
}