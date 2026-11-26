export interface SourceTable {
  id: string;
  startLine: number;
  endLine: number;
  header: string;
}

function cells(line: string): string[] {
  const text = line.trim().replace(/^(?:>\s*)+/, '').trim();
  const parts: string[] = [];
  let part = '';
  let ticks = 0;
  let trailingSeparator = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (char === '\\' && i + 1 < text.length) {
      part += char + text[++i]!;
    } else if (char === '`') {
      let count = 1;
      while (text[i + 1] === '`') { count++; i++; }
      if (ticks === count) ticks = 0;
      else if (ticks === 0) ticks = count;
      part += '`'.repeat(count);
    } else if (char === '|' && ticks === 0) {
      parts.push(part.trim());
      part = '';
      trailingSeparator = i === text.length - 1;
    } else {
      part += char;
    }
  }
  parts.push(part.trim());
  if (parts[0] === '' && text.startsWith('|')) parts.shift();
  if (parts[parts.length - 1] === '' && trailingSeparator) parts.pop();
  return parts;
}

function hash(value: string): string {
  let result = 0xcbf29ce484222325n;
  for (let i = 0; i < value.length; i++) {
    result ^= BigInt(value.charCodeAt(i));
    result = BigInt.asUintN(64, result * 0x100000001b3n);
  }
  return result.toString(16).padStart(16, '0');
}

/** Shared source-based IDs keep reading and Live Preview on the same scale. */
export function parseTables(source: string): SourceTable[] {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const result: SourceTable[] = [];
  const occurrences = new Map<string, number>();
  let fence: { char: string; length: number } | null = null;
  let frontmatter = lines[0]?.trim() === '---';

  for (let line = 0; line < lines.length - 1; line++) {
    const text = lines[line]!;
    if (frontmatter) {
      if (line > 0 && /^(---|\.\.\.)\s*$/.test(text)) frontmatter = false;
      continue;
    }
    const blockText = text.replace(/^(?: {0,3}>\s*)+/, '');
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(blockText);
    if (fence) {
      if (marker && marker[1]![0] === fence.char && marker[1]!.length >= fence.length && !marker[2]!.trim()) fence = null;
      continue;
    }
    if (marker) { fence = { char: marker[1]![0]!, length: marker[1]!.length }; continue; }
    if (/^(?: {4}|\t)/.test(blockText) || !text.includes('|')) continue;
    const headerCells = cells(text);
    const delimiter = cells(lines[line + 1]!);
    if (!headerCells.length || delimiter.length !== headerCells.length) continue;
    if (!delimiter.every(cell => /^:?-{3,}:?$/.test(cell))) continue;

    const header = JSON.stringify(headerCells.map(cell => cell.replace(/\s+/g, ' ').trim()));
    const occurrence = occurrences.get(header) ?? 0;
    occurrences.set(header, occurrence + 1);
    let end = line + 1;
    while (end + 1 < lines.length && lines[end + 1]!.trim() && lines[end + 1]!.includes('|')
      && !/^\s*(?:>\s*)*(`{3,}|~{3,})/.test(lines[end + 1]!)) end++;
    result.push({ id: `t-${hash(header)}-${occurrence}`, startLine: line, endLine: end, header });
    line = end;
  }
  return result;
}

export function tableAtLine(tables: SourceTable[], line: number): SourceTable | undefined {
  return tables.find(table => line >= table.startLine && line <= table.endLine);
}

