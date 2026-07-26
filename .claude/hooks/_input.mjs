// Gemeinsame Helfer für die Hooks: stdin lesen und den bearbeiteten Pfad
// relativ zum Projekt bestimmen. Claude Code schickt jedem Hook ein JSON
// auf stdin, siehe .claude/hooks/README.md.

import { relative, resolve } from 'node:path';

export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Liefert den Pfad der bearbeiteten Datei als POSIX-Pfad relativ zum
// Projektstamm — auf Windows also mit / statt \, damit die Muster unten
// überall gleich greifen.
export function editedPath(input) {
  const file =
    input?.tool_response?.filePath ??
    input?.tool_input?.file_path ??
    '';
  if (!file) return '';
  const root = input?.cwd || process.cwd();
  const rel = relative(resolve(root), resolve(file));
  return rel.split('\\').join('/');
}
