// ============================================
// Platform & Status Types
// ============================================

export type Platform = 'linkedin' | 'youtube' | 'facebook'
export type ProjectStatus = 'in_progress' | 'complete' | 'published'
export type SessionStatus = ProjectStatus // Alias for backward compatibility
export type WorkflowStep = 'hooks' | 'body' | 'intros' | 'titles' | 'ctas' | 'visuals' | 'thumbnails' | 'complete'

// ============================================
// Project Types (New)
// ============================================

export interface Project {
  id: string
  name: string
  topic: string
  target_audience: string
  content_style: string
  platform: Platform
  status: ProjectStatus
  current_step: WorkflowStep
  created_at: string
  updated_at: string
  published_at: string | null
  remix_of_project_id: string | null
}

export interface CreateProjectRequest {
  name: string
  topic: string
  target_audience?: string
  content_style?: string
  platform?: Platform
}

export interface UpdateProjectRequest {
  name?: string
  topic?: string
  target_audience?: string
  content_style?: string
  platform?: Platform
  status?: ProjectStatus
  current_step?: WorkflowStep
}

// ============================================
// Session Types (Legacy - kept for backward compatibility)
// ============================================

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

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  session_id?: string
  project_id?: string
  role: MessageRole
  content: string
  created_at: string
}

// ============================================
// Output Types
// ============================================

export interface VisualConcept {
  description: string
  preview_data?: string // Base64 or URL
}

