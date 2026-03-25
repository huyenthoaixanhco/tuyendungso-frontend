'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CandidateProfileResponse } from '@/lib/api/candidate';
import {
  BookOpenText,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Grid2X2,
  GripVertical,
  LayoutTemplate,
  LibraryBig,
  Palette,
  PenSquare,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  CV_BACKGROUND_PRESETS,
  CV_FONT_OPTIONS,
  CV_SECTION_TITLES,
  CV_TEMPLATES,
  MANDATORY_SECTIONS,
  OPTIONAL_SECTIONS,
  buildSkillItemsFromProfile,
  createBulletItem,
  createClientId,
  createDefaultCvDocument,
  createEducationItem,
  createReferenceItem,
  createSimpleItem,
  createSkillItem,
  createTimelineItem,
  nowIso,
} from '@/lib/cv/defaults';
import type {
  CvBulletItem,
  CvDocument,
  CvEducationItem,
  CvLayout,
  CvReferenceItem,
  CvSectionKey,
  CvSimpleItem,
  CvSkillItem,
  CvTemplateId,
  CvTimelineItem,
} from '@/lib/cv/types';
import {
  loadActiveCvId,
  loadCvDocuments,
  saveActiveCvId,
  saveCvDocuments,
} from '@/lib/cv/storage';
import { printCvDocument } from '@/lib/cv/print';

const EDITOR_TABS = [
  { id: 'content', label: 'Nội dung', icon: PenSquare },
  { id: 'design', label: 'Thiết kế', icon: Palette },
  { id: 'layout', label: 'Bố cục', icon: LayoutTemplate },
  { id: 'sections', label: 'Thêm mục', icon: Plus },
  { id: 'suggestions', label: 'Gợi ý', icon: BookOpenText },
  { id: 'library', label: 'Thư viện', icon: LibraryBig },
] as const;

type EditorTabId = (typeof EDITOR_TABS)[number]['id'];

const LIBRARY_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'simple', label: 'Đơn giản' },
  { id: 'professional', label: 'Chuyên nghiệp' },
  { id: 'modern', label: 'Hiện đại' },
  { id: 'impressive', label: 'Ấn tượng' },
  { id: 'harvard', label: 'Harvard' },
  { id: 'ats', label: 'ATS' },
] as const;

type LibraryFilterId = (typeof LIBRARY_FILTERS)[number]['id'];
type WorkspaceMode = 'library' | 'editor';

type InitialWorkspaceState = {
  documents: CvDocument[];
  activeId: string | null;
  mode: WorkspaceMode;
};

const WRITING_SUGGESTIONS: Record<
  CvSectionKey,
  { title: string; intro: string; checklist: string[]; sample: string }
> = {
  summary: {
    title: 'Mục tiêu nghề nghiệp',
    intro: 'Tập trung vào giá trị bạn mang lại và thế mạnh khớp vị trí ứng tuyển.',
    checklist: [
      'Viết 2-4 câu, tránh lan man.',
      'Nêu kinh nghiệm chính, thế mạnh nổi bật.',
      'Tránh câu chung chung.',
    ],
    sample:
      'Backend Developer với 4 năm kinh nghiệm Java/Spring Boot, từng xây dựng API cho hệ thống 20.000 user.',
  },
  experience: {
    title: 'Kinh nghiệm làm việc',
    intro: 'Thể hiện rõ vai trò, phạm vi và kết quả bằng số liệu.',
    checklist: [
      'Liệt kê từ mới đến cũ.',
      'Bắt đầu bằng động từ mạnh.',
      'Đo lường bằng số liệu (%, VND, User).',
    ],
    sample: 'Phát triển 15+ API, giảm 35% thời gian phản hồi trung bình.',
  },
  education: {
    title: 'Học vấn',
    intro: 'Nhấn vào chuyên ngành, GPA, học phần liên quan.',
    checklist: [
      'Ghi thông tin có giá trị.',
      'Fresher thêm đồ án, học bổng.',
      'Có kinh nghiệm thì viết ngắn gọn.',
    ],
    sample: 'Tốt nghiệp loại Giỏi ngành CNTT, GPA 3.45/4.0.',
  },
  projects: {
    title: 'Dự án',
    intro: 'Hữu ích với IT, Product, Designer, Fresher.',
    checklist: [
      'Nêu mục tiêu và vai trò.',
      'Thêm stack, kết quả đầu ra.',
      'Link demo/portfolio.',
    ],
    sample: 'Xây dựng website với Spring Boot, PostgreSQL, Next.js.',
  },
  skills: {
    title: 'Kỹ năng',
    intro: 'Tập trung 6-12 kỹ năng mạnh liên quan JD.',
    checklist: [
      'Chia nhóm: Chuyên môn, công cụ, mềm.',
      'Ưu tiên kỹ năng trong JD.',
    ],
    sample: 'Java, Spring Boot, REST API, Docker, Git.',
  },
  certificates: {
    title: 'Chứng chỉ',
    intro: 'Ghi chứng chỉ uy tín, còn hiệu lực.',
    checklist: [
      'Nêu tên, đơn vị cấp, năm.',
      'Bỏ chứng chỉ không liên quan.',
    ],
    sample: 'Google Data Analytics Certificate (2025).',
  },
  awards: {
    title: 'Giải thưởng',
    intro: 'Tăng độ tin cậy cho thành tích cá nhân.',
    checklist: [
      'Nêu bối cảnh và mức độ cạnh tranh.',
      'Kết hợp số liệu.',
    ],
    sample: 'Top 3 Sales toàn quốc quý 3/2025.',
  },
  activities: {
    title: 'Hoạt động',
    intro: 'Phù hợp sinh viên, fresher.',
    checklist: [
      'Nêu vai trò lãnh đạo.',
      'Có thể thêm kết quả quy mô.',
    ],
    sample: 'Trưởng ban truyền thông CLB Khởi nghiệp.',
  },
  references: {
    title: 'Người giới thiệu',
    intro: 'Chỉ thêm khi sẵn sàng cho NTD liên hệ.',
    checklist: [
      'Ưu tiên quản lý trực tiếp.',
      'Xin phép trước khi đưa vào CV.',
    ],
    sample: 'Nguyễn Văn A - Engineering Manager - ABC Tech.',
  },
  hobbies: {
    title: 'Sở thích',
    intro: 'Tạo cảm giác tích cực, phù hợp văn hóa.',
    checklist: ['2-4 sở thích ngắn gọn.', 'Không ghi nội dung nhạy cảm.'],
    sample: 'Đọc sách, chạy bộ, viết blog.',
  },
  additional: {
    title: 'Thông tin thêm',
    intro: 'Ngoại ngữ, visa, công tác...',
    checklist: ['Viết ngắn, rõ, có chọn lọc.'],
    sample: 'Có thể nhận việc sau 2 tuần, sẵn sàng đi công tác.',
  },
};

const ALL_SECTIONS: CvSectionKey[] = [...MANDATORY_SECTIONS, ...OPTIONAL_SECTIONS];
const PREVIEW_PAGE_WIDTH = 794;
const PREVIEW_PAGE_HEIGHT = 1123;

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatDate(value?: string) {
  if (!value) return 'Vừa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';
  return date.toLocaleString('vi-VN');
}

function backgroundClass(id: string) {
  return (
    CV_BACKGROUND_PRESETS.find((item) => item.id === id)?.className ||
    'from-white via-white to-white'
  );
}

