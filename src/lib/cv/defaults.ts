import type { CandidateProfileResponse } from '@/lib/api/candidate';
import type {
  CvBulletItem,
  CvDocument,
  CvEducationItem,
  CvReferenceItem,
  CvSectionKey,
  CvSectionTitleMap,
  CvSimpleItem,
  CvSkillItem,
  CvTemplateDefinition,
  CvTimelineItem,
} from './types';

export const CV_SECTION_TITLES: CvSectionTitleMap = {
  summary: 'Mục tiêu nghề nghiệp',
  experience: 'Kinh nghiệm làm việc',
  education: 'Học vấn',
  projects: 'Dự án',
  skills: 'Kỹ năng',
  certificates: 'Chứng chỉ',
  awards: 'Danh hiệu và giải thưởng',
  activities: 'Hoạt động',
  references: 'Người giới thiệu',
  hobbies: 'Sở thích',
  additional: 'Thông tin thêm',
};

export const MANDATORY_SECTIONS: CvSectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
];

export const OPTIONAL_SECTIONS: CvSectionKey[] = [
  'projects',
  'activities',
  'certificates',
  'awards',
  'references',
  'hobbies',
  'additional',
];

export const CV_TEMPLATES: CvTemplateDefinition[] = [
  {
    id: 'standard',
    name: 'Tiêu chuẩn',
    subtitle: 'Đơn giản, ATS-friendly',
    description:
      'Thiết kế gọn, dễ đọc, phù hợp đa số ngành nghề và tối ưu cho sàng lọc CV.',
    tags: ['ATS', 'Đơn giản', 'Chuyên nghiệp'],
    roleTags: ['Tất cả', 'Kế toán', 'Nhân sự', 'Kinh doanh'],
    defaultTheme: {
      templateId: 'standard',
      layout: 'single',
      fontFamily: 'Roboto',
      fontSize: 14,
      headingFontSize: 28,
      subheadingFontSize: 16,
      bodyFontSize: 14,
      lineHeight: 1.45,
      primaryColor: '#0f172a',
      accentColor: '#10b981',
      backgroundPreset: 'plain',
    },
  },
  {
    id: 'professional',
    name: 'Thanh lịch',
    subtitle: '2 cột, chuyên nghiệp',
    description:
      'Bố cục sidebar rõ ràng, phù hợp ứng viên có nhiều kỹ năng và chứng chỉ.',
    tags: ['Hiện đại', 'Chuyên nghiệp'],
    roleTags: ['Marketing', 'Kinh doanh', 'Quản lý'],
    defaultTheme: {
      templateId: 'professional',
      layout: 'split-left',
      fontFamily: 'Inter',
      fontSize: 14,
      headingFontSize: 28,
      subheadingFontSize: 16,
      bodyFontSize: 14,
      lineHeight: 1.45,
      primaryColor: '#0f172a',
      accentColor: '#ef4444',
      backgroundPreset: 'soft-blue',
    },
  },
  {
    id: 'modern',
    name: 'Ấn tượng',
    subtitle: 'Nổi bật, hiện đại',
    description:
      'Header rõ nhấn mạnh, phù hợp portfolio, product, design, marketing, startup.',
    tags: ['Hiện đại', 'Ấn tượng'],
    roleTags: ['Marketing', 'Product', 'Designer', 'IT'],
    defaultTheme: {
      templateId: 'modern',
      layout: 'split-right',
      fontFamily: 'Montserrat',
      fontSize: 14,
      headingFontSize: 30,
      subheadingFontSize: 16,
      bodyFontSize: 14,
      lineHeight: 1.5,
      primaryColor: '#111827',
      accentColor: '#2563eb',
      backgroundPreset: 'soft-purple',
    },
  },
  {
    id: 'harvard',
    name: 'Harvard',
    subtitle: 'Tối giản, học thuật',
    description:
      'Tông nghiêm túc, tối giản, phù hợp học thuật, internship, fresher và tư vấn.',
    tags: ['Harvard', 'Đơn giản'],
    roleTags: ['Intern', 'Fresher', 'Tư vấn', 'Phân tích'],
    defaultTheme: {
      templateId: 'harvard',
      layout: 'single',
      fontFamily: 'Times New Roman',
      fontSize: 13,
      headingFontSize: 26,
      subheadingFontSize: 15,
      bodyFontSize: 13,
      lineHeight: 1.45,
      primaryColor: '#111827',
      accentColor: '#7c2d12',
      backgroundPreset: 'paper',
    },
  },
];

export const CV_BACKGROUND_PRESETS = [
  { id: 'plain', label: 'Trắng', className: 'from-white via-white to-white' },
  {
    id: 'soft-blue',
    label: 'Xanh pastel',
    className: 'from-sky-50 via-white to-sky-100/60',
  },
  {
    id: 'soft-purple',
    label: 'Tím pastel',
    className: 'from-fuchsia-50 via-white to-violet-100/60',
  },
  {
    id: 'soft-green',
    label: 'Xanh mint',
    className: 'from-emerald-50 via-white to-lime-50',
  },
  {
    id: 'paper',
    label: 'Giấy',
    className: 'from-stone-50 via-white to-stone-100',
  },
] as const;

