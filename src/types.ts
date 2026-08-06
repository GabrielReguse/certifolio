export type ThemeMode = 'light' | 'dark' | 'system';
export type ProfileVisibility = 'public' | 'unlisted' | 'private';
export type CourseVisibility = 'private' | 'public' | 'unlisted';
export type CourseStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned' | 'expired';

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};

export type Profile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  roleTitle: string;
  location: string;
  website: string;
  avatarKey?: string | null;
  avatarFormat?: string | null;
  bannerKey?: string | null;
  bannerFormat?: string | null;
  bannerPositionX: number;
  bannerPositionY: number;
  bannerZoom: number;
  profileVisibility: ProfileVisibility;
  profileLayout: 'grid' | 'timeline' | 'resume';
  publicTheme: ThemeMode;
  accentColor: string;
  showRating: boolean;
  showTotalHours: boolean;
  showInstitutions: boolean;
  allowIndexing: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  institutionId: string | null;
  institutionName: string;
  institutionWebsite: string;
  platformName: string;
  description: string;
  category: string;
  status: CourseStatus;
  hoursMinutes: number;
  startDate: string | null;
  endDate: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  rating: number;
  credentialId: string;
  verificationUrl: string;
  visibility: CourseVisibility;
  certificateVisibility: 'private' | 'public' | 'redacted';
  isFeatured: boolean;
  notes: string;
  skills: string[];
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CourseInput = {
  title: string;
  institutionName: string;
  institutionWebsite?: string;
  platformName: string;
  description: string;
  category: string;
  status: CourseStatus;
  hoursMinutes: number;
  startDate?: string;
  endDate?: string;
  issuedAt?: string;
  expiresAt?: string;
  rating: number;
  credentialId: string;
  verificationUrl: string;
  visibility: CourseVisibility;
  certificateVisibility: 'private' | 'public' | 'redacted';
  isFeatured: boolean;
  notes: string;
  skills: string[];
};

export type GoalMetric = 'hours' | 'courses';

export type LearningGoal = {
  id: string;
  title: string;
  metric: GoalMetric;
  targetValue: number;
  currentValue: number;
  remainingValue: number;
  percent: number;
  deadline: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoalInput = {
  title: string;
  metric: GoalMetric;
  targetValue: number;
  deadline?: string;
  isPinned: boolean;
};

export type DashboardData = {
  stats: {
    totalCourses: number;
    totalMinutes: number;
    averageRating: number;
    inProgress: number;
    publicCourses: number;
    institutions: number;
  };
  recent: Course[];
  topSkills: Array<{ name: string; count: number }>;
  pinnedGoal: LearningGoal | null;
};

export type Institution = {
  id: string;
  name: string;
  slug: string;
  website: string;
  status: string;
  courseCount: number;
  totalMinutes: number;
  lastActivity: string | null;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  issues?: unknown;
};