function normalizeTextArray(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterMatchesTemplate(
  filter: LibraryFilterId,
  template: (typeof CV_TEMPLATES)[number],
) {
  if (filter === 'all') return true;
  if (filter === 'harvard') return template.id === 'harvard';
  if (filter === 'ats') return template.tags.includes('ATS');
  if (filter === 'simple') return template.tags.includes('Đơn giản');
  if (filter === 'professional') return template.tags.includes('Chuyên nghiệp');
  if (filter === 'modern') return template.tags.includes('Hiện đại');
  if (filter === 'impressive') return template.tags.includes('Ấn tượng');
  return true;
}

function getInitialWorkspaceState(profile: CandidateProfileResponse): InitialWorkspaceState {
  const stored = loadCvDocuments();
  const storedActiveId = loadActiveCvId();

  if (stored.length) {
    return {
      documents: stored,
      activeId: stored.find((item) => item.id === storedActiveId)?.id ?? stored[0].id,
      mode: 'library',
    };
  }

  const initial = createDefaultCvDocument(profile, 'standard');
  return {
    documents: [initial],
    activeId: initial.id,
    mode: 'library',
  };
}

function useHydrated() {
  return React.useSyncExternalStore(() => () => {}, () => true, () => false);
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateWidth = () => {
      setWidth(el.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });

    observer.observe(el);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return [ref, width] as const;
}

export default function CandidateCvWorkspace({
  profile,
}: {
  profile: CandidateProfileResponse;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">Đang khởi tạo trình tạo CV...</p>
      </div>
    );
  }

  return <CandidateCvWorkspaceClient profile={profile} />;
}

