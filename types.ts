
export enum QuestionCategory {
  MATH = 'Mathematics',
  NUMERICAL_REASONING = 'Numerical Reasoning',
  VERBAL_REASONING = 'Verbal Reasoning'
}

export interface Question {
  id: string;
  text: string; // Supports LaTeX
  options: string[]; // Array of 4 or 5 strings
  optionImages?: (string | null)[]; // Optional array of base64 strings corresponding to options
  correctAnswerIndex: number; // 0-4
  category: QuestionCategory;
  topic?: string; // Specific knowledge point (e.g., Algebra, Geometry)
  explanation?: string;
  imageUrl?: string; // Base64 string (optional context image)
  explanationImageUrl?: string; // Base64 string (optional explanation image)
  sourcePage?: number; // The PDF page number where this question was found
  requiresImage?: boolean; // Indicates if the question refers to a diagram/image
  reviewStatus?: 'needs_review' | 'reviewed'; // Workflow status
}

export interface UserProfile {
  email: string;
  realName: string;
  username: string;
  school: string;
  yearLevel: string;
  referralSource: string;
  joinedAt: string;
  pictureUrl?: string;
  authProvider?: 'password' | 'google';
}

// Global declaration for external libraries loaded via CDN
declare global {
  interface Window {
    MathJax: any;
  }
}
