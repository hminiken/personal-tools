import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Group, Stack, TextInput, TagsInput, MultiSelect, Box, Title,
    Anchor, Select, Button, Badge,
    SimpleGrid
} from '@mantine/core';
import { IconExternalLink, IconNeedleThread, IconEdit } from '@tabler/icons-react';
import { TagBadges } from '@components/TagBadges';
import { getTagSuggestions } from '@app/crafting/actions/MetadataActions';
import { weightOptionsWith } from '@/utils/yarnWeights';
import { hookOptionsWith } from '@/utils/hookSizes';
import { needleOptionsWith, type CraftType } from '@/utils/knittingNeedles';

const CRAFT_OPTIONS = [
    { value: 'crochet', label: 'Crochet' },
    { value: 'knitting', label: 'Knitting' },
];

interface CraftingMetadataProps {
    idName: string;
    idValue: number;
    title: string;
    sourceUrl?: string | null;
    status: string;
    statusOptions: string[];
    onUpdateStatus: (val: string) => void;

    craftType: CraftType;
    setCraftType: (val: CraftType) => void;

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

    // Categories you've used before, offered as suggestions.
    const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
    useEffect(() => {
        getTagSuggestions().then((data) => setCategorySuggestions(data.categories));
    }, []);

    // Tag/craft edits apply live to the parent's state, so remember the saved
    // values when editing starts and put them back on Cancel.
    const savedValues = useRef({ craftType: props.craftType, ...tags });
    const startEditing = () => {
        savedValues.current = { craftType: props.craftType, ...tags };
        props.setIsEditing(true);
    };
    const cancelEditing = () => {
        const saved = savedValues.current;
        props.setCraftType(saved.craftType);
        tags.setHookTags(saved.hookTags);
        tags.setWeightTags(saved.weightTags);
        tags.setCategoryTags(saved.categoryTags);
        props.setIsEditing(false);
    };

    // Weights now come from the shared canonical list (a fixed dropdown), with
    // any legacy free-text values already on this record merged in so they stay
    // visible/selected instead of vanishing from the chips.
    const weightData = useMemo(
        () => weightOptionsWith(tags.weightTags),
        [tags.weightTags]
    );

    // Hooks likewise come from the shared canonical chart (mm + US size), with
    // any legacy free-text values on this record merged in so they stay visible.
    const isKnitting = props.craftType === 'knitting';

    // The tool dropdown swaps vocabulary based on craft: crochet hook sizes vs
    // knitting needle sizes. Both store into the same `hookTags`/`hooks` field.
    const hookData = useMemo(
        () => hookOptionsWith(tags.hookTags),
        [tags.hookTags]
    );
    const needleData = useMemo(
        () => needleOptionsWith(tags.hookTags),
        [tags.hookTags]
    );

    return (
        <form action={async (formData) => {
            formData.set('craftType', props.craftType);
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

                    {/* Craft type drives which tool vocabulary is shown below */}
                    <Select
                        label="Craft" name="craftType"
                        data={CRAFT_OPTIONS}
                        value={props.craftType}
                        onChange={(val) => props.setCraftType((val as CraftType) || 'crochet')}
                        allowDeselect={false}
                    />

                    {/* Tool sizes and weights side by side */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {isKnitting ? (
                            <MultiSelect
                                label="Needle Sizes" placeholder="Select needle(s)"
                                value={tags.hookTags} onChange={tags.setHookTags}
                                data={needleData} clearable searchable
                            />
                        ) : (
                            <MultiSelect
                                label="Hook Sizes" placeholder="Select hook(s)"
                                value={tags.hookTags} onChange={tags.setHookTags}
                                data={hookData} clearable searchable
                            />
                        )}
                        <MultiSelect
                            label="Yarn Weights" placeholder="Select weight(s)"
                            value={tags.weightTags} onChange={tags.setWeightTags}
                            data={weightData} clearable searchable
                        />
                    </SimpleGrid>

                    {/* Categories get a full-width row so long tag lists can wrap */}
                    <TagsInput
                        label="Categories" placeholder="e.g., Blanket"
                        value={tags.categoryTags} onChange={tags.setCategoryTags}
                        data={categorySuggestions} clearable
                    />

                    {/* Footer: delete on the left, cancel/save on the right */}
                    <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                        {props.onDeleteClick ? (
                            <Button color="rust.9" variant="subtle" onClick={props.onDeleteClick}>
                                Delete {props.idName === 'patternId' ? 'Pattern' : 'Project'}
                            </Button>
                        ) : <span />}

                        <Group>
                            <Button variant="outline" onClick={cancelEditing}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save Details
                            </Button>
                        </Group>
                    </Group>
                </Stack>
                ) : (
                  <Group justify="space-between" align="flex-start" w="100%">
                    <Box style={{ flexGrow: 1, minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap" align="center">
                            <Title order={2} style={{ overflowWrap: 'anywhere' }}>{props.title}</Title>
                            {props.sourceUrl && (
                                <Anchor href={props.sourceUrl} target="_blank" rel="noopener noreferrer" c="olive.6" aria-label="Open original pattern" title="Open original pattern" style={{ display: 'flex', flexShrink: 0 }}>
                                    <IconExternalLink size={20} />
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
                        <Button variant="default" leftSection={<IconEdit size={16} />} onClick={startEditing}>
                            Edit Details
                        </Button>
                    </Group>
                </Group>
                )}

            </Group>

            {!props.isEditing && (
                // Status lives in the dropdown above, so it isn't repeated here.
                <Group gap={6} mb="md">
                    {props.yarnUsed && <Badge color="neutrals.7" variant="outline" tt="none" leftSection={<IconNeedleThread size={12} />}>{props.yarnUsed}</Badge>}
                    <TagBadges value={tags.hookTags.join(',')} color="mustard" />
                    <TagBadges value={tags.weightTags.join(',')} color="rust" />
                    <TagBadges value={tags.categoryTags.join(',')} color="olive" />
                    <TagBadges value={props.colors} color="olive" variant="outline" />
                </Group>
            )}
        </form>
    );
}