function CandidateCvWorkspaceClient({
  profile,
}: {
  profile: CandidateProfileResponse;
}) {
  const [initialState] = useState<InitialWorkspaceState>(() => getInitialWorkspaceState(profile));
  const [documents, setDocuments] = useState<CvDocument[]>(() => initialState.documents);
  const [activeId, setActiveId] = useState<string | null>(() => initialState.activeId);
  const [mode, setMode] = useState<WorkspaceMode>(() => initialState.mode);
  const [editorTab, setEditorTab] = useState<EditorTabId>('content');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilterId>('all');
  const [search, setSearch] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<CvSectionKey>('summary');
  const [message, setMessage] = useState('');
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    saveCvDocuments(documents);
    saveActiveCvId(activeId);
  }, [documents, activeId]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const activeDoc = useMemo(
    () => documents.find((item) => item.id === activeId) || null,
    [documents, activeId],
  );

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();

    return CV_TEMPLATES.filter((template) => {
      if (!filterMatchesTemplate(libraryFilter, template)) return false;
      if (!q) return true;

      const haystack = [
        template.name,
        template.subtitle,
        template.description,
        ...template.tags,
        ...template.roleTags,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [libraryFilter, search]);

  const enabledSections = useMemo(
    () =>
      activeDoc
        ? activeDoc.sectionOrder.filter((key) =>
            activeDoc.enabledSections.includes(key),
          )
        : [],
    [activeDoc],
  );

  const disabledSections = useMemo(
    () =>
      activeDoc
        ? ALL_SECTIONS.filter((key) => !activeDoc.enabledSections.includes(key))
        : [],
    [activeDoc],
  );

  const setFlash = (text: string) => setMessage(text);

  const isSelected = (id: string) => selectedDocIds.includes(id);

  const toggleSelectDocument = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllDocuments = () => {
    setSelectedDocIds(documents.map((doc) => doc.id));
  };

  const clearSelectedDocuments = () => {
    setSelectedDocIds([]);
  };

  const deleteMultipleDocuments = (ids: string[]) => {
    if (!ids.length) return;

    const count = ids.length;
    const confirmed = window.confirm(`Bạn chắc chắn muốn xóa ${count} CV đã chọn?`);
    if (!confirmed) return;

    const remaining = documents.filter((item) => !ids.includes(item.id));
    setSelectedDocIds([]);

    if (remaining.length) {
      setDocuments(remaining);

      if (!remaining.some((item) => item.id === activeId)) {
        setActiveId(remaining[0].id);
      }

      setMode('library');
      setFlash(`Đã xóa ${count} CV.`);
      return;
    }

    const fallback = createDefaultCvDocument(profile, 'standard');
    setDocuments([fallback]);
    setActiveId(fallback.id);
    setMode('editor');
    setFlash(`Đã xóa ${count} CV.`);
  };

  const deleteAllDocuments = () => {
    if (!documents.length) return;

    const confirmed = window.confirm('Bạn chắc chắn muốn xóa toàn bộ CV đã lưu?');
    if (!confirmed) return;

    const fallback = createDefaultCvDocument(profile, 'standard');
    setDocuments([fallback]);
    setActiveId(fallback.id);
    setSelectedDocIds([]);
    setMode('editor');
    setFlash('Đã xóa toàn bộ CV đã lưu.');
  };

  const replaceActiveDoc = (updater: (draft: CvDocument) => void) => {
    if (!activeDoc) return;

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== activeDoc.id) return doc;
        const draft = deepClone(doc);
        updater(draft);
        draft.updatedAt = nowIso();
        return draft;
      }),
    );
  };

  const createNewDocument = (templateId: CvTemplateId, fromProfile = true) => {
    const doc = createDefaultCvDocument(fromProfile ? profile : undefined, templateId);
    setDocuments((prev) => [doc, ...prev]);
    setActiveId(doc.id);
    setMode('editor');
    setEditorTab('content');
    setFlash(`Đã tạo CV mới từ mẫu ${doc.templateName}.`);
  };

  const duplicateDocument = (doc: CvDocument) => {
    const duplicated = deepClone(doc);
    const stamp = nowIso();
    duplicated.id = createClientId('cv');
    duplicated.name = `${doc.name} (Bản sao)`;
    duplicated.createdAt = stamp;
    duplicated.updatedAt = stamp;

    setDocuments((prev) => [duplicated, ...prev]);
    setActiveId(duplicated.id);
    setMode('editor');
    setEditorTab('content');
    setFlash('Đã nhân bản CV thành công.');
  };

  const renameActiveDocument = () => {
    if (!activeDoc) return;
    const nextName = window.prompt('Nhập tên mới cho CV:', activeDoc.name);
    if (!nextName?.trim()) return;

    replaceActiveDoc((draft) => {
      draft.name = nextName.trim();
    });

    setFlash('Đã đổi tên CV.');
  };

  const deleteDocument = (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa CV này?')) return;

    setSelectedDocIds((prev) => prev.filter((item) => item !== id));

    const remaining = documents.filter((item) => item.id !== id);

    if (remaining.length) {
      setDocuments(remaining);
      if (activeId === id) {
        setActiveId(remaining[0].id);
      }
      setMode('library');
    } else {
      const fallback = createDefaultCvDocument(profile, 'standard');
      setDocuments([fallback]);
      setActiveId(fallback.id);
      setMode('editor');
    }

    setFlash('Đã xóa CV.');
  };

  const syncFromProfile = () => {
    replaceActiveDoc((draft) => {
      draft.basics.fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      draft.basics.jobTitle = profile.desiredJobTitle || profile.currentTitle || '';
      draft.basics.headline = profile.headline || '';
      draft.basics.phone = profile.phone || '';
      draft.basics.email = profile.email || '';
      draft.basics.website = profile.portfolioUrl || profile.resumeUrl || '';
      draft.basics.address = profile.desiredLocation || profile.city || '';
      draft.basics.city = profile.city || '';
      draft.basics.avatarUrl = profile.avatarUrl || '';
      draft.sections.summary = profile.bio || draft.sections.summary;

      const incomingSkills = buildSkillItemsFromProfile(profile);
      if (incomingSkills.length) {
        draft.sections.skills = incomingSkills;
      }
    });

    setFlash('Đã đồng bộ dữ liệu từ hồ sơ ứng viên.');
  };

  const exportSpecificDoc = async (doc: CvDocument) => {
    if (exportingDocId) return;

    try {
      setExportingDocId(doc.id);
      await printCvDocument(doc);
      setFlash(`Đã xuất PDF: ${doc.name}`);
    } catch (error) {
      console.error(error);
      window.alert('Xuất PDF thất bại. Vui lòng thử lại.');
    } finally {
      setExportingDocId(null);
    }
  };

  const exportPdf = () => {
    if (!activeDoc) return;
    void exportSpecificDoc(activeDoc);
  };

  const reorderSections = (activeKey: CvSectionKey, overKey: CvSectionKey) => {
    replaceActiveDoc((draft) => {
      const oldIndex = draft.sectionOrder.indexOf(activeKey);
      const newIndex = draft.sectionOrder.indexOf(overKey);
      if (oldIndex === -1 || newIndex === -1) return;
      draft.sectionOrder = arrayMove(draft.sectionOrder, oldIndex, newIndex);
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderSections(active.id as CvSectionKey, over.id as CvSectionKey);
  };

  const toggleSection = (key: CvSectionKey) => {
    if (MANDATORY_SECTIONS.includes(key)) return;

    replaceActiveDoc((draft) => {
      const exists = draft.enabledSections.includes(key);
      draft.enabledSections = exists
        ? draft.enabledSections.filter((item) => item !== key)
        : [...draft.enabledSections, key];
    });
  };

  const setTheme = <K extends keyof CvDocument['theme']>(
    key: K,
    value: CvDocument['theme'][K],
  ) => {
    replaceActiveDoc((draft) => {
      draft.theme[key] = value;
      const template = CV_TEMPLATES.find(
        (item) => item.id === draft.theme.templateId,
      );
      if (template) draft.templateName = template.name;
    });
  };

  if (!activeDoc) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {message ? (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">
            <CheckCircle2 size={18} className="mr-2 inline -mt-0.5" />
            {message}
          </div>
        ) : null}

        {mode === 'library' ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-4xl">
                  <div className="mb-2 text-sm font-bold text-emerald-600">
                    Tạo CV thông minh
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-slate-900">
                    Mẫu CV tiếng Việt <span className="text-emerald-600">chuẩn 2026</span>
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-500">
                    Chọn mẫu CV phù hợp, tạo nội dung từ hồ sơ hiện tại, chỉnh thiết kế,
                    bố cục và xuất PDF ngay trong trang ứng viên.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => createNewDocument('standard', true)}
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                  >
                    <Sparkles size={18} className="mr-2 inline" /> Tạo CV từ hồ sơ
                  </button>
                  <button
                    onClick={() => createNewDocument('standard', false)}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <FileText size={18} className="mr-2 inline" /> Tạo CV trống
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {LIBRARY_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setLibraryFilter(filter.id)}
                      className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                        libraryFilter === filter.id
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
                  <Search size={18} className="mr-2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm mẫu CV..."
                    className="w-full min-w-[250px] bg-transparent text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`flex h-[300px] items-center justify-center bg-gradient-to-br ${backgroundClass(
                        template.defaultTheme.backgroundPreset,
                      )} p-5`}
                    >
                      <TemplateMiniPreview
                        templateId={template.id}
                        accent={template.defaultTheme.accentColor}
                      />
                    </div>

                    <div className="flex flex-1 flex-col bg-white p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: template.defaultTheme.primaryColor }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: template.defaultTheme.accentColor }}
                        />
                      </div>

                      <h4 className="text-xl font-black text-slate-900">{template.name}</h4>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
                        {template.subtitle}
                      </p>

                      <div className="mb-6 mt-4 flex flex-wrap gap-2">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button
                          onClick={() => createNewDocument(template.id, true)}
                          className="rounded-xl bg-emerald-500 px-2 py-2.5 text-center text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                        >
                          Dùng hồ sơ
                        </button>
                        <button
                          onClick={() => createNewDocument(template.id, false)}
                          className="rounded-xl border border-gray-200 px-2 py-2.5 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          Tạo trống
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h4 className="text-xl font-extrabold text-gray-900">
                    Thư viện CV của bạn đã lưu
                  </h4>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Đã chọn {selectedDocIds.length}/{documents.length} CV
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={selectAllDocuments}
                    disabled={!documents.length || selectedDocIds.length === documents.length}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Chọn tất cả
                  </button>

                  <button
                    onClick={clearSelectedDocuments}
                    disabled={!selectedDocIds.length}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Bỏ chọn
                  </button>

                  <button
                    onClick={() => deleteMultipleDocuments(selectedDocIds)}
                    disabled={!selectedDocIds.length}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} className="mr-2 inline" />
                    Xóa đã chọn
                  </button>

                  <button
                    onClick={deleteAllDocuments}
                    disabled={!documents.length}
                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} className="mr-2 inline" />
                    Xóa tất cả
                  </button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`relative flex flex-col rounded-3xl border bg-gray-50 p-5 transition-all hover:shadow-md ${
                      doc.id === activeId
                        ? 'border-emerald-400 ring-4 ring-emerald-50'
                        : 'border-gray-200'
                    } ${isSelected(doc.id) ? 'shadow-md ring-2 ring-rose-100' : ''}`}
                  >
                    <label className="absolute left-4 top-4 z-10 flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected(doc.id)}
                        onChange={() => toggleSelectDocument(doc.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Chọn
                    </label>

                    <div className="mb-4 mt-8 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h5 className="truncate text-base font-extrabold text-gray-900">
                          {doc.name}
                        </h5>
                        <p className="mt-1 text-[11px] font-semibold uppercase text-gray-500">
                          {doc.templateName}
                        </p>
                      </div>
                    </div>

                    <div className="mb-5 flex min-h-[180px] flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white p-4">
                      <TemplateMiniPreview
                        templateId={doc.theme.templateId}
                        accent={doc.theme.accentColor}
                        compact
                      />
                    </div>

                    <div className="grid gap-2">
                      <button
                        onClick={() => {
                          setActiveId(doc.id);
                          setMode('editor');
                          setEditorTab('content');
                        }}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800"
                      >
                        Mở chỉnh sửa CV
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <IconButton
                          label="Nhân bản"
                          icon={<Copy size={16} />}
                          onClick={() => duplicateDocument(doc)}
                        />
                        <IconButton
                          label={exportingDocId === doc.id ? 'Đang xuất' : 'In PDF'}
                          icon={<Download size={16} />}
                          onClick={() => {
                            void exportSpecificDoc(doc);
                          }}
                          disabled={Boolean(exportingDocId)}
                        />
                        <IconButton
                          label="Xóa"
                          icon={<Trash2 size={16} />}
                          onClick={() => deleteDocument(doc.id)}
                          danger
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-xl">
            <div className="z-20 border-b border-gray-200 bg-white px-5 py-4 shadow-sm md:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                    Trình tạo CV
                  </div>
                  <h3
                    className="truncate text-xl font-extrabold text-gray-900"
                    title={activeDoc.name}
                  >
                    {activeDoc.name}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setMode('library')}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <Grid2X2 size={16} className="inline md:mr-2" />
                    <span className="hidden md:inline">Thư viện</span>
                  </button>

                  <button
                    onClick={syncFromProfile}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <RefreshCcw size={16} className="inline md:mr-2" />
                    <span className="hidden md:inline">Đồng bộ</span>
                  </button>

                  <button
                    onClick={renameActiveDocument}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <PenSquare size={16} className="inline md:mr-2" />
                    <span className="hidden md:inline">Đổi tên</span>
                  </button>

                  <button
                    onClick={exportPdf}
                    disabled={exportingDocId === activeDoc.id}
                    className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Printer size={16} className="mr-2 inline" />
                    {exportingDocId === activeDoc.id ? 'Đang xuất PDF...' : 'Xuất PDF'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 xl:grid xl:h-[calc(100vh-180px)] xl:min-h-[820px] xl:[grid-template-columns:88px_minmax(360px,440px)_minmax(0,1fr)]">
              <div className="min-h-0 shrink-0 overflow-x-auto border-b border-gray-200 bg-white p-3 xl:overflow-y-auto xl:border-b-0 xl:border-r">
                <div className="flex gap-2 xl:flex-col">
                  {EDITOR_TABS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setEditorTab(item.id)}
                      title={item.label}
                      className={`shrink-0 rounded-2xl px-4 py-3 text-center text-xs font-bold transition-all xl:flex xl:w-full xl:flex-col xl:items-center xl:justify-center xl:gap-2 xl:px-2 xl:py-5 ${
                        editorTab === item.id
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        size={22}
                        className={editorTab === item.id ? 'text-emerald-600' : ''}
                      />
                      <span className="whitespace-nowrap leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto border-b border-gray-200 bg-white p-4 md:p-5 xl:border-b-0 xl:border-r xl:p-6">
                {editorTab === 'content' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Thông tin cá nhân" hint="Phần header của CV">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Họ và tên"
                          value={activeDoc.basics.fullName}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.fullName = val;
                            })
                          }
                        />
                        <Field
                          label="Vị trí ứng tuyển"
                          value={activeDoc.basics.jobTitle}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.jobTitle = val;
                            })
                          }
                        />
                        <Field
                          label="Headline"
                          value={activeDoc.basics.headline}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.headline = val;
                            })
                          }
                        />
                        <Field
                          label="Ngày sinh"
                          value={activeDoc.basics.birthDate}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.birthDate = val;
                            })
                          }
                        />
                        <Field
                          label="Giới tính"
                          value={activeDoc.basics.gender}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.gender = val;
                            })
                          }
                        />
                        <Field
                          label="Số điện thoại"
                          value={activeDoc.basics.phone}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.phone = val;
                            })
                          }
                        />
                        <Field
                          label="Email"
                          value={activeDoc.basics.email}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.email = val;
                            })
                          }
                        />
                        <Field
                          label="Website / Portfolio"
                          value={activeDoc.basics.website}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.website = val;
                            })
                          }
                        />
                        <Field
                          label="Địa chỉ"
                          value={activeDoc.basics.address}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.address = val;
                            })
                          }
                        />
                        <Field
                          label="Avatar URL"
                          value={activeDoc.basics.avatarUrl}
                          onChange={(val) =>
                            replaceActiveDoc((draft) => {
                              draft.basics.avatarUrl = val;
                            })
                          }
                        />
                      </div>
                    </EditorShellCard>

                    <EditorShellCard
                      title={CV_SECTION_TITLES.summary}
                      hint="Viết ngắn, rõ và nhấn vào giá trị bạn mang lại"
                      onSelect={() => setSelectedSuggestion('summary')}
                    >
                      <TextAreaField
                        label="Nội dung"
                        value={activeDoc.sections.summary}
                        rows={5}
                        onChange={(val) =>
                          replaceActiveDoc((draft) => {
                            draft.sections.summary = val;
                          })
                        }
                      />
                    </EditorShellCard>

                    <TimelineEditor
                      title={CV_SECTION_TITLES.experience}
                      items={activeDoc.sections.experience}
                      onFocus={() => setSelectedSuggestion('experience')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.experience.push(createTimelineItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.experience = items;
                        })
                      }
                    />

                    <EducationEditor
                      items={activeDoc.sections.education}
                      onFocus={() => setSelectedSuggestion('education')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.education.push(createEducationItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.education = items;
                        })
                      }
                    />

                    <TimelineEditor
                      title={CV_SECTION_TITLES.projects}
                      items={activeDoc.sections.projects}
                      onFocus={() => setSelectedSuggestion('projects')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.projects.push(createTimelineItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.projects = items;
                        })
                      }
                    />

                    <SkillsEditor
                      items={activeDoc.sections.skills}
                      onFocus={() => setSelectedSuggestion('skills')}
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.skills = items;
                        })
                      }
                    />

                    <TimelineEditor
                      title={CV_SECTION_TITLES.activities}
                      items={activeDoc.sections.activities}
                      onFocus={() => setSelectedSuggestion('activities')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.activities.push(createTimelineItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.activities = items;
                        })
                      }
                    />

                    <SimpleItemEditor
                      title={CV_SECTION_TITLES.certificates}
                      items={activeDoc.sections.certificates}
                      onFocus={() => setSelectedSuggestion('certificates')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.certificates.push(createSimpleItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.certificates = items;
                        })
                      }
                    />

                    <SimpleItemEditor
                      title={CV_SECTION_TITLES.awards}
                      items={activeDoc.sections.awards}
                      onFocus={() => setSelectedSuggestion('awards')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.awards.push(createSimpleItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.awards = items;
                        })
                      }
                    />

                    <ReferenceEditor
                      items={activeDoc.sections.references}
                      onFocus={() => setSelectedSuggestion('references')}
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.references = items;
                        })
                      }
                    />

                    <EditorShellCard
                      title={CV_SECTION_TITLES.hobbies}
                      hint="Mỗi dòng là một sở thích"
                      onSelect={() => setSelectedSuggestion('hobbies')}
                    >
                      <textarea
                        value={activeDoc.sections.hobbies.join('\n')}
                        onChange={(e) =>
                          replaceActiveDoc((draft) => {
                            draft.sections.hobbies = normalizeTextArray(e.target.value);
                          })
                        }
                        rows={4}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none shadow-sm focus:border-emerald-500 focus:ring-1"
                      />
                    </EditorShellCard>

                    <SimpleItemEditor
                      title={CV_SECTION_TITLES.additional}
                      items={activeDoc.sections.additional}
                      onFocus={() => setSelectedSuggestion('additional')}
                      onAdd={() =>
                        replaceActiveDoc((draft) => {
                          draft.sections.additional.push(createSimpleItem());
                        })
                      }
                      onChange={(items) =>
                        replaceActiveDoc((draft) => {
                          draft.sections.additional = items;
                        })
                      }
                    />

                    <div className="h-4" />
                  </div>
                )}

                {editorTab === 'design' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Thiết kế & Font" hint="Điều chỉnh kiểu chữ, màu và nền CV">
                      <div className="space-y-6">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-800">
                            Font chữ
                          </label>
                          <select
                            value={activeDoc.theme.fontFamily}
                            onChange={(e) =>
                              setTheme(
                                'fontFamily',
                                e.target.value as CvDocument['theme']['fontFamily'],
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none shadow-sm"
                          >
                            {CV_FONT_OPTIONS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <RangeField
                          label={`Cỡ chữ nội dung (${activeDoc.theme.bodyFontSize}px)`}
                          min={10}
                          max={22}
                          step={0.5}
                          value={activeDoc.theme.bodyFontSize}
                          onChange={(val) => {
                            setTheme('bodyFontSize', val);
                            setTheme('fontSize', val);
                          }}
                          leftLabel="Nhỏ"
                          rightLabel="Lớn"
                        />

                        <RangeField
                          label={`Cỡ tên ứng viên (${activeDoc.theme.headingFontSize}px)`}
                          min={20}
                          max={36}
                          step={1}
                          value={activeDoc.theme.headingFontSize}
                          onChange={(val) => setTheme('headingFontSize', val)}
                          leftLabel="Nhỏ"
                          rightLabel="Lớn"
                        />

                        <RangeField
                          label={`Cỡ tiêu đề mục (${activeDoc.theme.subheadingFontSize}px)`}
                          min={12}
                          max={24}
                          step={1}
                          value={activeDoc.theme.subheadingFontSize}
                          onChange={(val) => setTheme('subheadingFontSize', val)}
                          leftLabel="Nhỏ"
                          rightLabel="Lớn"
                        />

                        <RangeField
                          label={`Khoảng cách dòng (${activeDoc.theme.lineHeight})`}
                          min={1.1}
                          max={2}
                          step={0.05}
                          value={activeDoc.theme.lineHeight}
                          onChange={(val) => setTheme('lineHeight', val)}
                          leftLabel="Sát"
                          rightLabel="Thoáng"
                        />

                        <div>
                          <label className="mb-3 block text-sm font-bold text-gray-800">
                            Màu chủ đề
                          </label>

                          <div className="mb-4 flex flex-wrap gap-3">
                            {[
                              '#10b981',
                              '#4b5563',
                              '#1d4ed8',
                              '#4c0519',
                              '#e11d48',
                              '#8b5cf6',
                            ].map((color) => (
                              <button
                                key={color}
                                onClick={() => setTheme('accentColor', color)}
                                className={`h-10 w-10 rounded-full border-2 transition-transform ${
                                  activeDoc.theme.accentColor === color
                                    ? 'scale-110 border-emerald-500 shadow-md'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={activeDoc.theme.accentColor}
                              onChange={(e) => setTheme('accentColor', e.target.value)}
                              className="h-12 w-16 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                            />
                            <input
                              value={activeDoc.theme.accentColor}
                              onChange={(e) => setTheme('accentColor', e.target.value)}
                              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none shadow-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-3 block text-sm font-bold text-gray-800">
                            Hình nền CV
                          </label>
                          <div className="grid grid-cols-4 gap-3">
                            {CV_BACKGROUND_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => setTheme('backgroundPreset', preset.id)}
                                className={`h-24 rounded-2xl border-2 bg-gradient-to-br transition-all ${
                                  preset.className
                                } ${
                                  activeDoc.theme.backgroundPreset === preset.id
                                    ? 'scale-105 border-emerald-500 shadow-md'
                                    : 'border-gray-200'
                                }`}
                                title={preset.label}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </EditorShellCard>
                  </div>
                )}

                {editorTab === 'layout' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Bố cục CV" hint="Chọn template và cấu trúc hiển thị">
                      <div className="space-y-6">
                        <div>
                          <label className="mb-3 block text-sm font-bold text-gray-800">
                            Mẫu CV (Template)
                          </label>

                          <div className="grid gap-4">
                            {CV_TEMPLATES.map((template) => {
                              const selected = activeDoc.theme.templateId === template.id;

                              return (
                                <button
                                  key={template.id}
                                  onClick={() =>
                                    replaceActiveDoc((draft) => {
                                      draft.theme = { ...template.defaultTheme };
                                      draft.templateName = template.name;
                                    })
                                  }
                                  className={`rounded-2xl border bg-white p-5 text-left transition-all ${
                                    selected
                                      ? 'border-emerald-400 bg-emerald-50/50 shadow-md ring-2 ring-emerald-100'
                                      : 'border-gray-200 hover:border-emerald-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <div className="text-base font-extrabold text-gray-900">
                                        {template.name}
                                      </div>
                                      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                                        {template.description}
                                      </p>
                                    </div>
                                    {selected && (
                                      <CheckCircle2
                                        className="shrink-0 text-emerald-600"
                                        size={24}
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="mb-3 block text-sm font-bold text-gray-800">
                            Cấu trúc hiển thị
                          </label>

                          <div className="grid gap-3">
                            {[
                              {
                                id: 'single',
                                label: '1 cột ngang',
                                desc: 'Trải dài, dễ đọc từ trên xuống',
                              },
                              {
                                id: 'split-left',
                                label: '2 cột (Sidebar bên trái)',
                                desc: 'Nhấn mạnh kỹ năng và thông tin phụ',
                              },
                              {
                                id: 'split-right',
                                label: '2 cột (Sidebar bên phải)',
                                desc: 'Phổ biến, tập trung kinh nghiệm bên trái',
                              },
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setTheme('layout', item.id as CvLayout)}
                                className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3.5 transition-all ${
                                  activeDoc.theme.layout === item.id
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm'
                                    : 'border-gray-200 text-gray-700'
                                }`}
                              >
                                <span className="text-sm font-extrabold">{item.label}</span>
                                <span className="hidden text-[11px] font-medium text-gray-500 sm:inline">
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </EditorShellCard>
                  </div>
                )}

                {editorTab === 'sections' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Quản lý các mục" hint="Bật / tắt và kéo thả đổi vị trí từng phần">
                      <div className="space-y-6">
                        <div>
                          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            Đang hiển thị trên CV
                          </div>

                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleSectionDragEnd}
                          >
                            <SortableContext
                              items={enabledSections}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-3">
                                {enabledSections.map((key) => {
                                  const locked = MANDATORY_SECTIONS.includes(key);

                                  return (
                                    <SortableSectionItem
                                      key={key}
                                      sectionKey={key}
                                      title={CV_SECTION_TITLES[key]}
                                      locked={locked}
                                      onToggle={() => toggleSection(key)}
                                    />
                                  );
                                })}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-500">
                            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                            Đã ẩn
                          </div>

                          <div className="grid gap-3">
                            {disabledSections.length ? (
                              disabledSections.map((key) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3"
                                >
                                  <div className="font-bold text-gray-600">
                                    {CV_SECTION_TITLES[key]}
                                  </div>
                                  <button
                                    onClick={() => toggleSection(key)}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
                                  >
                                    <Plus size={14} className="mr-1 inline" />
                                    Thêm lại
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-center text-sm font-medium text-gray-500">
                                Tuyệt vời! Bạn đang hiển thị toàn bộ nội dung.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </EditorShellCard>
                  </div>
                )}

                {editorTab === 'suggestions' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Cẩm nang viết CV" hint="Mẹo hay cho từng mục để CV ấn tượng hơn">
                      <div className="mb-5 flex flex-wrap gap-2">
                        {Object.entries(CV_SECTION_TITLES).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedSuggestion(key as CvSectionKey)}
                            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                              selectedSuggestion === key
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm xl:p-6">
                        <div className="mb-3 flex items-center gap-2 text-emerald-600">
                          <Sparkles size={20} />
                          <h4 className="text-lg font-black">
                            {WRITING_SUGGESTIONS[selectedSuggestion].title}
                          </h4>
                        </div>

                        <p className="mb-5 text-sm leading-relaxed text-gray-600">
                          {WRITING_SUGGESTIONS[selectedSuggestion].intro}
                        </p>

                        <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 xl:p-5">
                          <div className="mb-3 text-sm font-extrabold text-gray-900">
                            Checklist cần nhớ
                          </div>
                          <ul className="space-y-2.5 text-sm leading-relaxed text-gray-700">
                            {WRITING_SUGGESTIONS[selectedSuggestion].checklist.map((item) => (
                              <li key={item} className="flex gap-3">
                                <CheckCircle2
                                  size={16}
                                  className="mt-0.5 shrink-0 text-emerald-500"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-relaxed text-emerald-900 xl:p-5">
                          <div className="mb-2 flex items-center gap-2 font-extrabold">
                            Ví dụ mẫu
                          </div>
                          {WRITING_SUGGESTIONS[selectedSuggestion].sample}
                        </div>
                      </div>
                    </EditorShellCard>
                  </div>
                )}

                {editorTab === 'library' && (
                  <div className="space-y-6">
                    <EditorShellCard title="Quản lý CV nhanh" hint="CV được lưu cục bộ trên trình duyệt này">
                      <div className="space-y-4">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className={`rounded-2xl border p-4 transition-all xl:p-5 ${
                              doc.id === activeDoc.id
                                ? 'border-emerald-300 bg-emerald-50/30 shadow-sm ring-1 ring-emerald-100'
                                : 'border-gray-200 bg-white hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div>
                                <div className="text-base font-extrabold text-gray-900">
                                  {doc.name}
                                </div>
                                <div className="mt-1 text-xs font-medium text-gray-500">
                                  {doc.templateName} • {formatDate(doc.updatedAt)}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {doc.id !== activeDoc.id && (
                                  <button
                                    onClick={() => setActiveId(doc.id)}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
                                  >
                                    Mở sửa
                                  </button>
                                )}

                                <button
                                  onClick={() => duplicateDocument(doc)}
                                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
                                >
                                  Nhân bản
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 grid gap-3 border-t border-gray-100 pt-6 md:grid-cols-2">
                        <button
                          onClick={() => createNewDocument('standard', true)}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                        >
                          <Plus size={16} className="mr-2 inline" /> Tạo CV từ hồ sơ
                        </button>

                        <button
                          onClick={() => setMode('library')}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                        >
                          <Grid2X2 size={16} className="mr-2 inline" /> Khám phá Gallery
                        </button>
                      </div>
                    </EditorShellCard>
                  </div>
                )}
              </div>

              <div className="min-h-[560px] min-w-0 overflow-y-auto bg-[#eef2f5] p-4 md:p-6 xl:min-h-0 xl:p-8">
                <div className="sticky top-0 z-10 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-center text-[13px] font-semibold text-emerald-800 shadow-sm backdrop-blur md:text-sm">
                  <Sparkles size={16} className="mr-2 inline -mt-0.5 text-emerald-600" />
                  Chỉnh sửa nội dung ở panel bên trái, CV preview sẽ cập nhật ngay theo thời gian thực.
                </div>

                <CvPreviewViewport doc={activeDoc} />
              </div>
            </div>
          </div>
        )}
      </div>

      <HiddenPrintRoots documents={documents} />
    </>
  );
}

function HiddenPrintRoots({ documents }: { documents: CvDocument[] }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-100000px',
        top: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {documents.map((doc) => (
        <div key={doc.id} data-cv-print-root={doc.id}>
          <CvPreview doc={doc} />
        </div>
      ))}
    </div>
  );
}

function CvPreviewViewport({ doc }: { doc: CvDocument }) {
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const safeWidth = containerWidth > 0 ? containerWidth : PREVIEW_PAGE_WIDTH;
  const scale = Math.min(1, safeWidth / PREVIEW_PAGE_WIDTH);
  const scaledWidth = PREVIEW_PAGE_WIDTH * scale;
  const scaledHeight = PREVIEW_PAGE_HEIGHT * scale;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex w-full justify-center pb-4">
        <div
          className="relative rounded-[28px] shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: `${PREVIEW_PAGE_WIDTH}px`,
              height: `${PREVIEW_PAGE_HEIGHT}px`,
              transform: `scale(${scale})`,
            }}
          >
            <CvPreview doc={doc} />
          </div>
        </div>
      </div>

      {scale < 1 ? (
        <p className="mt-2 text-center text-xs font-medium text-gray-500">
          Preview đang tự thu nhỏ để vừa màn hình. Khi xuất PDF, file sẽ giữ đúng tỉ lệ A4.
        </p>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function EditorShellCard({
  title,
  hint,
  children,
  onSelect,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`rounded-[24px] border border-gray-100 bg-[#f8fafc] p-5 transition-colors xl:p-6 ${
        onSelect ? 'cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/40' : ''
      }`}
      onClick={onSelect}
    >
      <div className="mb-5">
        <h4 className="text-[17px] font-extrabold text-gray-900">{title}</h4>
        {hint ? <p className="mt-1 text-sm font-medium text-gray-500">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-gray-800">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none shadow-sm transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-gray-800">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none shadow-sm transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800">{label}</label>
        <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-emerald-600 shadow-sm">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-emerald-500"
      />
      <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-wide text-gray-400">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function BulletEditor({
  bullets,
  onChange,
}: {
  bullets: CvBulletItem[];
  onChange: (bullets: CvBulletItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800">
          Chi tiết (Dạng gạch đầu dòng)
        </label>
        <button
          type="button"
          onClick={() => onChange([...bullets, createBulletItem('')])}
          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-600 hover:text-emerald-700"
        >
          + Thêm Bullet
        </button>
      </div>

      {bullets.map((bullet, bulletIndex) => (
        <div key={bullet.id} className="flex items-start gap-2.5">
          <div className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <textarea
            rows={2}
            value={bullet.text}
            onChange={(e) => {
              const next = [...bullets];
              next[bulletIndex] = { ...bullet, text: e.target.value };
              onChange(next);
            }}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium outline-none shadow-sm transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, idx) => idx !== bulletIndex))}
            className="mt-1 rounded-xl border border-rose-200 bg-white p-2.5 text-rose-500 shadow-sm hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TimelineEditor({
  title,
  items,
  onAdd,
  onChange,
  onFocus,
}: {
  title: string;
  items: CvTimelineItem[];
  onAdd: () => void;
  onChange: (items: CvTimelineItem[]) => void;
  onFocus?: () => void;
}) {
  return (
    <EditorShellCard
      title={title}
      hint="Kinh nghiệm, thành tích cốt lõi của bạn"
      onSelect={onFocus}
    >
      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Mục #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Bắt đầu"
                value={item.start}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, start: val };
                  onChange(next);
                }}
              />
              <Field
                label="Kết thúc"
                value={item.end}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, end: val };
                  onChange(next);
                }}
              />
              <Field
                label="Tên tổ chức"
                value={item.organization}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, organization: val };
                  onChange(next);
                }}
              />
              <Field
                label="Vai trò / Vị trí"
                value={item.role}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, role: val };
                  onChange(next);
                }}
              />
              <div className="md:col-span-2">
                <Field
                  label="Địa điểm"
                  value={item.location}
                  onChange={(val) => {
                    const next = [...items];
                    next[index] = { ...item, location: val };
                    onChange(next);
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <TextAreaField
                label="Mô tả tóm tắt"
                value={item.description}
                rows={3}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, description: val };
                  onChange(next);
                }}
              />
            </div>

            <div className="mt-4 border-t border-gray-50 pt-4">
              <BulletEditor
                bullets={item.bullets}
                onChange={(bullets) => {
                  const next = [...items];
                  next[index] = { ...item, bullets };
                  onChange(next);
                }}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-white px-4 py-4 text-sm font-extrabold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus size={16} className="mr-2" /> Thêm {title}
        </button>
      </div>
    </EditorShellCard>
  );
}

