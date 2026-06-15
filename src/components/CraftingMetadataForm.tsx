import { useState, useEffect } from 'react';
import { 
    Group, Stack, TextInput, TagsInput, Box, Title, 
    Anchor, Select, Button, Badge, 
    SimpleGrid
} from '@mantine/core';
import { IconExternalLink, IconNeedleThread } from '@tabler/icons-react';
import { getTagSuggestions } from '@app/crafting/actions/MetadataActions';

interface CraftingMetadataProps {
    idName: string;
    idValue: number;
    title: string;
    sourceUrl?: string | null;
    status: string;
    statusOptions: { value: string, label: string }[];
    onUpdateStatus: (val: string) => void;
    
    tags: {
        hookTags: string[]; setHookTags: (val: string[]) => void;
        weightTags: string[]; setWeightTags: (val: string[]) => void;
        categoryTags: string[]; setCategoryTags: (val: string[]) => void;
    };
    
    yarnUsed?: string | null;
    colors?: string | null;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    formAction: (formData: FormData) => void;
    actionButtons?: React.ReactNode;
    subtext?: React.ReactNode;
    onDeleteClick?: () => void;
}

export function CraftingMetadataForm(props: CraftingMetadataProps) {
    const { tags } = props;
    
    // NEW: States to hold the database suggestions
    const [suggestions, setSuggestions] = useState({
        categories: [] as string[],
        hooks: [] as string[],
        weights: [] as string[]
    });

    // NEW: Fetch suggestions on mount
    useEffect(() => {
        getTagSuggestions().then(data => {
            setSuggestions(data);
        });
    }, []);

    return (
        <form action={async (formData) => {
            formData.set('hookSizes', tags.hookTags.join(','));
            formData.set('yarnWeights', tags.weightTags.join(','));
            formData.set('categories', tags.categoryTags.join(','));
            await props.formAction(formData);
            props.setIsEditing(false);
        }}>
            <input type="hidden" name={props.idName} value={props.idValue} />

            <Group justify="space-between" align="flex-start" mb="sm">
                {props.isEditing ? (
                   <Stack style={{ flexGrow: 1 }} w="100%">
                    <TextInput name="title" label="Title" defaultValue={props.title} required />
                    <TextInput name="sourceUrl" label="Source URL" defaultValue={props.sourceUrl ?? ''} />
                    
                    {(props.yarnUsed !== undefined || props.colors !== undefined) && (
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput name="yarnUsed" label="Yarn Brand/Line" defaultValue={props.yarnUsed || ''} />
                            <TextInput name="colors" label="Colors" defaultValue={props.colors || ''} />
                        </SimpleGrid>
                    )}

                    {/* 1. Use SimpleGrid for Hooks & Weights so they stay perfectly even */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <TagsInput 
                            label="Hook Sizes" placeholder="5mm" 
                            value={tags.hookTags} onChange={tags.setHookTags} 
                            data={suggestions.hooks} clearable 
                        />
                        <TagsInput 
                            label="Yarn Weights" placeholder="Worsted" 
                            value={tags.weightTags} onChange={tags.setWeightTags} 
                            data={suggestions.weights} clearable 
                        />
                    </SimpleGrid>

                    {/* 2. Give Categories its own full-width line so tags can wrap infinitely without breaking the layout */}
                    <TagsInput 
                        label="Categories" placeholder="e.g., Blanket" 
                        value={tags.categoryTags} onChange={tags.setCategoryTags} 
                        data={suggestions.categories} clearable 
                    />

                    {/* 3. A dedicated, standard form footer for the action buttons */}
                    <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                        {props.onDeleteClick ? (
                            <Button color="rust.9" variant="subtle" onClick={props.onDeleteClick}>
                                Delete {props.idName === 'patternId' ? 'Pattern' : 'Project'}
                            </Button>
                        ) : <div></div>}
                        
                        <Group>
                            <Button variant="outline" onClick={() => props.setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" color="olive.7">
                                Save Details
                            </Button>
                        </Group>
                    </Group>
                </Stack>
                ) : (
                  <Group justify="space-between" align="flex-start" w="100%">
                    <Box style={{ flexGrow: 1, minWidth: 0 }}>
                        <Group>
                            <Title order={2}>{props.title}</Title>
                            {props.sourceUrl && (
                                <Anchor fw={500} href={props.sourceUrl} ml={4} target="_blank" rel="noopener noreferrer">
                                    <IconExternalLink />
                                </Anchor>
                            )}
                        </Group>
                        {props.subtext}
                    </Box>

                    <Group gap="sm" wrap="wrap" w={{ base: '100%', sm: 'auto' }} mt={{ base: 'sm', sm: 0 }}>
                        <Select
                            w={{ base: '100%', xs: 140 }}
                            placeholder="Status"
                            data={props.statusOptions}
                            value={props.status}
                            onChange={(val) => val && props.onUpdateStatus(val)}
                        />
                        {props.actionButtons}
                        <Button c={'olive.6'} variant="outline" onClick={() => props.setIsEditing(true)}>
                            Edit Details
                        </Button>
                    </Group>
                </Group>
                )}

            </Group>

            {!props.isEditing && (
                <Group gap="xs" mb="md">
                    {props.status && <Badge size='xs' color="neutrals.7" variant="outline">Status: {props.status}</Badge>}
                    {props.yarnUsed && <Badge size='xs' color="neutrals.5" variant="outline" leftSection={<IconNeedleThread size={12} />}>{props.yarnUsed}</Badge>}
                    {props.colors && <Badge size='xs' color="olive.7" variant="outline">Colors: {props.colors}</Badge>}
                    
                    {tags.categoryTags.map(tag => <Badge size='xs' key={`cat-${tag}`} color="rust.6" variant="outline">Categories: {tag}</Badge>)}
                    {tags.hookTags.map(tag => <Badge size='xs' key={`hook-${tag}`} color="rust.5" variant="outline">Hook: {tag}</Badge>)}
                    {tags.weightTags.map(tag => <Badge size='xs' key={`weight-${tag}`} color="mustard.6" variant="outline">Weight: {tag}</Badge>)}
                </Group>
            )}
        </form>
    );
}