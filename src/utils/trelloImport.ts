// Pure parser for Trello's board JSON export. No 'use server', no DB access —
// this only reads the CURRENT state of the board from the export's top-level
// `lists`/`cards` arrays, plus labels (board-level `labels`/card-level
// `labels`/`idLabels`), comments (`actions` entries of type `commentCard`),
// and checklists (top-level `checklists`). We deliberately ignore every other
// `actions` entry — the full activity/audit log has no bearing on what the
// board looks like right now.
import { marked } from 'marked';
import { DEFAULT_LABEL_COLOR } from '@/utils/writingLabels';
import { decodeHtmlEntities as decodeTrelloEntities } from '@/utils/htmlEntities';

export type ParsedTrelloLabel = { key: string; name: string; color: string }; // color = mapped hex
export type ParsedTrelloComment = { key: string; text: string; createdAt: string }; // all anchored:false
export type ParsedTrelloCard = { title: string; contentHtml: string; labelKeys: string[]; comments: ParsedTrelloComment[] };
export type ParsedTrelloList = { name: string; cards: ParsedTrelloCard[] };
export type ParsedTrelloGroup = { name: string; lists: ParsedTrelloList[] };
export type ParsedTrelloBoard = {
  boardName: string;
  groups: ParsedTrelloGroup[];
  labels: ParsedTrelloLabel[];
  groupCount: number;
  listCount: number;
  cardCount: number;
  labelCount: number;
  commentCount: number;
};

type RawTrelloList = { id: string; name?: string; closed?: boolean; pos?: number };
type RawTrelloLabel = { id?: string; name?: string; color?: string | null };
type RawTrelloCard = {
  id: string;
  name?: string;
  desc?: string;
  idList: string;
  pos?: number;
  closed?: boolean;
  labels?: RawTrelloLabel[];
  idLabels?: string[];
  dateLastActivity?: string;
};
type RawTrelloAction = { id?: string; type?: string; date?: string; data?: { text?: string; card?: { id?: string } } };
type RawTrelloCheckItem = { id?: string; name?: string; state?: string; pos?: number };
type RawTrelloChecklist = { id?: string; idCard?: string; name?: string; pos?: number; checkItems?: RawTrelloCheckItem[] };

// Maps a Trello label color name (e.g. "green", "blue_dark") to a hex swatch.
// Trello suffixes some colors with a shade (`_dark`, `_light`); we normalize
// by dropping everything after the first underscore before looking it up.
const TRELLO_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  lime: '#4ade80',
  sky: '#60a5fa',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#fca5a5',
  black: '#1e293b',
};

export function mapTrelloColor(trelloColor: string | null | undefined): string {
  if (typeof trelloColor !== 'string' || !trelloColor) return DEFAULT_LABEL_COLOR;
  const base = trelloColor.split('_')[0].toLowerCase();
  return TRELLO_COLOR_MAP[base] ?? DEFAULT_LABEL_COLOR;
}

// A label's display name: its own name if set, else the capitalized color
// word (e.g. "Green"), else the generic fallback "Label".
function buildLabelName(label: RawTrelloLabel): string {
  const trimmed = typeof label.name === 'string' ? decodeTrelloEntities(label.name.trim()) : '';
  if (trimmed) return trimmed;
  const base = typeof label.color === 'string' && label.color ? label.color.split('_')[0].toLowerCase() : '';
  if (base) return base.charAt(0).toUpperCase() + base.slice(1);
  return 'Label';
}

// Renders a checklist as plain text: its name (if any) on the first line,
// then one "☑ "/"☐ " line per check item, sorted by position.
function renderChecklistText(checklist: RawTrelloChecklist): string {
  const lines: string[] = [];
  const name = typeof checklist.name === 'string' ? decodeTrelloEntities(checklist.name.trim()) : '';
  if (name) lines.push(name);

  const items = Array.isArray(checklist.checkItems) ? [...checklist.checkItems] : [];
  items.sort((a, b) => (a?.pos ?? 0) - (b?.pos ?? 0));
  for (const item of items) {
    if (!item) continue;
    const itemName = typeof item.name === 'string' ? decodeTrelloEntities(item.name) : '';
    lines.push((item.state === 'complete' ? '☑ ' : '☐ ') + itemName);
  }

  return lines.join('\n');
}