export const CV_FONT_OPTIONS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Montserrat', label: 'Montserrat' },
  { id: 'Merriweather', label: 'Merriweather' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Times New Roman', label: 'Times New Roman' },
  { id: 'Georgia', label: 'Georgia' },
  { id: 'Calibri', label: 'Calibri' },
  { id: 'Cambria', label: 'Cambria' },
  { id: 'Verdana', label: 'Verdana' },
  { id: 'Tahoma', label: 'Tahoma' },
  { id: 'Trebuchet MS', label: 'Trebuchet MS' },
  { id: 'Helvetica', label: 'Helvetica' },
] as const;

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createClientId(prefix: string) {
  return uid(prefix);
}

export function nowIso() {
  return new Date().toISOString();
}

export function createBulletItem(text = ''): CvBulletItem {
  return {
    id: uid('bullet'),
    text,
  };
}

export function createSkillItem(
  defaults?: Partial<CvSkillItem>,
): CvSkillItem {
  return {
    id: uid('skill'),
    name: '',
    category: 'Chuyên môn',
    level: 80,
    ...defaults,
  };
}

export function createReferenceItem(
  defaults?: Partial<CvReferenceItem>,
): CvReferenceItem {
  return {
    id: uid('ref'),
    fullName: '',
    position: '',
    company: '',
    email: '',
    phone: '',
    ...defaults,
  };
}

export function createEducationItem(
  defaults?: Partial<CvEducationItem>,
): CvEducationItem {
  const base: CvEducationItem = {
    id: uid('edu'),
    start: '',
    end: '',
    school: '',
    major: '',
    location: '',
    description: '',
    bullets: [createBulletItem('')],
  };

  return {
    ...base,
    ...defaults,
    bullets: defaults?.bullets?.length ? defaults.bullets : base.bullets,
  };
}

export function createTimelineItem(
  defaults?: Partial<CvTimelineItem>,
): CvTimelineItem {
  const base: CvTimelineItem = {
    id: uid('timeline'),
    start: '',
    end: '',
    organization: '',
    role: '',
    location: '',
    description: '',
    bullets: [createBulletItem('')],
  };

  return {
    ...base,
    ...defaults,
    bullets: defaults?.bullets?.length ? defaults.bullets : base.bullets,
  };
}

export function createSimpleItem(
  defaults?: Partial<CvSimpleItem>,
): CvSimpleItem {
  return {
    id: uid('simple'),
    title: '',
    subtitle: '',
    description: '',
    ...defaults,
  };
}

export function buildSkillItemsFromProfile(
  profile?: CandidateProfileResponse,
): CvSkillItem[] {
  return (profile?.skills || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) =>
      createSkillItem({
        name,
        category: 'Chuyên môn',
        level: 80,
      }),
    );
}

export function createDefaultCvDocument(
  profile?: CandidateProfileResponse,
  templateId: CvTemplateDefinition['id'] = 'standard',
): CvDocument {
  const template =
    CV_TEMPLATES.find((item) => item.id === templateId) || CV_TEMPLATES[0];

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const skills = buildSkillItemsFromProfile(profile);

  const summary =
    profile?.bio?.trim() ||
    `Ứng viên ${profile?.currentTitle || 'chuyên nghiệp'}, mong muốn phát triển ở vị trí ${
      profile?.desiredJobTitle || 'phù hợp'
    } và tạo giá trị thông qua năng lực chuyên môn, tinh thần trách nhiệm và khả năng phối hợp hiệu quả.`;

  return {
    id: uid('cv'),
    name: fullName
      ? `CV - ${fullName}`
      : `CV mới ${new Date().toLocaleDateString('vi-VN')}`,
    language: 'vi',
    templateName: template.name,
    roleHint: profile?.desiredJobTitle || profile?.currentTitle || '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    theme: {
      ...template.defaultTheme,
    },
    basics: {
      fullName,
      jobTitle: profile?.desiredJobTitle || profile?.currentTitle || '',
      headline: profile?.headline || '',
      birthDate: '',
      gender: '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      website: profile?.portfolioUrl || profile?.resumeUrl || '',
      address: profile?.desiredLocation || profile?.city || '',
      city: profile?.city || '',
      avatarUrl: profile?.avatarUrl || '',
    },
    enabledSections: [
      ...MANDATORY_SECTIONS,
      'projects',
      'activities',
      'certificates',
      'awards',
    ],
    sectionOrder: [
      'summary',
      'experience',
      'education',
      'projects',
      'skills',
      'activities',
      'certificates',
      'awards',
      'references',
      'hobbies',
      'additional',
    ],
    sections: {
      summary,
      experience: [
        createTimelineItem({
          organization: '',
          role: profile?.currentTitle || '',
          description:
            'Mô tả ngắn gọn trách nhiệm chính, quy mô công việc và kết quả đạt được bằng số liệu.',
        }),
      ],
      education: [
        createEducationItem({
          description:
            'GPA, môn học nổi bật, thành tích học thuật hoặc đề tài phù hợp.',
        }),
      ],
      projects: [
        createTimelineItem({
          organization: '',
          role: 'Tên dự án',
          description: 'Nêu mục tiêu, vai trò, công nghệ và kết quả định lượng.',
        }),
      ],
      skills,
      certificates: [createSimpleItem()],
      awards: [createSimpleItem()],
      activities: [
        createTimelineItem({
          organization: '',
          role: 'Hoạt động / CLB',
          description: 'Nêu vai trò, phạm vi đóng góp và kết quả.',
        }),
      ],
      references: [createReferenceItem()],
      hobbies: ['Đọc sách', 'Học công nghệ mới'],
      additional: [
        createSimpleItem({
          title: 'Thông tin thêm',
        }),
      ],
    },
  };
}

export function getSectionTitle(key: CvSectionKey) {
  return CV_SECTION_TITLES[key];
}