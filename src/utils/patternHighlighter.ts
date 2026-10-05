// src/utils/patternHighlighter.ts
//
// "Rainbow Steps": colors each instruction step differently so a long row
// is easy to follow. A line like
//   Row 3: ch 2, dc in each st across, turn. 54 (62, 70) dc
// gets the label ("Row 3:") in the round color and each step (split at
// , ; . — outside parentheses/brackets) in the next palette color.
//
// Works on the parsed DOM and only wraps TEXT in color spans, never cutting
// through tags, so bold/italic, the user's highlights and the block layout
// (headings, paragraphs, lists) all survive. Colons are looked for in the
// visible text only — not in attributes like style="color: …" or URLs.
//
// Which lines get colored:
//   - any line with a "Label:" prefix (Row 1:, Rnd 4:, Rows 2 – 6:)
//   - a line right after a label-only line, e.g. a "Row 1 (WS):" heading
//     followed by its instructions in the next paragraph
//   - a line that starts like an instruction ("Chain 56 (64, …)", "Ch 3, …")
// Other prose (intros, notes) is left alone.

const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, dd, dt';

// Starts like a crochet/knitting instruction even without a "Row N:" label.
const INSTRUCTION_START =
  /^\s*(ch(ain)?|sl\s?st|sc|hdc|dc|tr|dtr|htr|xdc|fsc|fdc|fhdc|mr|magic\s+(ring|circle)|row|rows|rnd|rnds|round|rounds|rep(eat)?|turn|join|fasten\s+off|k\d*|p\d*|knit|purl|cast\s+on|co|bind\s+off|bo|sk(ip)?|inc|dec|sc2tog|dc2tog|beg|work)\b/i;

type Range = { start: number; end: number; style: string };

// Indexes of opening brackets that actually get closed. A typo like
// "ch 1 (oops" would otherwise leave every later comma "inside" brackets
// and turn the rest of the line one color.
function matchedOpens(text: string, from: number): Set<number> {
  const matched = new Set<number>();
  const stack: number[] = [];
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') stack.push(i);
    else if ((c === ')' || c === ']') && stack.length) matched.add(stack.pop()!);
  }
  return matched;
}

// Step boundaries in a line's text: after , ; — and after a period that ends
// a sentence (followed by space/end, so "2.5" stays whole), but never inside
// (…) or […]. Unclosed "(" and stray ")" are ignored.
function stepRanges(text: string, from: number): [number, number][] {
  const ranges: [number, number][] = [];
  const opens = matchedOpens(text, from);
  let depth = 0;
  let start = from;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if ((c === '(' || c === '[') && opens.has(i)) depth++;
    else if ((c === ')' || c === ']') && depth > 0) depth--;
    else if (depth === 0) {
      const isBoundary =
        c === ',' || c === ';' || c === '—' || (c === '.' && (i + 1 === text.length || /\s/.test(text[i + 1])));
      if (isBoundary) {
        ranges.push([start, i + 1]);
        start = i + 1;
      }
    }
  }
  if (text.slice(start).trim()) ranges.push([start, text.length]);
  return ranges.filter(([a, b]) => text.slice(a, b).trim());
}

// Wraps the given character ranges of a line (spread across its text nodes)
// in styled spans. Splits text nodes as needed; elements are left in place.
function applyRanges(nodes: Node[], ranges: Range[]) {
  if (!ranges.length) return;
  const doc = nodes[0].ownerDocument!;
  const textNodes: Text[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
      continue;
    }
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  }

  let offset = 0;
  for (const textNode of textNodes) {
    const value = textNode.data;
    const nodeStart = offset;
    const nodeEnd = offset + value.length;
    offset = nodeEnd;
    const overlapping = ranges.filter((r) => r.start < nodeEnd && r.end > nodeStart);
    if (!overlapping.length) continue;

    const fragment = doc.createDocumentFragment();
    let cursor = 0;
    for (const r of overlapping) {
      const a = Math.max(r.start, nodeStart) - nodeStart;
      const b = Math.min(r.end, nodeEnd) - nodeStart;
      if (a > cursor) fragment.append(value.slice(cursor, a));
      const span = doc.createElement('span');
      span.setAttribute('style', r.style);
      span.textContent = value.slice(a, b);
      fragment.append(span);
      cursor = b;
    }
    if (cursor < value.length) fragment.append(value.slice(cursor));
    textNode.replaceWith(fragment);
  }
}

// A block's lines: its child nodes split at <br>.
function linesOf(block: Element): Node[][] {
  const lines: Node[][] = [[]];
  for (const child of Array.from(block.childNodes)) {
    if (child.nodeName === 'BR') lines.push([]);
    else lines[lines.length - 1].push(child);
  }
  return lines.filter((l) => l.length);
}

const lineText = (nodes: Node[]) => nodes.map((n) => n.textContent ?? '').join('');

export function processWholePattern(multilinePattern: string, colorScheme: 'light' | 'dark' | string): string {
  if (!multilinePattern) return '';
  // Only ever rendered client-side (after the toggle is switched on).
  if (typeof DOMParser === 'undefined') return multilinePattern;

  const lightColors = ['#c23b53', '#8658d6', '#2a9d8f', '#b57d22', '#3b6cb5'];
  const darkColors = ['#f7768e', '#bb9af7', '#73daca', '#e0af68', '#7aa2f7'];
  const activeColors = colorScheme === 'dark' ? darkColors : lightColors;

  const roundColor = colorScheme === 'dark' ? '#7aa2f7' : 'var(--mantine-color-blue-filled)';
  const astColor = '#002254';
  const astBg = colorScheme === 'dark' ? '#e0af68' : '#fff89a';
  const asteriskStyle = `background-color: ${astBg}; color: ${astColor}; padding: 0 4px; border-radius: 3px;`;

  const doc = new DOMParser().parseFromString(`<body>${multilinePattern}</body>`, 'text/html');

  // Innermost blocks only (a <li> wrapping a <p> is handled via the <p>).
  const blocks = Array.from(doc.body.querySelectorAll(BLOCK_SELECTOR)).filter((el) => !el.querySelector(BLOCK_SELECTOR));

  let previousWasLabelOnly = false;
  for (const block of blocks) {
    for (const nodes of linesOf(block)) {
      const text = lineText(nodes);
      if (!text.trim()) continue;

      const colon = text.indexOf(':');
      const labelOnly = colon >= 0 && !text.slice(colon + 1).trim();
      let stepsFrom: number | null = null;
      const ranges: Range[] = [];

      if (colon >= 0) {
        ranges.push({ start: 0, end: colon + 1, style: `color: ${roundColor};` });
        stepsFrom = colon + 1;
      } else if (previousWasLabelOnly || INSTRUCTION_START.test(text)) {
        stepsFrom = 0;
      }

      if (stepsFrom !== null) {
        stepRanges(text, stepsFrom).forEach(([start, end], i) => {
          const color = activeColors[i % activeColors.length];
          // Asterisks (repeat markers) get their own highlight inside the step.
          let cursor = start;
          for (let k = start; k < end; k++) {
            if (text[k] !== '*') continue;
            if (k > cursor) ranges.push({ start: cursor, end: k, style: `color: ${color};` });
            ranges.push({ start: k, end: k + 1, style: asteriskStyle });
            cursor = k + 1;
          }
          if (cursor < end) ranges.push({ start: cursor, end, style: `color: ${color};` });
        });
        applyRanges(nodes, ranges);
      }

      previousWasLabelOnly = labelOnly;
    }
  }

  return doc.body.innerHTML;
}
