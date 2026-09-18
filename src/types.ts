export type TabType = 'home' | 'qbank' | 'reels' | 'profile';

export interface UserProfile {
  name: string;
  email: string;
  studentId: string;
  medicalCollege: string;
  yearOfStudy: string;
}

export interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  subtopic: string;
  question: string;
  options: string[];
  correct_answer?: string;
  correctAnswer?: string; // support both snake_case and camelCase
  explanation: string;
  image_url?: string;
  imageUrl?: string;
  difficulty?: string;
  created_at?: string;
  // Student interaction fields
  likes?: number;
  commentsCount?: number;
  isBookmarked?: boolean;
}