export interface Output {
  id: string
  session_id?: string
  project_id?: string
  // Hooks
  hooks: string[]
  hooks_original: string[]
  selected_hook_index: number
  // Body content
  body_content: string
  body_content_original: string
  selected_body_index: number
  // Intros (for YouTube)
  intros: string[]
  intros_original: string[]
  selected_intro_index: number
  // Titles (for YouTube)
  titles: string[]
  titles_original: string[]
  selected_title_index: number
  // CTAs
  ctas: string[]
  ctas_original: string[]
  selected_cta_index: number
  // Visual concepts
  visual_concepts: VisualConcept[]
  visual_concepts_original: VisualConcept[]
  selected_visual_index: number
  // Research (web search results)
  research_context?: ResearchContext
  citations?: Citation[]
  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================
// Project Asset Types
// ============================================

export type AssetType = 'reference_image' | 'logo' | 'icon' | 'other'

export interface ProjectAsset {
  id: string
  project_id: string
  type: AssetType
  filename: string
  mime_type: string
  data?: string // Base64 encoded for frontend, BLOB in DB
  created_at: string
}

export interface UploadAssetRequest {
  project_id: string
  type: AssetType
  filename: string
  mime_type: string
  data: string // Base64 encoded
}

// ============================================
// Generated Image Types
// ============================================

export interface GeneratedImage {
  id: string
  project_id: string
  prompt: string
  image_data?: string // Base64 encoded for frontend
  image_url?: string
  width: number
  height: number
  model: string
  is_upscaled: boolean
  parent_image_id?: string
  created_at: string
}

export interface GenerateImageRequest {
  project_id: string
  prompt: string
  reference_image_id?: string
  width?: number
  height?: number
}

export interface RefineImageRequest {
  image_id: string
  refinement_prompt: string
}

export interface UpscaleImageRequest {
  image_id: string
  target_width?: number
  target_height?: number
}

// ============================================
// Content Version Types (Edit History)
// ============================================

export type ContentType = 'hook' | 'body' | 'intro' | 'title' | 'cta' | 'visual'
export type EditedBy = 'user' | 'assistant'

export interface ContentVersion {
  id: string
  project_id?: string
  session_id?: string
  content_type: ContentType
  content_index: number
  old_content: string
  new_content: string
  edited_by: EditedBy
  created_at: string
}

// ============================================
// Settings Types
// ============================================

export interface Setting {
  id: string
  key: string
  value: string
  updated_at: string
}

export type SettingKey =
  | 'hooks_agent_prompt'
  | 'body_agent_prompt'
  | 'intros_agent_prompt'
  | 'titles_agent_prompt'
  | 'ctas_agent_prompt'
  | 'thumbnails_agent_prompt'

// ============================================
// Favorite Types
// ============================================

export type FavoriteType = 'hook' | 'cta' | 'body' | 'visual' | 'template' | 'intro' | 'title' | 'thumbnail'

export interface Favorite {
  id: string
  type: FavoriteType
  content: string | VisualConcept | TemplateContent | GeneratedImage
  source_session_id?: string
  source_project_id?: string
  created_at: string
}

export interface TemplateContent {
  hooks: string[]
  body_content: string
  ctas: string[]
  visual_concepts: VisualConcept[]
  intros?: string[]
  titles?: string[]
}

// ============================================
// Performance Types
// ============================================

export interface PerformanceNotes {
  id: string
  session_id?: string
  project_id?: string
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

// ============================================
// Connection Types
// ============================================

export interface ConnectionStatus {
  connected: boolean
  last_checked: string
  error?: string
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  error: string
  message?: string
}

export interface ApiSuccess<T> {
  data: T
  message?: string
}

// ============================================
// Chat Types
// ============================================

export interface ChatRequest {
  session_id?: string
  project_id?: string
  message: string
}

export interface ChatResponse {
  userMessage: Message
  assistantMessage: Message
  output?: Partial<Output>
}

// ============================================
// AI Assistant Action Types
// ============================================

export type AssistantAction =
  | { type: 'edit_card'; content_type: ContentType; index: number; new_content: string }
  | { type: 'remove_card'; content_type: ContentType; index: number }
  | { type: 'select_card'; content_type: ContentType; index: number }
  | { type: 'regenerate_section'; content_type: ContentType }
  | { type: 'add_more'; content_type: ContentType }

export interface AssistantResponse {
  message: string
  actions?: AssistantAction[]
}

// ============================================
// Regenerate Types
// ============================================

export type RegenerateSection = 'hooks' | 'body' | 'intros' | 'titles' | 'ctas' | 'visuals'

export interface RegenerateRequest {
  session_id?: string
  project_id?: string
  section: RegenerateSection
}

// ============================================
// Export Types
// ============================================

export type ExportFormat = 'markdown' | 'pdf' | 'png' | 'clipboard'
export type ExportSection = 'hooks' | 'body' | 'intros' | 'titles' | 'ctas' | 'visuals' | 'thumbnails' | 'all'

export interface ExportRequest {
  session_id?: string
  project_id?: string
  format: ExportFormat
  section?: ExportSection
  selected_hook_index?: number
  selected_cta_index?: number
  selected_intro_index?: number
  selected_title_index?: number
}

// ============================================
// Workflow Types
// ============================================

export interface WorkflowConfig {
  platform: Platform
  steps: WorkflowStep[]
}

export const WORKFLOW_CONFIGS: Record<Platform, WorkflowConfig> = {
  linkedin: {
    platform: 'linkedin',
    steps: ['hooks', 'body', 'ctas', 'visuals', 'complete']
  },
  youtube: {
    platform: 'youtube',
    steps: ['hooks', 'intros', 'titles', 'thumbnails', 'complete']
  },
  facebook: {
    platform: 'facebook',
    steps: ['hooks', 'body', 'ctas', 'visuals', 'complete']
  }
}

export const STEP_LABELS: Record<WorkflowStep, string> = {
  hooks: 'Hooks',
  body: 'Body Content',
  intros: 'Intros',
  titles: 'Titles',
  ctas: 'Call to Action',
  visuals: 'Visual Concepts',
  thumbnails: 'Thumbnails',
  complete: 'Complete'
}

// ============================================
// Search & Research Types
// ============================================

export type SearchProvider = 'claude' | 'perplexity' | 'auto'

export interface SearchOptions {
  enabled: boolean
  provider: SearchProvider
  maxSearches?: number
  allowedDomains?: string[]
  blockedDomains?: string[]
}

export interface SearchResultItem {
  url: string
  title: string
  snippet: string
  pageAge?: string
}

export interface Citation {
  url: string
  title: string
  citedText: string
}

export interface SearchResult {
  id: string
  query: string
  results: SearchResultItem[]
  citations: Citation[]
  provider: 'claude' | 'perplexity'
  summary?: string
  created_at: string
}

export interface ResearchContext {
  searchResults: SearchResult[]
  summary: string
  keyFacts: string[]
  relevantSources: string[]
}

export interface ProjectSearchSettings {
  webSearchEnabled: boolean
  searchProvider: SearchProvider
  maxSearches: number
  allowedDomains?: string[]
}

export interface ResearchRequest {
  project_id: string
  query: string
  provider?: SearchProvider
}

export interface ResearchResponse {
  id: string
  project_id: string
  searchResult: SearchResult
  researchContext: ResearchContext
}
