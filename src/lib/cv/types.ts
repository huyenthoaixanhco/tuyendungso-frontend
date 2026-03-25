export type CvTemplateId = 'standard' | 'professional' | 'modern' | 'harvard';
export type CvLayout = 'single' | 'split-left' | 'split-right';

export type CvFontFamily =
  | 'Inter'
  | 'Roboto'
  | 'Merriweather'
  | 'Montserrat'
  | 'Arial'
  | 'Times New Roman'
  | 'Georgia'
  | 'Calibri'
  | 'Cambria'
  | 'Verdana'
  | 'Tahoma'
  | 'Trebuchet MS'
  | 'Helvetica';

export type CvLanguage = 'vi';

export type CvSectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certificates'
  | 'awards'
  | 'activities'
  | 'references'
  | 'hobbies'
  | 'additional';

export type CvSectionTitleMap = Record<CvSectionKey, string>;

export type CvBulletItem = {
  id: string;
  text: string;
};

export type CvTimelineItem = {
  id: string;
  start: string;
  end: string;
  organization: string;
  role: string;
  location: string;
  description: string;
  bullets: CvBulletItem[];
};

export type CvEducationItem = {
  id: string;
  start: string;
  end: string;
  school: string;
  major: string;
  location: string;
  description: string;
  bullets: CvBulletItem[];
};

export type CvSimpleItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
};

export type CvReferenceItem = {
  id: string;
  fullName: string;
  position: string;
  company: string;
  email: string;
  phone: string;
};

export type CvSkillItem = {
  id: string;
  name: string;
  level: number;
  category: string;
};

export type CvBasics = {
  fullName: string;
  jobTitle: string;
  headline: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  avatarUrl: string;
};

export type CvTheme = {
  templateId: CvTemplateId;
  layout: CvLayout;
  fontFamily: CvFontFamily;

  // Cỡ chữ tổng thể
  fontSize: number;

  // Nâng cấp để chỉnh chữ thật hơn
  headingFontSize: number;
  subheadingFontSize: number;
  bodyFontSize: number;

  lineHeight: number;
  primaryColor: string;
  accentColor: string;
  backgroundPreset: string;
};

export type CvSections = {
  summary: string;
  experience: CvTimelineItem[];
  education: CvEducationItem[];
  projects: CvTimelineItem[];
  skills: CvSkillItem[];
  certificates: CvSimpleItem[];
  awards: CvSimpleItem[];
  activities: CvTimelineItem[];
  references: CvReferenceItem[];
  hobbies: string[];
  additional: CvSimpleItem[];
};

export type CvDocument = {
  id: string;
  name: string;
  language: CvLanguage;
  templateName: string;
  roleHint: string;
  createdAt: string;
  updatedAt: string;
  theme: CvTheme;
  basics: CvBasics;
  enabledSections: CvSectionKey[];
  sectionOrder: CvSectionKey[];
  sections: CvSections;
};

export type CvTemplateDefinition = {
  id: CvTemplateId;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  roleTags: string[];
  defaultTheme: Pick<
    CvTheme,
    | 'templateId'
    | 'layout'
    | 'fontFamily'
    | 'fontSize'
    | 'headingFontSize'
    | 'subheadingFontSize'
    | 'bodyFontSize'
    | 'lineHeight'
    | 'primaryColor'
    | 'accentColor'
    | 'backgroundPreset'
  >;
};