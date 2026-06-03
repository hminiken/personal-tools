import { 
    Group, Stack, TextInput, TagsInput, Box, Title, 
    Anchor, Select, Button, Badge 
} from '@mantine/core';
import { IconExternalLink, IconNeedleThread } from '@tabler/icons-react';

interface CraftingMetadataProps {
    idName: string; // 'patternId' or 'projectId'
    idValue: number;
    title: string;
    sourceUrl?: string | null;
    status: string;
    statusOptions: { value: string, label: string }[];
    onUpdateStatus: (val: string) => void;
    
    // Tag States
    tags: {
        hookTags: string[]; setHookTags: (val: string[]) => void;
        weightTags: string[]; setWeightTags: (val: string[]) => void;
        categoryTags: string[]; setCategoryTags: (val: string[]) => void;
    };
    
    // Optional Yarn/Color fields (mostly for projects)
    yarnUsed?: string | null;
    colors?: string | null;

    // UI State
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    
    // Server Action
    formAction: (formData: FormData) => void;
    
    // Custom Buttons (Start Project vs Quick Note)
    actionButtons?: React.ReactNode;
    
    // Subtext (e.g., "Based on: Pattern Name")
    subtext?: React.ReactNode;
    onDeleteClick?: () => void;
}



export function CraftingMetadataForm(props: CraftingMetadataProps) {
    const { tags } = props;
    

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
                    <Stack style={{ flexGrow: 1 }}>
                        <TextInput name="title" label="Title" defaultValue={props.title} required />
                        <TextInput name="sourceUrl" label="Source URL" defaultValue={props.sourceUrl ?? ''} />
                        
                        {(props.yarnUsed !== undefined || props.colors !== undefined) && (
                            <Group grow>
                                <TextInput name="yarnUsed" label="Yarn Brand/Line" defaultValue={props.yarnUsed || ''} />
                                <TextInput name="colors" label="Colors" defaultValue={props.colors || ''} />
                            </Group>
                        )}

                        <Group grow align="flex-start">
                            <TagsInput label="Hook Sizes" placeholder="5mm" value={tags.hookTags} onChange={tags.setHookTags} clearable />
                            <TagsInput label="Yarn Weights" placeholder="Worsted" value={tags.weightTags} onChange={tags.setWeightTags} clearable />
                            <TagsInput label="Categories" placeholder="e.g., Blanket" value={tags.categoryTags} onChange={tags.setCategoryTags} clearable />
                        </Group>
                    </Stack>
                ) : (
                    <Box>
                        <Group>
                            <Title order={2}>{props.title}</Title>
                            <Anchor fw={500} href={props.sourceUrl ?? ''} ml={4} target="_blank" rel="noopener noreferrer">
                                <IconExternalLink />
                            </Anchor>
                        </Group>
                        {props.subtext}
                    </Box>
                )}

                <Stack align="flex-end">
                    <Group>
                        {!props.isEditing && (
                            <Group gap="sm">
                                <Select
                                    w={140}
                                    placeholder="Status"
                                    data={props.statusOptions}
                                    value={props.status}
                                    onChange={(val) => val && props.onUpdateStatus(val)}
                                />
                                {props.actionButtons}
                            </Group>
                        )}
                        <Button variant="outline" onClick={() => props.setIsEditing(!props.isEditing)}>
                            {props.isEditing ? 'Cancel' : 'Edit Details'}
                        </Button>
                    </Group>
                    {props.isEditing && (
                        <Group justify="space-between" w="100%">
                            {props.onDeleteClick ? (
                                <Button color="rust.9" variant="subtle" onClick={props.onDeleteClick}>
                                    Delete {props.idName === 'patternId' ? 'Pattern' : 'Project'}
                                </Button>
                            ) : <div />}
                            <Button type="submit" color="olive.7">Save Details</Button>
                        </Group>
                    )}
                </Stack>
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