function EducationEditor({
  items,
  onAdd,
  onChange,
  onFocus,
}: {
  items: CvEducationItem[];
  onAdd: () => void;
  onChange: (items: CvEducationItem[]) => void;
  onFocus?: () => void;
}) {
  return (
    <EditorShellCard
      title={CV_SECTION_TITLES.education}
      hint="Trường học, ngành học, GPA..."
      onSelect={onFocus}
    >
      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Học vấn #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Bắt đầu"
                value={item.start}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, start: val };
                  onChange(next);
                }}
              />
              <Field
                label="Kết thúc"
                value={item.end}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, end: val };
                  onChange(next);
                }}
              />
              <Field
                label="Trường học"
                value={item.school}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, school: val };
                  onChange(next);
                }}
              />
              <Field
                label="Ngành học"
                value={item.major}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, major: val };
                  onChange(next);
                }}
              />
              <div className="md:col-span-2">
                <Field
                  label="Địa điểm"
                  value={item.location}
                  onChange={(val) => {
                    const next = [...items];
                    next[index] = { ...item, location: val };
                    onChange(next);
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <TextAreaField
                label="Thành tích"
                value={item.description}
                rows={3}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, description: val };
                  onChange(next);
                }}
              />
            </div>

            <div className="mt-4 border-t border-gray-50 pt-4">
              <BulletEditor
                bullets={item.bullets}
                onChange={(bullets) => {
                  const next = [...items];
                  next[index] = { ...item, bullets };
                  onChange(next);
                }}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-white px-4 py-4 text-sm font-extrabold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus size={16} className="mr-2" /> Thêm học vấn
        </button>
      </div>
    </EditorShellCard>
  );
}

