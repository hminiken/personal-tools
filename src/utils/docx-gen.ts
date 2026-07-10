// src/utils/docx-gen.ts
//
// Generates a .docx (Office Open XML) file from writing board data + export
// settings. No external dependencies — uses the same hand-rolled ZIP builder
// as epub.ts (duplicated here to keep the modules self-contained).
//
// Entry point: generateDocx(books, settings) → Buffer

import { deflateRawSync } from 'zlib';
import type { EpubBook, EpubSettings, NumberStyle, HeadingContent } from './epub';

// ─── ZIP builder (mirrors epub.ts) ───────────────────────────────────────────

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (const b of buf) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (~crc) >>> 0;
}

function buildZip(entries: { name: string; data: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralDirs: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const payload = deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);
    const uLen = e.data.length;
    const cLen = payload.length;

    const lh = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); // DEFLATE
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0x21, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(cLen, 18);
    lh.writeUInt32LE(uLen, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    name.copy(lh, 30);

    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(cLen, 20);
    cd.writeUInt32LE(uLen, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    name.copy(cd, 46);

    const chunk = Buffer.concat([lh, payload]);
    localParts.push(chunk);
    centralDirs.push(cd);
    offset += chunk.length;
  }

  const dir = Buffer.concat(centralDirs);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, dir, eocd]);
}

// ─── Heading text (mirrors epub.ts) ──────────────────────────────────────────

