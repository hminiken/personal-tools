// src/utils/epub.ts
//
// Generates an epub 3.x file from writing board data + export settings.
// Pure Node.js — no external dependencies. Uses zlib.deflateRawSync for
// compression and a hand-rolled ZIP writer (epub is just a ZIP).
//
// Entry point: generateEpub(groups, settings) → Buffer

import { deflateRawSync } from 'zlib';
import { randomUUID } from 'crypto';

// ─── Settings ────────────────────────────────────────────────────────────────

// Number style for a heading level (no 'none' — absence is controlled by HeadingContent)
export type NumberStyle = 'numeral' | 'roman' | 'word';

// What text to put in a heading for a given board level
export type HeadingContent =
  | 'none'         // no heading file / no h1 at this level
  | 'name-only'    // e.g. "The Forest Path"
  | 'number-only'  // e.g. "Chapter 1"
  | 'number-name'; // e.g. "Chapter 1: The Forest Path"

export interface EpubSettings {
  // Metadata
  title: string;
  author: string;
  language: string;

  // Structure: how the board hierarchy maps to epub chapters
  // 'lists-as-chapters': each list is a chapter; cards are scenes within it
  // 'cards-as-chapters': each card is a standalone chapter
  structure: 'lists-as-chapters' | 'cards-as-chapters';

  // Per-level heading configuration
  // lists-as-chapters: listHeadingContent = chapter, groupHeadingContent = part
  // cards-as-chapters: cardHeadingContent = chapter, listHeadingContent = part,
  //                    groupHeadingContent = super-part
  groupHeadingContent: HeadingContent;
  groupNumberStyle: NumberStyle;
  listHeadingContent: HeadingContent;
  listNumberStyle: NumberStyle;
  cardHeadingContent: HeadingContent;
  cardNumberStyle: NumberStyle;

  // Scene separator (only used in lists-as-chapters)
  sceneBreak: string; // '' | '* * *' | '· · ·' | '—' | '#'

  // Typography
  paragraphStyle: 'indent' | 'space';
  fontSize: 'small' | 'medium' | 'large';
  lineSpacing: 'normal' | 'relaxed' | 'loose';

  // Table of contents
  includeToc: boolean;
  tocDepth: 1 | 2 | 3;
}

export interface EpubCard { id: number; title: string; content: string | null; }
export interface EpubList { id: number; title: string; cards: EpubCard[]; }
export interface EpubGroup { id: number; title: string; lists: EpubList[]; }
export interface EpubBook { id: number; title: string; groups: EpubGroup[]; }

// ─── ZIP builder ─────────────────────────────────────────────────────────────
// Minimal ZIP implementation sufficient for epub:
//   • mimetype stored uncompressed (STORE)
//   • all other entries DEFLATEd (method 8)

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (const b of buf) {
    crc ^= b;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

interface ZipEntry { name: string; data: Buffer; store?: boolean; }

function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralDirs: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const payload = e.store ? e.data : deflateRawSync(e.data, { level: 9 });
    const method = e.store ? 0 : 8;
    const crc = crc32(e.data);
    const uLen = e.data.length;
    const cLen = payload.length;

    // Local file header (30 bytes + filename)
    const lh = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4);          // version needed (2.0)
    lh.writeUInt16LE(0, 6);           // flags
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);          // mod time
    lh.writeUInt16LE(0x21, 12);       // mod date (1980-01-01)
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(cLen, 18);
    lh.writeUInt32LE(uLen, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);          // extra field length
    name.copy(lh, 30);

    // Central directory entry (46 bytes + filename)
    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4);          // version made by
    cd.writeUInt16LE(20, 6);          // version needed
    cd.writeUInt16LE(0, 8);           // flags
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);          // mod time
    cd.writeUInt16LE(0x21, 14);       // mod date
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(cLen, 20);
    cd.writeUInt32LE(uLen, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);          // extra length
    cd.writeUInt16LE(0, 32);          // comment length
    cd.writeUInt16LE(0, 34);          // disk number start
    cd.writeUInt16LE(0, 36);          // internal attributes
    cd.writeUInt32LE(0, 38);          // external attributes
    cd.writeUInt32LE(offset, 42);     // local header offset
    name.copy(cd, 46);

    const chunk = Buffer.concat([lh, payload]);
    localParts.push(chunk);
    centralDirs.push(cd);
    offset += chunk.length;
  }

  const dir = Buffer.concat(centralDirs);
  // End of central directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                   // disk number
  eocd.writeUInt16LE(0, 6);                   // central dir start disk
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);                  // comment length

  return Buffer.concat([...localParts, dir, eocd]);
}

