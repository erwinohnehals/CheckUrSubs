// ─── Dateien eines Datensatzes ────────────────────────────────────────────────
// documentStore schlüsselt nach einer beliebigen ID. Ob daran eine Police oder
// ein Kassenbon hängt, ist ihm gleich — deshalb liegt dieses Panel hier und wird
// von beiden Bereichen benutzt.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import { useLang, useT } from '../lib/i18n';
import { fmtDateFromISO } from '../lib/dates';
import * as documentStore from '../lib/documentStore';
import { Note } from './Status';

export const DocumentsPanel = ({ entryId, onChange, hint }) => {
  const t    = useT();
  const lang = useLang();
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const fileRef = useRef(null);
  const available = documentStore.isAvailable();

  const reload = useCallback(() => {
    if (!available) return;
    documentStore.listFor(entryId).then(setDocuments).catch(() => {});
  }, [entryId, available]);

  useEffect(() => { reload(); }, [reload]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setBusy(true);
    setError('');

    for (const file of files) {
      try {
        await documentStore.add(entryId, file);
      } catch (err) {
        setError(err.message === 'too-large'
          ? t.docs_too_large(Math.round(documentStore.MAX_FILE_BYTES / 1024 / 1024))
          : t.docs_error);
      }
    }

    setBusy(false);
    reload();
    onChange?.();
  };

  const removeDocument = async (id) => {
    await documentStore.remove(id);
    reload();
    onChange?.();
  };

  if (!available) {
    return <Note tone="warning">{t.docs_unavailable}</Note>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-3 px-1">{hint || t.docs_hint}</p>

      {documents.length === 0 ? (
        <p className="text-sm text-ink-3 text-center py-6">{t.docs_empty}</p>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {documents.map(document => (
            <div key={document.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface">
              <FileText className="w-4 h-4 text-ink-3 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{document.name}</p>
                <p className="text-[11px] text-ink-3">
                  {documentStore.formatSize(document.size)} · {fmtDateFromISO(document.addedAt, lang, t.months_short)}
                </p>
              </div>
              <button type="button" title={t.docs_open}
                onClick={() => documentStore.openDocument(document.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_download}
                onClick={() => documentStore.openDocument(document.id, { download: true })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-3 transition">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={t.docs_delete}
                onClick={() => removeDocument(document.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-error hover:bg-surface-3 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-error px-1">{error}</p>}

      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border-strong
          text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition disabled:opacity-50">
        <Upload className="w-4 h-4" />{t.docs_add}
      </button>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
    </div>
  );
};