const ROMAN_VALS = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
const ROMAN_SYMS = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
function toRoman(n: number): string {
  let r = '';
  ROMAN_VALS.forEach((v, i) => { while (n >= v) { r += ROMAN_SYMS[i]; n -= v; } });
  return r;
}
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function toWords(n: number): string {
  if (n < 20) return ONES[n] || 'Zero';
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t}-${o.toLowerCase()}` : t;
}
function formatNum(n: number, style: NumberStyle): string {
  if (style === 'numeral') return String(n);
  if (style === 'roman') return toRoman(n);
  return toWords(n);
}
function buildHeadingText(name: string, n: number, content: HeadingContent, numStyle: NumberStyle, prefix: string): string {
  if (content === 'none') return '';
  if (content === 'name-only') return name;
  const numLabel = `${prefix} ${formatNum(n, numStyle)}`;
  if (content === 'number-only') return numLabel;
  return name ? `${numLabel}: ${name}` : numLabel;
}

// ─── XML utilities ────────────────────────────────────────────────────────────

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

// ─── HTML → inline runs ───────────────────────────────────────────────────────

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  isBreak?: boolean;
}

function parseInline(html: string): Run[] {
  const runs: Run[] = [];
  let bold = false, italic = false, underline = false, strike = false;

  for (const part of html.split(/(<[^>]+>)/)) {
    if (!part) continue;
    if (part.startsWith('<')) {
      const tag = part.replace(/^<\/?/, '').split(/[\s/]/)[0].toLowerCase();
      const isClose = part.startsWith('</');
      if (tag === 'strong' || tag === 'b') bold = !isClose;
      else if (tag === 'em' || tag === 'i') italic = !isClose;
      else if (tag === 'u') underline = !isClose;
      else if (tag === 's' || tag === 'strike' || tag === 'del') strike = !isClose;
      else if (!isClose && tag === 'br') runs.push({ text: '', bold, italic, underline, strike, isBreak: true });
    } else {
      const text = decodeEntities(part);
      if (text) runs.push({ text, bold, italic, underline, strike });
    }
  }
  return runs;
}

// ─── HTML → block list ────────────────────────────────────────────────────────

type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'li' | 'hr';
interface Block { type: BlockType; runs: Run[]; }

function parseBlocks(html: string | null | undefined): Block[] {
  if (!html) return [];

  const s = html
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/ data-comment-id="[^"]*"/g, '');

  const blocks: Block[] = [];

  // Match block-level elements (two alternatives: single-tag blocks, and ul/ol)
  const blockRe = /<(p|h[1-6]|blockquote)([^>]*)>([\s\S]*?)<\/\1>|<(ul|ol)[^>]*>([\s\S]*?)<\/\4>|<hr\s*\/?>/gi;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(s)) !== null) {
    if (m[0].toLowerCase().startsWith('<hr')) {
      blocks.push({ type: 'hr', runs: [] });
    } else if (m[1]) {
      const tag = m[1].toLowerCase();
      const inner = m[3] ?? '';

      if (tag === 'p') {
        blocks.push({ type: 'p', runs: parseInline(inner) });
      } else if (tag === 'h1') {
        blocks.push({ type: 'h1', runs: parseInline(inner) });
      } else if (tag === 'h2') {
        blocks.push({ type: 'h2', runs: parseInline(inner) });
      } else if (/^h[3-6]$/.test(tag)) {
        blocks.push({ type: 'h3', runs: parseInline(inner) });
      } else if (tag === 'blockquote') {
        // blockquote may wrap <p> tags
        const innerPs = [...inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
        if (innerPs.length > 0) {
          for (const pm of innerPs) {
            blocks.push({ type: 'blockquote', runs: parseInline(pm[1]) });
          }
        } else {
          blocks.push({ type: 'blockquote', runs: parseInline(inner) });
        }
      }
    } else if (m[4]) {
      // ul / ol — extract li items
      const listInner = m[5] ?? '';
      for (const lm of listInner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        blocks.push({ type: 'li', runs: parseInline(lm[1]) });
      }
    }
  }

  return blocks;
}

// ─── DOCX paragraph XML ───────────────────────────────────────────────────────

function runXml(r: Run): string {
  if (r.isBreak) return '<w:r><w:br/></w:r>';
  let rPr = '';
  if (r.bold) rPr += '<w:b/><w:bCs/>';
  if (r.italic) rPr += '<w:i/><w:iCs/>';
  if (r.underline) rPr += '<w:u w:val="single"/>';
  if (r.strike) rPr += '<w:strike/>';
  const rPrXml = rPr ? `<w:rPr>${rPr}</w:rPr>` : '';
  const space = (r.text !== r.text.trim() || r.text.includes(' ')) ? ' xml:space="preserve"' : '';
  return `<w:r>${rPrXml}<w:t${space}>${xmlEsc(r.text)}</w:t></w:r>`;
}

function para(pPrContent: string, runs: Run[]): string {
  const pPr = pPrContent ? `<w:pPr>${pPrContent}</w:pPr>` : '';
  return `<w:p>${pPr}${runs.map(runXml).join('')}</w:p>`;
}

function pageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function headingPara(text: string, level: 1 | 2 | 3): string {
  return `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:t>${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function bookTitlePara(text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="BookTitle"/></w:pPr><w:r><w:t>${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function sceneBreakPara(text: string): string {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="200"/></w:pPr><w:r><w:rPr><w:color w:val="666666"/></w:rPr><w:t>${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function bodyPara(runs: Run[], s: EpubSettings, noIndent: boolean): string {
  let pPrContent = '';
  if (s.paragraphStyle === 'indent') {
    if (!noIndent) pPrContent += '<w:ind w:firstLine="720"/>';
    pPrContent += '<w:spacing w:after="0"/>';
  } else {
    pPrContent += '<w:spacing w:after="160"/>';
  }
  return para(pPrContent, runs);
}

// ─── HTML → DOCX paragraph list ───────────────────────────────────────────────

function htmlToParas(html: string | null, s: EpubSettings, firstInSection: boolean): string[] {
  const blocks = parseBlocks(html);
  if (blocks.length === 0) return [];

  const out: string[] = [];
  let first = firstInSection;

  for (const b of blocks) {
    if (b.type === 'hr') {
      out.push(sceneBreakPara('* * *'));
      first = false;
    } else if (b.type === 'h1') {
      out.push(headingPara(b.runs.map((r) => r.text).join(''), 1));
      first = true;
    } else if (b.type === 'h2') {
      out.push(headingPara(b.runs.map((r) => r.text).join(''), 2));
      first = true;
    } else if (b.type === 'h3') {
      out.push(headingPara(b.runs.map((r) => r.text).join(''), 3));
      first = true;
    } else if (b.type === 'blockquote') {
      out.push(para('<w:pStyle w:val="Quote"/>', b.runs));
      first = false;
    } else if (b.type === 'li') {
      out.push(para('<w:pStyle w:val="ListParagraph"/>', b.runs));
      first = false;
    } else {
      out.push(bodyPara(b.runs, s, first));
      first = false;
    }
  }

  return out;
}

// ─── Document body builder ────────────────────────────────────────────────────

function buildBody(books: EpubBook[], s: EpubSettings): string {
  const paras: string[] = [];
  const multiBook = books.length > 1;
  let firstContent = true;

  let bookNum = 0;
  for (const book of books) {
    bookNum++;
    let groupNum = 0, listPartNum = 0, chapterNum = 0;
    const hasGroupParts = s.groupHeadingContent !== 'none';

    if (multiBook) {
      if (!firstContent) paras.push(pageBreak());
      paras.push(bookTitlePara(book.title));
      firstContent = false;
    }

    if (s.structure === 'lists-as-chapters') {
      for (const g of book.groups) {
        const nonEmpty = g.lists.filter((l) => l.cards.length > 0);
        if (nonEmpty.length === 0) continue;

        if (hasGroupParts) {
          groupNum++;
          const title = buildHeadingText(g.title, groupNum, s.groupHeadingContent, s.groupNumberStyle, 'Part');
          if (title) {
            if (!firstContent) paras.push(pageBreak());
            paras.push(headingPara(title, 2));
            firstContent = false;
          }
        }

        for (const l of nonEmpty) {
          chapterNum++;
          const chTitle = buildHeadingText(l.title, chapterNum, s.listHeadingContent, s.listNumberStyle, 'Chapter');
          if (!firstContent) paras.push(pageBreak());
          if (chTitle) paras.push(headingPara(chTitle, 1));
          firstContent = false;

          let firstScene = true;
          for (const card of l.cards.filter((c) => c.content)) {
            if (!firstScene && s.sceneBreak) paras.push(sceneBreakPara(s.sceneBreak));
            paras.push(...htmlToParas(card.content, s, firstScene && !chTitle));
            firstScene = false;
          }
        }
      }
    } else {
      const hasListParts = s.listHeadingContent !== 'none';

      for (const g of book.groups) {
        const nonEmpty = g.lists.filter((l) => l.cards.length > 0);
        if (nonEmpty.length === 0) continue;

        if (hasGroupParts) {
          groupNum++;
          const title = buildHeadingText(g.title, groupNum, s.groupHeadingContent, s.groupNumberStyle, 'Part');
          if (title) {
            if (!firstContent) paras.push(pageBreak());
            paras.push(headingPara(title, 2));
            firstContent = false;
          }
        }

        for (const l of nonEmpty) {
          if (hasListParts) {
            listPartNum++;
            const title = buildHeadingText(l.title, listPartNum, s.listHeadingContent, s.listNumberStyle, 'Part');
            if (title) {
              if (!firstContent) paras.push(pageBreak());
              paras.push(headingPara(title, 3));
              firstContent = false;
            }
          }

          for (const card of l.cards) {
            chapterNum++;
            const chTitle = buildHeadingText(card.title, chapterNum, s.cardHeadingContent, s.cardNumberStyle, 'Chapter');
            if (!firstContent) paras.push(pageBreak());
            if (chTitle) paras.push(headingPara(chTitle, 1));
            firstContent = false;
            paras.push(...htmlToParas(card.content, s, !chTitle));
          }
        }
      }
    }
  }

  if (paras.length === 0) paras.push('<w:p/>');

  return paras.join('\n    ');
}

// ─── DOCX XML parts ──────────────────────────────────────────────────────────

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${PKG_CT}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PKG_REL}">
  <Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PKG_REL}">
  <Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="${R}/settings" Target="settings.xml"/>
</Relationships>`;

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W}">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

function buildStyles(s: EpubSettings): string {
  // Font size in half-points: small=22(11pt), medium=24(12pt), large=28(14pt)
  const sz = s.fontSize === 'small' ? 22 : s.fontSize === 'large' ? 28 : 24;
  // Line spacing in 240ths: normal≈1.6→384, relaxed≈1.9→456, loose≈2.2→528
  const line = s.lineSpacing === 'relaxed' ? 456 : s.lineSpacing === 'loose' ? 528 : 384;
  // Space after paragraph (space style only — indent style uses 0)
  const spaceAfter = s.paragraphStyle === 'space' ? 160 : 0;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>
        <w:sz w:val="${sz}"/>
        <w:szCs w:val="${sz}"/>
        <w:lang w:val="${s.language}"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="${spaceAfter}" w:line="${line}" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:keepNext/>
      <w:jc w:val="center"/>
      <w:spacing w:before="720" w:after="480" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="36"/><w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:keepNext/>
      <w:jc w:val="center"/>
      <w:spacing w:before="480" w:after="360" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="32"/><w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:keepNext/>
      <w:jc w:val="center"/>
      <w:spacing w:before="360" w:after="240" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="28"/><w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BookTitle">
    <w:name w:val="Book Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="3600" w:after="1440" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="52"/><w:szCs w:val="52"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:ind w:left="720" w:right="720"/>
    </w:pPr>
    <w:rPr>
      <w:i/><w:iCs/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:ind w:left="720"/>
    </w:pPr>
  </w:style>
</w:styles>`;
}

function buildDocument(books: EpubBook[], s: EpubSettings): string {
  const body = buildBody(books, s);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="${R}">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function generateDocx(books: EpubBook[], settings: EpubSettings): Buffer {
  return buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(DOC_RELS, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(buildDocument(books, settings), 'utf8') },
    { name: 'word/styles.xml', data: Buffer.from(buildStyles(settings), 'utf8') },
    { name: 'word/settings.xml', data: Buffer.from(SETTINGS, 'utf8') },
  ]);
}
