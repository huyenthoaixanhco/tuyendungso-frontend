import type { CvDocument } from './types';

const STORAGE_KEY = 'tds_candidate_cv_documents_v2';
const ACTIVE_ID_KEY = 'tds_candidate_cv_active_id_v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeDocument(doc: CvDocument): CvDocument {
  return {
    ...doc,
    theme: {
      ...doc.theme,
      fontSize: doc.theme.fontSize ?? 14,
      headingFontSize: doc.theme.headingFontSize ?? 28,
      subheadingFontSize: doc.theme.subheadingFontSize ?? 16,
      bodyFontSize: doc.theme.bodyFontSize ?? doc.theme.fontSize ?? 14,
      lineHeight: doc.theme.lineHeight ?? 1.45,
    },
  };
}

export function loadCvDocuments(): CvDocument[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      // fallback đọc version cũ nếu có
      const legacyRaw = window.localStorage.getItem('tds_candidate_cv_documents_v1');
      if (!legacyRaw) return [];

      const legacyParsed = JSON.parse(legacyRaw);
      if (!Array.isArray(legacyParsed)) return [];
      return legacyParsed.map(normalizeDocument);
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeDocument) : [];
  } catch {
    return [];
  }
}

export function saveCvDocuments(documents: CvDocument[]) {
  if (!canUseStorage()) return;
  const normalized = documents.map(normalizeDocument);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function loadActiveCvId() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACTIVE_ID_KEY);
}

export function saveActiveCvId(id: string | null) {
  if (!canUseStorage()) return;

  if (!id) {
    window.localStorage.removeItem(ACTIVE_ID_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_ID_KEY, id);
}