function SkillsEditor({
  items,
  onChange,
  onFocus,
}: {
  items: CvSkillItem[];
  onChange: (items: CvSkillItem[]) => void;
  onFocus?: () => void;
}) {
  return (
    <EditorShellCard
      title={CV_SECTION_TITLES.skills}
      hint="Kỹ năng chuyên môn, công cụ và mềm"
      onSelect={onFocus}
    >
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Kỹ năng #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Tên kỹ năng"
                value={item.name}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, name: val };
                  onChange(next);
                }}
              />
              <Field
                label="Nhóm"
                value={item.category}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, category: val };
                  onChange(next);
                }}
              />
            </div>

            <div className="mt-4">
              <RangeField
                label="Mức độ"
                min={0}
                max={100}
                step={5}
                value={item.level}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, level: val };
                  onChange(next);
                }}
                leftLabel="Cơ bản"
                rightLabel="Thành thạo"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...items, createSkillItem()])}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-white px-4 py-4 text-sm font-extrabold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus size={16} className="mr-2" /> Thêm kỹ năng
        </button>
      </div>
    </EditorShellCard>
  );
}

function SimpleItemEditor({
  title,
  items,
  onAdd,
  onChange,
  onFocus,
}: {
  title: string;
  items: CvSimpleItem[];
  onAdd: () => void;
  onChange: (items: CvSimpleItem[]) => void;
  onFocus?: () => void;
}) {
  return (
    <EditorShellCard title={title} hint="Tiêu đề, phụ đề và mô tả ngắn" onSelect={onFocus}>
      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Mục #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-4">
              <Field
                label="Tiêu đề"
                value={item.title}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, title: val };
                  onChange(next);
                }}
              />
              <Field
                label="Phụ đề"
                value={item.subtitle}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, subtitle: val };
                  onChange(next);
                }}
              />
              <TextAreaField
                label="Mô tả"
                value={item.description}
                rows={3}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, description: val };
                  onChange(next);
                }}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-white px-4 py-4 text-sm font-extrabold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus size={16} className="mr-2" /> Thêm {title}
        </button>
      </div>
    </EditorShellCard>
  );
}

