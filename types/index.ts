// Session types
export type SessionStatus = 'in_progress' | 'complete' | 'published'

export interface Session {
  id: string
  title: string
  original_idea: string
  status: SessionStatus
  created_at: string
  updated_at: string
  published_at: string | null
  remix_of_session_id: string | null
}

// Message types
export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  created_at: string
}

// Output types
export interface VisualConcept {
  description: string
  preview_data?: string // Base64 or URL
}

export interface Output {
  id: string
  session_id: string
  hooks: string[]
  hooks_original: string[]
  body_content: string
  body_content_original: string
  ctas: string[]
  ctas_original: string[]
  visual_concepts: VisualConcept[]
  visual_concepts_original: VisualConcept[]
  created_at: string
  updated_at: string
}

// Favorite types
export type FavoriteType = 'hook' | 'cta' | 'body' | 'visual' | 'template'

export interface Favorite {
  id: string
  type: FavoriteType
  content: string | VisualConcept | TemplateContent
  source_session_id: string | null
  created_at: string
}

export interface TemplateContent {
  hooks: string[]
  body_content: string
  ctas: string[]
  visual_concepts: VisualConcept[]
}

// Performance types
export interface PerformanceNotes {
  id: string
  session_id: string
  views: number | null
  likes: number | null
  comments: number | null
  reposts: number | null
  notes: string
  recorded_at: string
}

export interface PerformanceStats {
  total_posts: number
  total_views: number
  total_likes: number
  total_comments: number
  total_reposts: number
  avg_engagement_rate: number
}

// Connection types
export interface ConnectionStatus {
  connected: boolean
  last_checked: string
  error?: string
}

// API response types
export interface ApiError {
  error: string
  message: string
}

// Chat types
export interface ChatRequest {
  session_id: string
  message: string
}

export interface ChatResponse {
  message: Message
  output?: Partial<Output>
}

export interface RegenerateRequest {
  session_id: string
  section: 'hooks' | 'body' | 'ctas' | 'visuals'
}

// Export types
export interface ExportRequest {
  session_id: string
  format: 'markdown' | 'pdf' | 'png' | 'clipboard'
  section?: 'hooks' | 'body' | 'ctas' | 'visuals' | 'all'
  selected_hook_index?: number
  selected_cta_index?: number
}