// ─── Number formatting ────────────────────────────────────────────────────────

const ROMAN_VALS = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
const ROMAN_SYMS = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];

function toRoman(n: number): string {
  let r = '';
  ROMAN_VALS.forEach((v, i) => { while (n >= v) { r += ROMAN_SYMS[i]; n -= v; } });
  return r;
}

const ONES = [
  '','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
  'Seventeen','Eighteen','Nineteen',
];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function toWords(n: number): string {
  if (n <= 0) return 'Zero';
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t}-${o.toLowerCase()}` : t;
}

function formatNum(n: number, style: NumberStyle): string {
  if (style === 'numeral') return String(n);
  if (style === 'roman') return toRoman(n);
  return toWords(n);
}

function buildHeadingText(
  name: string,
  n: number,
  content: HeadingContent,
  numStyle: NumberStyle,
  prefix: string,
): string {
  if (content === 'none') return '';
  if (content === 'name-only') return name;
  const numLabel = `${prefix} ${formatNum(n, numStyle)}`;
  if (content === 'number-only') return numLabel;
  return name ? `${numLabel}: ${name}` : numLabel;
}

// ─── HTML → XHTML ─────────────────────────────────────────────────────────────

function toXhtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<img[^>]*\/?>/gi, '')          // images won't resolve inside epub
    .replace(/ data-comment-id="[^"]*"/g, '') // strip TipTap comment mark attrs
    .replace(/&nbsp;/g, '&#160;')
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<hr\s*\/?>/gi, '<hr />')
    .trim();
}

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad3(n: number): string { return String(n).padStart(3, '0'); }

// ─── XHTML document builder ───────────────────────────────────────────────────

function makeXhtml(lang: string, title: string, bodyClass: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>${xmlEsc(title)}</title>
  <link rel="stylesheet" type="text/css" href="../css/styles.css" />
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

// ─── Spine entry ──────────────────────────────────────────────────────────────

interface SpineEntry {
  id: string;
  filename: string;
  xhtml: string;
  tocTitle: string;
  tocLevel: 1 | 2 | 3;
}

// ─── Spine builder ────────────────────────────────────────────────────────────

function buildSpine(books: EpubBook[], s: EpubSettings): SpineEntry[] {
  const entries: SpineEntry[] = [];
  const bodyClass = `${s.paragraphStyle} size-${s.fontSize} spacing-${s.lineSpacing}`;
  const multiBook = books.length > 1;

  function addPartEntry(id: string, title: string, level: 1 | 2 | 3) {
    entries.push({
      id,
      filename: `${id}.xhtml`,
      xhtml: makeXhtml(s.language, title, `${bodyClass} part-page`, `<h1>${xmlEsc(title)}</h1>`),
      tocTitle: title,
      tocLevel: level,
    });
  }

  let bookNum = 0;

  for (const book of books) {
    bookNum++;
    const bp = `b${pad3(bookNum)}`; // book prefix — keeps all IDs globally unique

    // Display counters reset per book (chapters start at 1 again in each book)
    let groupNum = 0;
    let listPartNum = 0;
    let chapterNum = 0;

    // When multiple books, shift part/chapter levels up by 1 so book = level 1
    const lo = multiBook ? 1 : 0;
    const hasGroupParts = s.groupHeadingContent !== 'none';

    if (multiBook) {
      entries.push({
        id: `${bp}title`,
        filename: `${bp}title.xhtml`,
        xhtml: makeXhtml(s.language, book.title, 'book-title-page', `<h1>${xmlEsc(book.title)}</h1>`),
        tocTitle: book.title,
        tocLevel: 1,
      });
    }

    if (s.structure === 'lists-as-chapters') {
      for (const g of book.groups) {
        const nonEmpty = g.lists.filter((l) => l.cards.length > 0);
        if (nonEmpty.length === 0) continue;

        if (hasGroupParts) {
          groupNum++;
          const title = buildHeadingText(g.title, groupNum, s.groupHeadingContent, s.groupNumberStyle, 'Part');
          addPartEntry(`${bp}gpart${pad3(groupNum)}`, title, Math.min(1 + lo, 3) as 1 | 2 | 3);
        }

        for (const l of nonEmpty) {
          chapterNum++;
          const chTitle = buildHeadingText(l.title, chapterNum, s.listHeadingContent, s.listNumberStyle, 'Chapter');
          const chLevel = Math.min((hasGroupParts ? 2 : 1) + lo, 3) as 1 | 2 | 3;
          const id = `${bp}ch${pad3(chapterNum)}`;

          const sceneHtml = l.cards
            .filter((c) => c.content)
            .map((c, i) => {
              const sep =
                i > 0 && s.sceneBreak
                  ? `<div class="scene-break">${xmlEsc(s.sceneBreak)}</div>\n`
                  : '';
              return sep + toXhtml(c.content);
            })
            .join('\n');

          const body = (chTitle ? `<h1>${xmlEsc(chTitle)}</h1>\n` : '') + sceneHtml;

          entries.push({
            id,
            filename: `${id}.xhtml`,
            xhtml: makeXhtml(s.language, chTitle || s.title, bodyClass, body),
            tocTitle: chTitle || `Chapter ${chapterNum}`,
            tocLevel: chLevel,
          });
        }
      }
    } else {
      // cards-as-chapters
      const hasListParts = s.listHeadingContent !== 'none';
      const chLevelBase: 1 | 2 | 3 =
        hasGroupParts && hasListParts ? 3 : hasGroupParts || hasListParts ? 2 : 1;
      const chapterLevel = Math.min(chLevelBase + lo, 3) as 1 | 2 | 3;
      const listLevel = Math.min((hasGroupParts ? 2 : 1) + lo, 3) as 1 | 2 | 3;

      for (const g of book.groups) {
        const nonEmpty = g.lists.filter((l) => l.cards.length > 0);
        if (nonEmpty.length === 0) continue;

        if (hasGroupParts) {
          groupNum++;
          const title = buildHeadingText(g.title, groupNum, s.groupHeadingContent, s.groupNumberStyle, 'Part');
          addPartEntry(`${bp}gpart${pad3(groupNum)}`, title, Math.min(1 + lo, 3) as 1 | 2 | 3);
        }

        for (const l of nonEmpty) {
          if (hasListParts) {
            listPartNum++;
            const title = buildHeadingText(l.title, listPartNum, s.listHeadingContent, s.listNumberStyle, 'Part');
            addPartEntry(`${bp}lpart${pad3(listPartNum)}`, title, listLevel);
          }

          for (const card of l.cards) {
            chapterNum++;
            const chTitle = buildHeadingText(card.title, chapterNum, s.cardHeadingContent, s.cardNumberStyle, 'Chapter');
            const id = `${bp}ch${pad3(chapterNum)}`;
            const body = (chTitle ? `<h1>${xmlEsc(chTitle)}</h1>\n` : '') + toXhtml(card.content);

            entries.push({
              id,
              filename: `${id}.xhtml`,
              xhtml: makeXhtml(s.language, chTitle || card.title || s.title, bodyClass, body),
              tocTitle: chTitle || card.title || `Chapter ${chapterNum}`,
              tocLevel: chapterLevel,
            });
          }
        }
      }
    }
  }

  return entries;
}

// ─── ToC (nav.xhtml) ─────────────────────────────────────────────────────────

interface TocNode {
  title: string;
  filename: string;
  children: TocNode[];
}

function buildTocTree(entries: SpineEntry[], maxDepth: number): TocNode[] {
  const root: TocNode[] = [];
  // parents[level] = the children array to append level-N items into
  const parents = new Map<number, TocNode[]>([[1, root]]);

  for (const e of entries) {
    const level = Math.min(e.tocLevel, maxDepth) as 1 | 2 | 3;
    const node: TocNode = { title: e.tocTitle, filename: e.filename, children: [] };
    const list = parents.get(level) ?? root;
    list.push(node);
    // Items deeper than this level become children of this node
    parents.set(level + 1, node.children);
    // Invalidate anything deeper to prevent stale parenting
    for (let l = level + 2; l <= 4; l++) parents.delete(l);
  }

  return root;
}

function renderTocList(nodes: TocNode[]): string {
  if (nodes.length === 0) return '';
  let html = '<ol>\n';
  for (const n of nodes) {
    html += `  <li><a href="content/${n.filename}">${xmlEsc(n.title)}</a>`;
    if (n.children.length > 0) html += '\n' + renderTocList(n.children).replace(/^/gm, '  ');
    html += '</li>\n';
  }
  html += '</ol>';
  return html;
}

function buildNav(s: EpubSettings, entries: SpineEntry[]): string {
  const tree = buildTocTree(entries, s.tocDepth);
  const tocList = renderTocList(tree);
  return makeXhtml(
    s.language,
    'Contents',
    '',
    `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc">