function ReferenceEditor({
  items,
  onChange,
  onFocus,
}: {
  items: CvReferenceItem[];
  onChange: (items: CvReferenceItem[]) => void;
  onFocus?: () => void;
}) {
  return (
    <EditorShellCard
      title={CV_SECTION_TITLES.references}
      hint="Chỉ thêm khi người giới thiệu đã đồng ý"
      onSelect={onFocus}
    >
      <div className="space-y-5">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Người giới thiệu #{index + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Họ tên"
                value={item.fullName}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, fullName: val };
                  onChange(next);
                }}
              />
              <Field
                label="Vị trí"
                value={item.position}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, position: val };
                  onChange(next);
                }}
              />
              <Field
                label="Công ty"
                value={item.company}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, company: val };
                  onChange(next);
                }}
              />
              <Field
                label="Email"
                value={item.email}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, email: val };
                  onChange(next);
                }}
              />
              <Field
                label="Số điện thoại"
                value={item.phone}
                onChange={(val) => {
                  const next = [...items];
                  next[index] = { ...item, phone: val };
                  onChange(next);
                }}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...items, createReferenceItem()])}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-white px-4 py-4 text-sm font-extrabold text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus size={16} className="mr-2" /> Thêm người giới thiệu
        </button>
      </div>
    </EditorShellCard>
  );
}

