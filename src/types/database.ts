export type QuestionType = 'true_false' | 'single_choice' | 'multiple_choice'
export type ExamDifficulty = 'facil' | 'medio' | 'dificil'

export interface AgeCategory {
  id: string
  name: string
  min_age: number
  max_age: number
  created_at: string
}

export interface Profile {
  id: string
  username: string
  display_name: string
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  category_id: string
  difficulty: ExamDifficulty
  is_admin: boolean
  created_at: string
}

export interface Test {
  id: string
  category_id: string
  title: string
  difficulty: ExamDifficulty
  is_published: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export interface QuestionOption {
  id: string
  label: string
}

/** Client-facing question shape. `correct_options` never travels to the browser. */
export interface Question {
  id: string
  test_id: string
  position: number
  question_type: QuestionType
  prompt: string
  options: QuestionOption[]
}

export interface TestAttempt {
  id: string
  test_id: string
  user_id: string
  score: number
  elapsed_seconds: number
  submitted_at: string
}

export interface AttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_options: string[]
  is_correct: boolean
}

/** Row returned by get_attempt_review(): one graded question with the
 * participant's answer and the correct answer, for post-submission review. */
export interface AttemptReviewRow {
  question_id: string
  position: number
  question_type: QuestionType
  prompt: string
  options: QuestionOption[]
  correct_options: string[]
  selected_options: string[]
  is_correct: boolean
}

export interface TestRankingRow {
  test_id: string
  user_id: string
  display_name: string
  score: number
  elapsed_seconds: number
  submitted_at: string
  rank: number
}

export interface CategoryRankingRow {
  category_id: string
  difficulty: ExamDifficulty
  user_id: string
  display_name: string
  attempts_count: number
  total_score: number
  average_score: number
  rank: number
}

export interface GeneralRankingRow {
  user_id: string
  display_name: string
  category_id: string
  category_name: string
  difficulty: ExamDifficulty
  attempts_count: number
  total_score: number
  average_score: number
  rank: number
}

export interface Database {
  public: {
    Tables: {
      age_categories: { Row: AgeCategory; Insert: Partial<AgeCategory>; Update: Partial<AgeCategory> }
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      tests: { Row: Test; Insert: Partial<Test>; Update: Partial<Test> }
      questions: { Row: Question; Insert: Partial<Question>; Update: Partial<Question> }
      test_attempts: { Row: TestAttempt; Insert: Partial<TestAttempt>; Update: Partial<TestAttempt> }
      attempt_answers: { Row: AttemptAnswer; Insert: Partial<AttemptAnswer>; Update: Partial<AttemptAnswer> }
    }
    Views: {
      test_rankings: { Row: TestRankingRow }
      category_rankings: { Row: CategoryRankingRow }
      general_rankings: { Row: GeneralRankingRow }
    }
    Functions: {
      submit_attempt: {
        Args: {
          p_test_id: string
          p_elapsed_seconds: number
          p_answers: { question_id: string; selected_options: string[] }[]
        }
        Returns: { attempt_id: string; score: number }
      }
      current_exam_difficulty: {
        Args: Record<string, never>
        Returns: ExamDifficulty
      }
      get_attempt_review: {
        Args: { p_attempt_id: string }
        Returns: AttemptReviewRow[]
      }
    }
  }
}
