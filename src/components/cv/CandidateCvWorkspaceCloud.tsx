'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Download, FileStack, Loader2, Trash2 } from 'lucide-react';
import CandidateCvWorkspace from '@/components/cv/CandidateCvWorkspace';
import { candidateApi, type CandidateCvDocumentListItem } from '@/lib/api/candidate';
import { generateCvPdfBlob } from '@/lib/cv/print';
import {
  loadActiveCvId,
  loadCvDocuments,
  saveActiveCvId,
  saveCvDocuments,
} from '@/lib/cv/storage';
import type { CvDocument } from '@/lib/cv/types';
import type { CandidateProfileResponse } from '@/lib/api/candidate';

const CLOUD_LINKS_KEY = 'candidate_cv_cloud_links_v1';

type CloudLinks = Record<string, number>;

function loadCloudLinks(): CloudLinks {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CLOUD_LINKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCloudLinks(value: CloudLinks) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLOUD_LINKS_KEY, JSON.stringify(value));
}

function getCurrentActiveDoc(): CvDocument | null {
  const docs = loadCvDocuments();
  const activeId = loadActiveCvId();
  return docs.find((item) => item.id === activeId) ?? docs[0] ?? null;
}


type CloudCvListItemExtra = CandidateCvDocumentListItem & {
  uploadedResumeId?: number | null;
  uploadedResumeUrl?: string | null;
  resumeUrl?: string | null;
  uploadedResume?: {
    id?: number | null;
    url?: string | null;
  } | null;
};

function hasUploadedResume(item: CandidateCvDocumentListItem) {
  const value = item as CloudCvListItemExtra;
  return Boolean(
    value.uploadedResumeId ??
      value.uploadedResumeUrl ??
      value.resumeUrl ??
      value.uploadedResume?.id ??
      value.uploadedResume?.url,
  );
}