function SortableSectionItem({
  sectionKey,
  title,
  locked,
  onToggle,
}: {
  sectionKey: CvSectionKey;
  title: string;
  locked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-200 ${
        isDragging ? 'opacity-70 shadow-lg ring-2 ring-emerald-200' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-500 active:cursor-grabbing"
          title="Kéo để đổi vị trí"
        >
          <GripVertical size={16} />
        </button>

        <div>
          <div className="font-extrabold text-gray-900">{title}</div>
          <div className="mt-0.5 text-xs font-medium text-gray-400">
            {locked ? 'Phần bắt buộc' : 'Có thể ẩn'}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        disabled={locked}
        className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
          locked
            ? 'cursor-not-allowed bg-gray-50 text-gray-300'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
        }`}
      >
        {locked ? 'Khóa' : 'Ẩn đi'}
      </button>
    </div>
  );
}

function TemplateMiniPreview({
  templateId,
  accent,
  compact,
}: {
  templateId: CvTemplateId;
  accent: string;
  compact?: boolean;
}) {
  const isSplit = templateId === 'professional' || templateId === 'modern';

  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-md ${
        compact ? 'h-full w-full' : 'h-full max-w-[240px]'
      }`}
    >
      <div className="p-3" style={{ borderBottom: `4px solid ${accent}` }}>
        <div className="mb-2 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-200" />
          <div className="flex-1">
            <div className="mb-1 h-2.5 w-16 rounded-full bg-gray-900" />
            <div className="mb-1.5 h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-gray-100" />
              <div className="h-1.5 w-4/5 rounded-full bg-gray-100" />
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-2 p-3 ${isSplit ? 'grid-cols-[1.5fr_1fr]' : 'grid-cols-1'}`}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-md border border-gray-100 p-2">
              <div className="mb-1.5 h-1.5 w-12 rounded-full bg-gray-800" />
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-gray-100" />
                <div className="h-1.5 w-11/12 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        {isSplit ? (
          <div className="space-y-2 rounded-md bg-gray-50 p-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <div className="mb-1.5 h-1.5 w-8 rounded-full bg-gray-700" />
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CvPreview({ doc }: { doc: CvDocument }) {
  const fontFamilyMap: Record<string, string> = {
    Inter: 'Inter, Arial, sans-serif',
    Roboto: 'Roboto, Arial, sans-serif',
    Montserrat: 'Montserrat, Arial, sans-serif',
    Merriweather: 'Merriweather, Georgia, serif',
    Arial: 'Arial, Helvetica, sans-serif',
    'Times New Roman': '"Times New Roman", Times, serif',
    Georgia: 'Georgia, serif',
    Calibri: 'Calibri, Arial, sans-serif',
    Cambria: 'Cambria, Georgia, serif',
    Verdana: 'Verdana, Geneva, sans-serif',
    Tahoma: 'Tahoma, Geneva, sans-serif',
    'Trebuchet MS': '"Trebuchet MS", Helvetica, sans-serif',
    Helvetica: 'Helvetica, Arial, sans-serif',
  };

  const fontFamily =
    fontFamilyMap[doc.theme.fontFamily] || 'Inter, Arial, sans-serif';

  const split = doc.theme.layout !== 'single';
  const sidebarSections: CvSectionKey[] = split
    ? ['skills', 'certificates', 'awards', 'references', 'hobbies', 'additional']
    : [];

  const enabledOrder = doc.sectionOrder.filter((key) =>
    doc.enabledSections.includes(key),
  );

  const mainSections = enabledOrder.filter((key) => !sidebarSections.includes(key));
  const sideSections = enabledOrder.filter((key) => sidebarSections.includes(key));

  return (
    <div
      className={`w-[794px] min-h-[1123px] bg-gradient-to-br text-left ${backgroundClass(
        doc.theme.backgroundPreset,
      )}`}
      style={{
        fontFamily,
        fontSize: `${doc.theme.bodyFontSize}px`,
        lineHeight: doc.theme.lineHeight,
        color: doc.theme.primaryColor,
      }}
    >
      <div className="h-full w-full bg-white/90">
        <div
          className={`border-b-[4px] p-8 md:p-10 ${
            doc.theme.templateId === 'modern' ? 'bg-gradient-to-br' : ''
          }`}
          style={{
            borderBottomColor: doc.theme.accentColor,
            background:
              doc.theme.templateId === 'modern'
                ? `linear-gradient(135deg, ${doc.theme.accentColor}18 0%, transparent 60%)`
                : undefined,
          }}
        >
          <div className="grid grid-cols-[115px_1fr] items-center gap-6">
            <div className="flex h-[115px] w-[115px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-gray-200 bg-gray-100 shadow-sm">
              {doc.basics.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.basics.avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[40px] font-black text-gray-300">
                  {(doc.basics.fullName || 'U').trim().charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h1
                className="truncate font-black uppercase leading-none tracking-wide text-gray-950"
                style={{ fontSize: `${doc.theme.headingFontSize}px` }}
              >
                {doc.basics.fullName || 'HỌ VÀ TÊN'}
              </h1>

              <div
                className="mt-2 truncate font-bold"
                style={{
                  color: doc.theme.accentColor,
                  fontSize: `${Math.max(doc.theme.subheadingFontSize + 2, 16)}px`,
                }}
              >
                {doc.basics.jobTitle || 'Vị trí ứng tuyển'}
              </div>

              {doc.basics.headline ? (
                <p className="mt-3 max-w-3xl text-[14px] leading-6 text-gray-600">
                  {doc.basics.headline}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium text-gray-600">
                {doc.basics.phone ? <span>{doc.basics.phone}</span> : null}
                {doc.basics.email ? <span>{doc.basics.email}</span> : null}
                {doc.basics.website ? <span>{doc.basics.website}</span> : null}
                {doc.basics.address ? <span>{doc.basics.address}</span> : null}
              </div>
            </div>
          </div>
        </div>

        {split ? (
          <div
            className={`grid ${
              doc.theme.layout === 'split-left'
                ? 'grid-cols-[240px_1fr]'
                : 'grid-cols-[1fr_240px]'
            }`}
          >
            {doc.theme.layout === 'split-left' ? (
              <>
                <CvSidebar doc={doc} sectionKeys={sideSections} />
                <CvMainContent doc={doc} sectionKeys={mainSections} />
              </>
            ) : (
              <>
                <CvMainContent doc={doc} sectionKeys={mainSections} />
                <CvSidebar doc={doc} sectionKeys={sideSections} />
              </>
            )}
          </div>
        ) : (
          <CvMainContent doc={doc} sectionKeys={mainSections} />
        )}
      </div>
    </div>
  );
}

function CvMainContent({
  doc,
  sectionKeys,
}: {
  doc: CvDocument;
  sectionKeys: CvSectionKey[];
}) {
  return (
    <div className="space-y-6 p-8 md:p-10">
      {sectionKeys.map((key) => (
        <CvSectionBlock key={key} doc={doc} sectionKey={key} />
      ))}
    </div>
  );
}

function CvSidebar({
  doc,
  sectionKeys,
}: {
  doc: CvDocument;
  sectionKeys: CvSectionKey[];
}) {
  return (
    <div className="space-y-6 border-l border-r border-gray-100 bg-gray-50/60 p-6">
      {sectionKeys.map((key) => (
        <CvSectionBlock key={key} doc={doc} sectionKey={key} compact />
      ))}
    </div>
  );
}

function CvSectionBlock({
  doc,
  sectionKey,
  compact,
}: {
  doc: CvDocument;
  sectionKey: CvSectionKey;
  compact?: boolean;
}) {
  const titleStyle = {
    color: doc.theme.accentColor,
    fontSize: `${doc.theme.subheadingFontSize}px`,
  };

  const titleCls = compact
    ? 'mb-3 font-black uppercase tracking-wide'
    : 'mb-3 font-black uppercase tracking-wide';

  if (sectionKey === 'summary') {
    if (!doc.sections.summary?.trim()) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.summary}
        </h2>
        <p className="whitespace-pre-line leading-7 text-gray-700">
          {doc.sections.summary}
        </p>
      </section>
    );
  }

  if (sectionKey === 'experience') {
    const items = doc.sections.experience.filter(
      (item) => item.organization || item.role || item.description || item.bullets.some((b) => b.text),
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.experience}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <CvTimelineCard key={item.id} item={item} accentColor={doc.theme.accentColor} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'education') {
    const items = doc.sections.education.filter(
      (item) => item.school || item.major || item.description || item.bullets.some((b) => b.text),
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.education}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <CvEducationCard key={item.id} item={item} accentColor={doc.theme.accentColor} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'projects') {
    const items = doc.sections.projects.filter(
      (item) => item.organization || item.role || item.description || item.bullets.some((b) => b.text),
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.projects}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <CvTimelineCard key={item.id} item={item} accentColor={doc.theme.accentColor} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'activities') {
    const items = doc.sections.activities.filter(
      (item) => item.organization || item.role || item.description || item.bullets.some((b) => b.text),
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.activities}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <CvTimelineCard key={item.id} item={item} accentColor={doc.theme.accentColor} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'skills') {
    const items = doc.sections.skills.filter((item) => item.name);
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.skills}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-800">{item.name}</span>
                <span className="text-xs font-bold text-gray-400">{item.level}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, item.level))}%`,
                    backgroundColor: doc.theme.accentColor,
                  }}
                />
              </div>
              {item.category ? (
                <div className="mt-1 text-xs font-medium text-gray-500">{item.category}</div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'certificates') {
    const items = doc.sections.certificates.filter(
      (item) => item.title || item.subtitle || item.description,
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.certificates}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <CvSimpleCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'awards') {
    const items = doc.sections.awards.filter(
      (item) => item.title || item.subtitle || item.description,
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.awards}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <CvSimpleCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'references') {
    const items = doc.sections.references.filter(
      (item) => item.fullName || item.position || item.company || item.email || item.phone,
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.references}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="font-bold text-gray-900">{item.fullName}</div>
              <div className="text-sm text-gray-600">
                {[item.position, item.company].filter(Boolean).join(' • ')}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {[item.email, item.phone].filter(Boolean).join(' • ')}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sectionKey === 'hobbies') {
    const items = doc.sections.hobbies.filter(Boolean);
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.hobbies}
        </h2>
        <ul className="space-y-1 text-gray-700">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: doc.theme.accentColor }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (sectionKey === 'additional') {
    const items = doc.sections.additional.filter(
      (item) => item.title || item.subtitle || item.description,
    );
    if (!items.length) return null;
    return (
      <section>
        <h2 className={titleCls} style={titleStyle}>
          {CV_SECTION_TITLES.additional}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <CvSimpleCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  return null;
}

function CvTimelineCard({
  item,
  accentColor,
}: {
  item: CvTimelineItem;
  accentColor: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900">{item.role || 'Vị trí'}</div>
          <div className="text-sm font-semibold" style={{ color: accentColor }}>
            {item.organization || 'Tên tổ chức'}
          </div>
        </div>
        <div className="text-right text-xs font-semibold text-gray-500">
          <div>{[item.start, item.end].filter(Boolean).join(' - ') || 'Thời gian'}</div>
          {item.location ? <div className="mt-1">{item.location}</div> : null}
        </div>
      </div>

      {item.description ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
          {item.description}
        </p>
      ) : null}

      {item.bullets.filter((b) => b.text.trim()).length ? (
        <ul className="mt-3 space-y-1.5 text-sm leading-6 text-gray-700">
          {item.bullets
            .filter((b) => b.text.trim())
            .map((bullet) => (
              <li key={bullet.id} className="flex gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span>{bullet.text}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

function CvEducationCard({
  item,
  accentColor,
}: {
  item: CvEducationItem;
  accentColor: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900">{item.school || 'Trường học'}</div>
          <div className="text-sm font-semibold" style={{ color: accentColor }}>
            {item.major || 'Ngành học'}
          </div>
        </div>
        <div className="text-right text-xs font-semibold text-gray-500">
          <div>{[item.start, item.end].filter(Boolean).join(' - ') || 'Thời gian'}</div>
          {item.location ? <div className="mt-1">{item.location}</div> : null}
        </div>
      </div>

      {item.description ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
          {item.description}
        </p>
      ) : null}

      {item.bullets.filter((b) => b.text.trim()).length ? (
        <ul className="mt-3 space-y-1.5 text-sm leading-6 text-gray-700">
          {item.bullets
            .filter((b) => b.text.trim())
            .map((bullet) => (
              <li key={bullet.id} className="flex gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span>{bullet.text}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

function CvSimpleCard({ item }: { item: CvSimpleItem }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      {item.title ? <div className="font-bold text-gray-900">{item.title}</div> : null}
      {item.subtitle ? <div className="text-sm text-gray-600">{item.subtitle}</div> : null}
      {item.description ? (
        <div className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">
          {item.description}
        </div>
      ) : null}
    </div>
  );
}