<h1>Contents</h1>
${tocList}
</nav>`,
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

function buildCss(): string {
  return `@charset "UTF-8";

body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 5% 6%;
}

body.size-small { font-size: 0.9em; }
body.size-large { font-size: 1.15em; }

body.spacing-relaxed { line-height: 1.9; }
body.spacing-loose   { line-height: 2.2; }

h1 {
  font-size: 1.4em;
  font-weight: normal;
  text-align: center;
  margin: 3em 0 2em;
  page-break-after: avoid;
}

h2 {
  font-size: 1.2em;
  margin: 2em 0 1em;
  page-break-after: avoid;
}

h3 {
  font-size: 1.1em;
  margin: 1.5em 0 0.5em;
  page-break-after: avoid;
}

/* Indent style: literary paragraphs */
body.indent p {
  text-indent: 1.5em;
  margin: 0;
}
body.indent p:first-of-type,
body.indent h1 + p,
body.indent h2 + p,
body.indent h3 + p,
body.indent .scene-break + p {
  text-indent: 0;
}

/* Space style: modern spacing */
body.space p {
  text-indent: 0;
  margin-bottom: 0.8em;
}

.scene-break {
  text-align: center;
  margin: 1.5em 0;
  color: #555;
  page-break-inside: avoid;
  page-break-after: avoid;
}