export default function CandidateCvWorkspaceCloud({
  profile,
}: {
  profile: CandidateProfileResponse;
}) {
  const [cloudItems, setCloudItems] = useState<CandidateCvDocumentListItem[]>([]);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [flash, setFlash] = useState('');
  const [workspaceSeed, setWorkspaceSeed] = useState(1);

  const loadCloudItems = async () => {
    try {
      const items = await candidateApi.getMyCvDocuments();
      setCloudItems(items);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void loadCloudItems();
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(''), 3500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const ensureRemoteCvSaved = async (doc: CvDocument) => {
    const cloudLinks = loadCloudLinks();
    const remoteId = cloudLinks[doc.id];

    const payload = {
      name: doc.name || 'CV chưa đặt tên',
      templateKey: doc.theme?.templateId ?? 'standard',
      contentJson: JSON.stringify(doc),
    };

    const saved = remoteId
      ? await candidateApi.updateCvDocument(remoteId, payload)
      : await candidateApi.createCvDocument(payload);

    saveCloudLinks({
      ...cloudLinks,
      [doc.id]: saved.id,
    });

    return saved.id;
  };

  const saveCurrentCv = async () => {
    const doc = getCurrentActiveDoc();
    if (!doc) {
      setFlash('Chưa có CV đang mở để lưu.');
      return;
    }

    try {
      setSavingCloud(true);
      await ensureRemoteCvSaved(doc);
      await loadCloudItems();
      setFlash('Đã lưu thông tin CV lên online.');
    } catch (error) {
      console.error(error);
      setFlash(error instanceof Error ? error.message : 'Không thể lưu CV lên online.');
    } finally {
      setSavingCloud(false);
    }
  };

  const saveCurrentCvAsResumePdf = async () => {
    const doc = getCurrentActiveDoc();
    if (!doc) {
      setFlash('Chưa có CV đang mở để lưu PDF.');
      return;
    }

    try {
      setSavingPdf(true);

      const remoteCvId = await ensureRemoteCvSaved(doc);
      const blob = await generateCvPdfBlob(doc);

      const file = new File([blob], `${doc.name || 'cv'}.pdf`, {
        type: 'application/pdf',
      });

      const uploaded = await candidateApi.uploadCandidateResumePdf(file);
      await candidateApi.attachUploadedResumeToCvDocument(remoteCvId, uploaded.id);

      await loadCloudItems();
      setFlash('Đã lưu PDF CV lên GitHub để dùng khi ứng tuyển.');
    } catch (error) {
      console.error(error);
      setFlash(error instanceof Error ? error.message : 'Không thể lưu PDF CV.');
    } finally {
      setSavingPdf(false);
    }
  };

  const openCloudCv = async (id: number) => {
    try {
      setWorkingId(id);
      const data = await candidateApi.getCvDocument(id);
      const parsed = JSON.parse(data.contentJson) as CvDocument;

      const localDocs = loadCvDocuments();
      const nextDocs = [parsed, ...localDocs.filter((item) => item.id !== parsed.id)];
      saveCvDocuments(nextDocs);
      saveActiveCvId(parsed.id);

      const links = loadCloudLinks();
      saveCloudLinks({
        ...links,
        [parsed.id]: id,
      });

      setWorkspaceSeed((prev) => prev + 1);
      setCloudOpen(false);
      setFlash('Đã mở CV đã lưu.');
    } catch (error) {
      console.error(error);
      setFlash(error instanceof Error ? error.message : 'Không thể mở CV đã lưu.');
    } finally {
      setWorkingId(null);
    }
  };

  const duplicateCloudCv = async (id: number) => {
    try {
      setWorkingId(id);
      const data = await candidateApi.duplicateCvDocument(id);
      const parsed = JSON.parse(data.contentJson) as CvDocument;

      const links = loadCloudLinks();
      saveCloudLinks({
        ...links,
        [parsed.id]: data.id,
      });

      const localDocs = loadCvDocuments();
      saveCvDocuments([parsed, ...localDocs.filter((item) => item.id !== parsed.id)]);
      saveActiveCvId(parsed.id);

      await loadCloudItems();
      setWorkspaceSeed((prev) => prev + 1);
      setFlash('Đã nhân bản CV trên online.');
    } catch (error) {
      console.error(error);
      setFlash(error instanceof Error ? error.message : 'Không thể nhân bản CV.');
    } finally {
      setWorkingId(null);
    }
  };

  const deleteCloudCv = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa CV này? Nếu CV có file PDF đã lưu trên GitHub thì file đó cũng sẽ bị xóa.')) {
      return;
    }

    try {
      setWorkingId(id);
      await candidateApi.deleteCvDocument(id);

      const links = loadCloudLinks();
      const nextLinks = Object.fromEntries(
        Object.entries(links).filter(([, value]) => value !== id),
      ) as CloudLinks;
      saveCloudLinks(nextLinks);

      await loadCloudItems();
      setFlash('Đã xóa CV khỏi online và xóa file PDF liên kết trên GitHub.');
    } catch (error) {
      console.error(error);
      setFlash(error instanceof Error ? error.message : 'Không thể xóa CV.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {flash ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">
          <CheckCircle2 size={18} className="mr-2 inline -mt-0.5" />
          {flash}
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Đồng bộ CV online</h3>
            <p className="mt-1 text-sm text-gray-500">
              Lưu CV đang soạn, mở lại từ mục CV đã tạo, lưu PDF lên GitHub để ứng tuyển và xóa luôn khỏi GitHub khi cần.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveCurrentCv}
              disabled={savingCloud}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {savingCloud ? (
                <Loader2 size={16} className="mr-2 inline animate-spin" />
              ) : (
                <Cloud size={16} className="mr-2 inline" />
              )}
              Lưu thông tin
            </button>

            <button
              onClick={saveCurrentCvAsResumePdf}
              disabled={savingPdf}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
            >
              {savingPdf ? (
                <Loader2 size={16} className="mr-2 inline animate-spin" />
              ) : (
                <Download size={16} className="mr-2 inline" />
              )}
              Lưu PDF ứng tuyển
            </button>

            <button
              onClick={() => setCloudOpen(true)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FileStack size={16} className="mr-2 inline" />
              CV đã tạo
            </button>
          </div>
        </div>
      </div>

      <CandidateCvWorkspace key={workspaceSeed} profile={profile} />

      {cloudOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">CV đã tạo</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Xóa CV ở đây sẽ xóa luôn file PDF đã liên kết trên GitHub nếu có.
                  </p>
                </div>
                <button
                  onClick={() => setCloudOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-6">
              {cloudItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Chưa có CV online nào.
                </div>
              ) : (
                cloudItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-base font-extrabold text-gray-900">{item.name}</div>
                      <div className="mt-1 text-xs font-medium text-gray-500">
                        Cập nhật: {item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '—'}
                      </div>
                      <div className="mt-2 text-xs font-bold text-emerald-600">
                        {hasUploadedResume(item) ? 'Đã có PDF ứng tuyển trên GitHub' : 'Chưa có PDF ứng tuyển'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void openCloudCv(item.id)}
                        disabled={workingId === item.id}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
                      >
                        Mở
                      </button>

                      <button
                        onClick={() => void duplicateCloudCv(item.id)}
                        disabled={workingId === item.id}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
                      >
                        Nhân bản
                      </button>

                      <button
                        onClick={() => void deleteCloudCv(item.id)}
                        disabled={workingId === item.id}
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600"
                      >
                        <Trash2 size={14} className="mr-2 inline" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}