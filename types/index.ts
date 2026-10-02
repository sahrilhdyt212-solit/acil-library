export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverVariant {
  w: number;
  path: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  category_id: string | null;
  publication_year: number | null;
  cover_path: string | null;
  pdf_path: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  /** Responsive cover sizes (DB jsonb). Empty/missing = use cover_path. */
  cover_variants?: CoverVariant[] | null;
  /** Runtime-resolved srcset (signed URLs). Never stored. */
  cover_srcset?: string | null;
  featured: boolean;
  published: boolean;
  download_enabled: boolean;
  created_at: string;
  updated_at: string;
  /** Joined category (when selected with embed). */
  category?: Pick<Category, "id" | "name" | "slug"> | null;
}

export interface BookWithCategory extends Book {
  category: Pick<Category, "id" | "name" | "slug"> | null;
}

export type BookSortKey = "newest" | "oldest" | "title-az" | "title-za";

export interface LibraryQuery {
  q?: string;
  category?: string; // category slug
  sort?: BookSortKey;
  limit?: number;
}

// ── Courses (FutureLearn-style learning paths) ──────────────

export type CourseStepKind = "video" | "book" | "quiz" | "discussion" | "article";

export const COURSE_STEP_KINDS: CourseStepKind[] = ["video", "book", "article", "quiz", "discussion"];

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  cover_url: string | null;
  published: boolean;
  requires_code: boolean;
  created_at: string;
  updated_at: string;
  /** Jumlah langkah (diisi runtime). */
  step_count?: number;
  // ── Sertifikat (diisi manual admin per kursus) ──
  provider?: string | null;
  duration_text?: string | null;
  outcomes?: string[] | null;
  syllabus?: string[] | null;
  ttd_image_path?: string | null;
  ttd_image_url?: string | null;
  ttd_name?: string | null;
  ttd_title?: string | null;
  certificate_enabled?: boolean;
}

export interface ReaderProfile {
  user_id: string;
  full_name: string | null;
  institution: string | null;
}

export interface Certificate {
  id: string;
  code: string;
  user_id: string;
  course_id: string;
  name_snapshot: string;
  course_title_snapshot: string;
  provider_snapshot: string | null;
  avg_score: number | null;
  issued_at: string;
}

export interface CourseStepBook {
  id: string;
  title: string;
  slug: string;
  author: string;
  cover_path: string | null;
}

export interface CourseStep {
  id: string;
  course_id: string;
  kind: CourseStepKind;
  title: string;
  position: number;
  /** Disembunyikan (null) untuk non-enrolled — soft-gating video. */
  youtube_url: string | null;
  book_id: string | null;
  prompt: string | null;
  /** Isi markdown untuk kind article (ditulis admin). */
  body: string | null;
  book?: CourseStepBook | null;
  /** Runtime: sudah diselesaikan user ini. */
  completed?: boolean;
  /** Runtime: boleh dibuka (semua langkah sebelumnya selesai). */
  unlocked?: boolean;
}

export interface Quiz {
  id: string;
  step_id: string;
  title: string;
  pass_score: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  position: number;
  question: string;
  explanation: string | null;
}

export interface QuizOption {
  id: string;
  question_id: string;
  position: number;
  text: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  course?: Pick<Course, "id" | "title" | "slug" | "description" | "cover_path" | "cover_url"> | null;
  /** Runtime dashboard. */
  total_steps?: number;
  done_steps?: number;
}

export interface StepComment {
  id: string;
  step_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  /** Selalu anonim di UI ("Peserta") — email tidak diekspos. */
  mine?: boolean;
}