.part-page {
  text-align: center;
  padding: 35% 10% 0;
  page-break-after: always;
}

.part-page h1 {
  margin: 0;
  font-size: 1.6em;
}

.book-title-page {
  text-align: center;
  padding: 38% 10% 0;
  page-break-after: always;
}

.book-title-page h1 {
  margin: 0;
  font-size: 2em;
  font-weight: bold;
  letter-spacing: 0.02em;
}

blockquote {
  margin: 1em 2em;
  font-style: italic;
  border-left: 3px solid #ccc;
  padding-left: 1em;
}

em     { font-style: italic; }
strong { font-weight: bold; }

ul, ol { margin: 0.5em 0; padding-left: 2em; }
li { margin: 0.2em 0; }

a { color: inherit; text-decoration: underline; }
`;
}

// ─── OPF ─────────────────────────────────────────────────────────────────────

function buildOpf(s: EpubSettings, entries: SpineEntry[], uuid: string, isoDate: string): string {
  const manifest = [
    `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `    <item id="css" href="css/styles.css" media-type="text/css"/>`,
    ...entries.map(
      (e) =>
        `    <item id="${e.id}" href="content/${e.filename}" media-type="application/xhtml+xml"/>`,
    ),
  ].join('\n');

  const spine = [
    `    <itemref idref="nav" linear="no"/>`,
    ...entries.map((e) => `    <itemref idref="${e.id}"/>`),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="${s.language}" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${xmlEsc(s.title)}</dc:title>
    <dc:creator>${xmlEsc(s.author)}</dc:creator>
    <dc:language>${s.language}</dc:language>
    <meta property="dcterms:modified">${isoDate}</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
}

// ─── container.xml ───────────────────────────────────────────────────────────

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

// ─── Public entry point ───────────────────────────────────────────────────────

export function generateEpub(books: EpubBook[], settings: EpubSettings): Buffer {
  const uuid = randomUUID();
  const isoDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const spine = buildSpine(books, settings);
  const navXhtml = buildNav(settings, spine);
  const css = buildCss();
  const opf = buildOpf(settings, spine, uuid, isoDate);

  const zipEntries: ZipEntry[] = [
    // mimetype MUST be first and stored (not compressed) per epub spec
    { name: 'mimetype', data: Buffer.from('application/epub+zip', 'utf8'), store: true },
    { name: 'META-INF/container.xml', data: Buffer.from(CONTAINER_XML, 'utf8') },
    { name: 'EPUB/package.opf', data: Buffer.from(opf, 'utf8') },
    { name: 'EPUB/nav.xhtml', data: Buffer.from(navXhtml, 'utf8') },
    { name: 'EPUB/css/styles.css', data: Buffer.from(css, 'utf8') },
    ...spine.map((e) => ({
      name: `EPUB/content/${e.filename}`,
      data: Buffer.from(e.xhtml, 'utf8'),
    })),
  ];

  return buildZip(zipEntries);
}