export function parseTrelloExport(jsonText: string): ParsedTrelloBoard {
  let raw: any;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lists) || !Array.isArray(raw.cards)) {
    throw new Error("This doesn't look like a Trello board export (missing lists/cards).");
  }

  const boardName = (typeof raw.name === 'string' && decodeTrelloEntities(raw.name.trim())) || 'Imported board';

  // ---- Labels: dedup by Trello label id, preferring the board-level catalog. ----
  const boardLabels: RawTrelloLabel[] = Array.isArray(raw.labels) ? raw.labels : [];
  const allRawCards: RawTrelloCard[] = raw.cards as RawTrelloCard[];
  const labelSource: RawTrelloLabel[] =
    boardLabels.length > 0 ? boardLabels : allRawCards.flatMap((c) => (Array.isArray(c.labels) ? c.labels : []));

  const labelMap = new Map<string, ParsedTrelloLabel>();
  for (const l of labelSource) {
    if (!l || typeof l.id !== 'string' || labelMap.has(l.id)) continue;
    labelMap.set(l.id, { key: l.id, name: buildLabelName(l), color: mapTrelloColor(l.color) });
  }
  const parsedLabels = Array.from(labelMap.values());

  // ---- Comments: actions of type commentCard, grouped by card id. ----
  const commentsByCardId = new Map<string, ParsedTrelloComment[]>();
  if (Array.isArray(raw.actions)) {
    let actionIndex = 0;
    for (const a of raw.actions as RawTrelloAction[]) {
      actionIndex++;
      if (!a || a.type !== 'commentCard') continue;
      const text = a.data?.text;
      const cardId = a.data?.card?.id;
      if (typeof text !== 'string' || typeof cardId !== 'string') continue;
      const key = (typeof a.id === 'string' && a.id) || `commentCard-${actionIndex}`;
      const createdAt = typeof a.date === 'string' ? a.date : '';
      const comment: ParsedTrelloComment = { key, text: decodeTrelloEntities(text), createdAt };
      const bucket = commentsByCardId.get(cardId);
      if (bucket) bucket.push(comment);
      else commentsByCardId.set(cardId, [comment]);
    }
    for (const bucket of commentsByCardId.values()) {
      bucket.sort((x, y) => (x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0));
    }
  }

  // ---- Checklists: grouped by card id, rendered to plain-text comments. ----
  const checklistsByCardId = new Map<string, RawTrelloChecklist[]>();
  if (Array.isArray(raw.checklists)) {
    for (const cl of raw.checklists as RawTrelloChecklist[]) {
      if (!cl || typeof cl.idCard !== 'string') continue;
      const bucket = checklistsByCardId.get(cl.idCard);
      if (bucket) bucket.push(cl);
      else checklistsByCardId.set(cl.idCard, [cl]);
    }
    for (const bucket of checklistsByCardId.values()) {
      bucket.sort((a, b) => (a?.pos ?? 0) - (b?.pos ?? 0));
    }
  }

  const openLists = (raw.lists as RawTrelloList[])
    .filter((l) => !l.closed)
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

  const cardsByListId = new Map<string, RawTrelloCard[]>();
  for (const c of allRawCards) {
    if (c.closed) continue;
    const bucket = cardsByListId.get(c.idList);
    if (bucket) bucket.push(c);
    else cardsByListId.set(c.idList, [c]);
  }
  for (const bucket of cardsByListId.values()) {
    bucket.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  }

  let cardCount = 0;
  let commentCount = 0;

  // Build one parsed list (its title + its cards, with labels/comments/checklists
  // attached). `titleOverride` lets a marker list use its cleaned name.
  const buildList = (l: RawTrelloList, titleOverride?: string): ParsedTrelloList => {
    const rawCards = cardsByListId.get(l.id) ?? [];
    cardCount += rawCards.length;
    const name = titleOverride ?? ((typeof l.name === 'string' && decodeTrelloEntities(l.name.trim())) || '(untitled)');
    return {
      name: name || '(untitled)',
      cards: rawCards.map((c) => {
        const title = (typeof c.name === 'string' && decodeTrelloEntities(c.name.trim())) || '(untitled)';
        const desc = typeof c.desc === 'string' ? decodeTrelloEntities(c.desc.trim()) : '';
        const contentHtml = desc ? (marked.parse(desc, { async: false, gfm: true, breaks: true }) as string) : '';

        const rawLabelIds: string[] = Array.isArray(c.labels)
          ? c.labels.map((cl) => cl?.id).filter((id): id is string => typeof id === 'string')
          : Array.isArray(c.idLabels)
            ? c.idLabels.filter((id): id is string => typeof id === 'string')
            : [];
        const labelKeys = rawLabelIds.filter((id) => labelMap.has(id));

        const realComments = commentsByCardId.get(c.id) ?? [];
        const checklistComments: ParsedTrelloComment[] = (checklistsByCardId.get(c.id) ?? []).map((cl) => ({
          key: `checklist-${cl.id ?? ''}`,
          text: renderChecklistText(cl),
          createdAt: (typeof c.dateLastActivity === 'string' && c.dateLastActivity) || realComments[0]?.createdAt || '',
        }));
        const comments = [...realComments, ...checklistComments];
        commentCount += comments.length;

        return { title, contentHtml, labelKeys, comments };
      }),
    };
  };

  // A list whose name starts with "|" is a section marker: it opens a new group
  // (named after the marker, with the "|" stripped — enumerated if that's empty).
  // Lists after it belong to that group until the next marker. Lists before the
  // first marker (or a board with no markers) fall into a single default
  // "Imported" group, preserving the original single-group behavior. A marker
  // list that carries its own cards is also kept as a list so nothing is lost.
  const MARKER_RE = /^\s*\|+\s*/;
  const groups: ParsedTrelloGroup[] = [];
  let currentGroup: ParsedTrelloGroup | null = null;
  let markerOrdinal = 0;

  for (const l of openLists) {
    const rawName = typeof l.name === 'string' ? l.name : '';
    if (MARKER_RE.test(rawName)) {
      markerOrdinal++;
      const cleaned = decodeTrelloEntities(rawName.replace(MARKER_RE, '').trim());
      currentGroup = { name: cleaned || `Group ${markerOrdinal}`, lists: [] };
      groups.push(currentGroup);
      const built = buildList(l, cleaned || currentGroup.name);
      if (built.cards.length > 0) currentGroup.lists.push(built);
    } else {
      if (!currentGroup) {
        currentGroup = { name: 'Imported', lists: [] };
        groups.push(currentGroup);
      }
      currentGroup.lists.push(buildList(l));
    }
  }

  const listCount = groups.reduce((n, g) => n + g.lists.length, 0);

  return {
    boardName,
    groups,
    labels: parsedLabels,
    groupCount: groups.length,
    listCount,
    cardCount,
    labelCount: parsedLabels.length,
    commentCount,
  };
}
