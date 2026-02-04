'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Loader2, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { ProgressIndicator } from '@/components/workflow/ProgressIndicator'
import { StepContainer } from '@/components/workflow/StepContainer'
import { CompleteSummary } from '@/components/workflow/CompleteSummary'
import { ContentCard } from '@/components/cards/ContentCard'
import { ImageCard } from '@/components/cards/ImageCard'
import { CustomContentCard, SkipOptionCard } from '@/components/cards/CustomContentCard'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { ContextPanel } from '@/components/context/ContextPanel'
import { ImageLightbox } from '@/components/modals/ImageLightbox'
import { ContentHistoryModal } from '@/components/modals/ContentHistoryModal'
import { RefineImageModal } from '@/components/modals/RefineImageModal'
import { ThumbnailHistoryModal } from '@/components/modals/ThumbnailHistoryModal'
import { UpscaleModal } from '@/components/modals/UpscaleModal'
import type { Project, Output, Message, WorkflowStep, GeneratedImage, VisualConcept, ContentType, CarouselSlide, CarouselTemplate } from '@/types'
import { WORKFLOW_CONFIGS, STEP_LABELS, PLATFORM_ASPECT_RATIOS, ASPECT_RATIO_OPTIONS } from '@/types'
import { VisualConceptCard } from '@/components/cards/VisualConceptCard'
import { CarouselEditor, TemplateImporter } from '@/components/carousel'

interface ProjectData {
  project: Project
  messages: Message[]
  output: Output | null
  generatedImages: Omit<GeneratedImage, 'image_data'>[]
}

interface CarouselData {
  id: string
  slides: CarouselSlide[]
  template_id?: string
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const projectId = params.id as string

  const [data, setData] = useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [fullImages, setFullImages] = useState<GeneratedImage[]>([])

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyModalData, setHistoryModalData] = useState<{
    contentType: ContentType
    contentIndex: number
    currentContent: string
    originalContent: string
  } | null>(null)

  // Thumbnail modal states
  const [refineModalOpen, setRefineModalOpen] = useState(false)
  const [refineImageData, setRefineImageData] = useState<{
    id: string
    url: string
    prompt: string
  } | null>(null)

  const [thumbnailHistoryOpen, setThumbnailHistoryOpen] = useState(false)
  const [currentThumbnailId, setCurrentThumbnailId] = useState<string | undefined>(undefined)

  const [upscaleModalOpen, setUpscaleModalOpen] = useState(false)
  const [upscaleImageData, setUpscaleImageData] = useState<{
    id: string
    url: string
    width: number
    height: number
  } | null>(null)

  // Generating image index (for per-card loading state)
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null)

  // Carousel state
  const [carousel, setCarousel] = useState<CarouselData | null>(null)
  const [carouselTemplate, setCarouselTemplate] = useState<CarouselTemplate | null>(null)
  const [isCarouselLoading, setIsCarouselLoading] = useState(false)
  const [showTemplateImporter, setShowTemplateImporter] = useState(false)

  // Track completed steps based on actual user selections
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([])

  // Aspect ratio for image generation
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<typeof ASPECT_RATIO_OPTIONS[0]>(ASPECT_RATIO_OPTIONS[0])

  // Calculate completed steps from output data and current step
  useEffect(() => {
    const output = data?.output
    const project = data?.project
    const config = project?.platform ? WORKFLOW_CONFIGS[project.platform] : null

    const completed: WorkflowStep[] = []

    // Setup: always completed once project exists (has topic)
    if (project?.topic) {
      completed.push('setup')
    }

    if (!output) {
      setCompletedSteps(completed)
      return
    }

    // Hooks: completed only if user explicitly selected (>= 0)
    if (output.selected_hook_index !== undefined && output.selected_hook_index >= 0) {
      completed.push('hooks')
    }

    // Body: completed if user has accepted it (selected_body_index >= 0)
    // This is set when user clicks "Next" from the body step
    if (output.selected_body_index !== undefined && output.selected_body_index >= 0) {
      completed.push('body')
    }

    // CTAs: completed if user selected (>= 0) OR explicitly skipped (-2)
    if (output.selected_cta_index !== undefined && (output.selected_cta_index >= 0 || output.selected_cta_index === -2)) {
      completed.push('ctas')
    }

    // Titles: completed only if user explicitly selected (>= 0)
    if (output.selected_title_index !== undefined && output.selected_title_index >= 0) {
      completed.push('titles')
    }

    // Visuals: completed if user selected (>= 0) OR explicitly skipped (-2)
    if (output.selected_visual_index !== undefined && (output.selected_visual_index >= 0 || output.selected_visual_index === -2)) {
      completed.push('visuals')
    }

    // YouTube-specific steps
    if (output.selected_intro_index !== undefined && output.selected_intro_index >= 0) {
      completed.push('intros')
    }
    if (output.selected_visual_index !== undefined && output.selected_visual_index >= 0) {
      completed.push('thumbnails')
    }

    // Summary (complete): marked done when all prior workflow steps are completed
    if (config) {
      const requiredSteps = config.steps.filter(s => s !== 'complete' && s !== 'setup')
      const allPriorStepsComplete = requiredSteps.every(step => completed.includes(step))
      if (allPriorStepsComplete) {
        completed.push('complete')
      }
    }

    setCompletedSteps(completed)
  }, [data?.output, data?.project?.current_step, data?.project?.platform, data?.project?.topic])

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }
      const projectData = await response.json()
      setData(projectData)

      // Fetch carousel data if it exists
      try {
        const carouselRes = await fetch(`/api/carousel/generate?project_id=${projectId}`)
        if (carouselRes.ok) {
          const carouselData = await carouselRes.json()
          setCarousel(carouselData)
        }
      } catch {
        // No carousel yet, that's fine
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // Set default aspect ratio based on platform when project loads
  useEffect(() => {
    if (data?.project?.platform) {
      const platformDefault = PLATFORM_ASPECT_RATIOS[data.project.platform]
      const matchingOption = ASPECT_RATIO_OPTIONS.find(
        opt => opt.width === platformDefault.width && opt.height === platformDefault.height
      )
      if (matchingOption) {
        setSelectedAspectRatio(matchingOption)
      }
    }
  }, [data?.project?.platform])

  // Generate content for current step
  const handleGenerate = async () => {
    if (!data) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const result = await response.json()
      setData(prev => prev ? { ...prev, output: result.output } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  // Regenerate a specific section
  const handleRegenerate = async (section: string) => {
    if (!data) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, section }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate content')
      }

      const result = await response.json()
      setData(prev => prev ? { ...prev, output: result.output } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate')
    } finally {
      setIsGenerating(false)
    }
  }

  // Add more content to the current section (append mode)
  const handleAddMore = async () => {
    if (!data) return

    const currentStep = data.project.current_step
    // Map current step to section name for API
    const section = currentStep === 'thumbnails' ? 'visuals' : currentStep

    // Don't allow adding more for body content (single item) or complete step
    if (section === 'body' || section === 'complete') return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, section, append: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to add more content')
      }

      const result = await response.json()
      setData(prev => prev ? { ...prev, output: result.output } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add more content')
    } finally {
      setIsGenerating(false)
    }
  }

  // Update step
  const handleStepChange = async (step: WorkflowStep) => {
    if (!data) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_step: step }),
      })

      if (!response.ok) {
        throw new Error('Failed to update step')
      }

      const updatedProject = await response.json()
      setData(prev => prev ? { ...prev, project: updatedProject } : null)
    } catch (err) {
      console.error('Failed to update step:', err)
    }
  }

  // Handle next step
  const handleNext = async () => {
    if (!data) return

    const config = WORKFLOW_CONFIGS[data.project.platform]
    const currentStep = data.project.current_step
    const currentIndex = config.steps.indexOf(currentStep)

    // When advancing from body step, mark it as accepted (selected_body_index = 0)
    // Body has only one card, so accepting it means selecting index 0
    if (currentStep === 'body' && data.output?.body_content) {
      await handleOutputUpdate({ selected_body_index: 0 })
    }

    if (currentIndex < config.steps.length - 1) {
      await handleStepChange(config.steps[currentIndex + 1])
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (!data) return

    const config = WORKFLOW_CONFIGS[data.project.platform]
    const currentIndex = config.steps.indexOf(data.project.current_step)
    if (currentIndex > 0) {
      handleStepChange(config.steps[currentIndex - 1])
    }
  }

  // Send chat message via assistant (tool-capable)
  const handleSendMessage = async (message: string) => {
    if (!data) return

    // Optimistic update: show user message immediately
    const tempId = `temp-${Date.now()}`
    const tempUserMessage: Message = {
      id: tempId,
      project_id: projectId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }
    setData(prev => prev ? { ...prev, messages: [...prev.messages, tempUserMessage] } : null)
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, message }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()

      setData(prev => {
        if (!prev) return null
        // Replace temp message with real user message + add assistant message
        const withoutTemp = prev.messages.filter(m => m.id !== tempId)
        return {
          ...prev,
          messages: [...withoutTemp, result.userMessage, result.assistantMessage],
          output: result.output || prev.output,
        }
      })

      // Always refresh project data after assistant response to catch any image/content changes
      // This ensures we get the latest images even if the response structure changes
      await fetchProject()
    } catch (err) {
      console.error('Chat error:', err)
      // Show error in chat, remove temp user message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        project_id: projectId,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      }
      setData(prev => {
        if (!prev) return null
        const withoutTemp = prev.messages.filter(m => m.id !== tempId)
        return { ...prev, messages: [...withoutTemp, tempUserMessage, errorMessage] }
      })
    } finally {
      setIsChatLoading(false)
    }
  }

  // Update output selection or content
  const handleOutputUpdate = async (updates: Partial<Output>) => {
    if (!data?.output) return

    try {
      const response = await fetch(`/api/outputs/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update output')
      }

      const result = await response.json()
      setData(prev => prev ? { ...prev, output: result.output } : null)
    } catch (err) {
      console.error('Failed to update output:', err)
    }
  }

  // Generate image from visual concept
  const handleGenerateImage = async (concept: VisualConcept, index: number) => {
    setGeneratingImageIndex(index)
    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          prompt: concept.description,
          visual_concept_index: index,
          width: selectedAspectRatio.width,
          height: selectedAspectRatio.height,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      // Refresh project data to get new images
      await fetchProject()
    } catch (err) {
      console.error('Failed to generate image:', err)
    } finally {
      setGeneratingImageIndex(null)
    }
  }

  // Regenerate image from new prompt (used in RefineImageModal)
  const handleRegenerateImage = async (newPrompt: string) => {
    if (!refineImageData) return

    try {
      // Find the visual concept index for this image
      const image = data?.generatedImages.find(img => img.id === refineImageData.id)
      const visualIndex = image?.visual_concept_index ?? 0

      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          prompt: newPrompt,
          visual_concept_index: visualIndex,
          width: selectedAspectRatio.width,
          height: selectedAspectRatio.height,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate image')
      }

      // Refresh to get the new image
      await fetchProject()
    } catch (err) {
      console.error('Failed to regenerate image:', err)
      throw err
    }
  }

  // Edit a visual concept description
  const handleEditVisualConcept = (index: number, newDescription: string) => {
    if (!data?.output) return
    const concepts = [...(data.output.visual_concepts || [])]
    concepts[index] = { ...concepts[index], description: newDescription }
    handleOutputUpdate({ visual_concepts: concepts })
  }

  // Delete a visual concept
  const handleDeleteVisualConcept = (index: number) => {
    if (!data?.output) return
    const concepts = [...(data.output.visual_concepts || [])]
    concepts.splice(index, 1)

    // Also remove from original if it matches
    const originalConcepts = [...(data.output.visual_concepts_original || [])]
    if (index < originalConcepts.length) {
      originalConcepts.splice(index, 1)
    }

    // Adjust selected index if needed
    let newSelectedIndex = data.output.selected_visual_index ?? 0
    if (index < newSelectedIndex) {
      newSelectedIndex--
    } else if (index === newSelectedIndex) {
      newSelectedIndex = Math.min(newSelectedIndex, concepts.length - 1)
    }

    handleOutputUpdate({
      visual_concepts: concepts,
      visual_concepts_original: originalConcepts,
      selected_visual_index: newSelectedIndex >= 0 ? newSelectedIndex : -1
    })
  }

  // Add a custom visual concept
  const handleAddCustomVisual = (description: string) => {
    if (!data?.output) return
    const concepts = [...(data.output.visual_concepts || [])]
    const newConcept = { description }
    concepts.push(newConcept)

    // Also add to original
    const originalConcepts = [...(data.output.visual_concepts_original || [])]
    originalConcepts.push(newConcept)

    handleOutputUpdate({
      visual_concepts: concepts,
      visual_concepts_original: originalConcepts,
      selected_visual_index: concepts.length - 1, // Select the new one
    })
  }

  // Open refine modal for an image
  const handleOpenRefineModal = (image: GeneratedImage) => {
    const imageUrl = image.image_data
      ? `data:image/png;base64,${image.image_data}`
      : image.image_url || ''
    setRefineImageData({
      id: image.id,
      url: imageUrl,
      prompt: image.prompt,
    })
    setRefineModalOpen(true)
  }

  // Refine an image with instructions
  const handleRefineImage = async (refinementPrompt: string) => {
    if (!refineImageData) return

    try {
      const response = await fetch('/api/images/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: refineImageData.id,
          refinement_prompt: refinementPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refine image')
      }

      // Refresh to get the new image
      await fetchProject()
    } catch (err) {
      console.error('Failed to refine image:', err)
      throw err
    }
  }

  // Open upscale modal for an image
  const handleOpenUpscaleModal = (image: GeneratedImage) => {
    const imageUrl = image.image_data
      ? `data:image/png;base64,${image.image_data}`
      : image.image_url || ''
    setUpscaleImageData({
      id: image.id,
      url: imageUrl,
      width: image.width || 1024,
      height: image.height || 576,
    })
    setUpscaleModalOpen(true)
  }

  // Upscale an image to 4K
  const handleUpscaleImage = async () => {
    if (!upscaleImageData) return

    try {
      const response = await fetch('/api/images/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: upscaleImageData.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to upscale image')
      }

      // Refresh to get the upscaled image
      await fetchProject()
    } catch (err) {
      console.error('Failed to upscale image:', err)
      throw err
    }
  }

  // Download an image
  const handleDownloadImage = (image: GeneratedImage) => {
    const imageUrl = image.image_data
      ? `data:image/png;base64,${image.image_data}`
      : image.image_url

    if (!imageUrl) return

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `thumbnail-${image.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Carousel handlers
  const handleGenerateCarousel = async () => {
    setIsCarouselLoading(true)
    try {
      const response = await fetch('/api/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          slide_count: 5,
          template_id: carouselTemplate?.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate carousel')
      }

      const carouselData = await response.json()
      setCarousel(carouselData)
    } catch (err) {
      console.error('Carousel generation error:', err)
    } finally {
      setIsCarouselLoading(false)
    }
  }

  const handleUpdateCarouselSlides = async (slides: CarouselSlide[]) => {
    if (!carousel) return

    try {
      const response = await fetch('/api/carousel/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carousel_id: carousel.id,
          slides
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setCarousel(updated)
      }
    } catch (err) {
      console.error('Failed to update carousel:', err)
    }
  }

  const handleRenderCarousel = async () => {
    if (!carousel) return

    setIsCarouselLoading(true)
    try {
      const response = await fetch('/api/carousel/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          carousel_id: carousel.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to render carousel')
      }

      const rendered = await response.json()
      setCarousel(rendered)
    } catch (err) {
      console.error('Carousel render error:', err)
    } finally {
      setIsCarouselLoading(false)
    }
  }

  const handleExportCarousel = async (format: 'pdf' | 'png-zip') => {
    if (!carousel) return

    setIsCarouselLoading(true)
    try {
      const response = await fetch('/api/export/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          carousel_id: carousel.id,
          format
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export carousel')
      }

      const result = await response.json()

      // Download the file
      const link = document.createElement('a')
      link.href = `data:${result.mime_type};base64,${result.data}`
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Carousel export error:', err)
      alert(err instanceof Error ? err.message : 'Failed to export carousel')
    } finally {
      setIsCarouselLoading(false)
    }
  }

  const handleTemplateImported = (template: CarouselTemplate) => {
    setCarouselTemplate(template)
    setShowTemplateImporter(false)
  }

  // Delete a generated image
  const handleDeleteImage = async (image: GeneratedImage) => {
    if (!confirm('Delete this thumbnail? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/images/${image.id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchProject()
      }
    } catch (err) {
      console.error('Failed to delete image:', err)
    }
  }

  // View image in full screen lightbox
  const handleViewFullScreen = async (image: GeneratedImage, index: number) => {
    // Fetch full image data if needed
    try {
      const response = await fetch(`/api/images/${image.id}`)
      if (response.ok) {
        const fullImage = await response.json()
        setFullImages([fullImage])
        setLightboxIndex(0)
        setLightboxOpen(true)
      }
    } catch (err) {
      console.error('Failed to load full image:', err)
    }
  }

  // Open thumbnail history modal
  const handleOpenThumbnailHistory = (imageId: string) => {
    setCurrentThumbnailId(imageId)
    setThumbnailHistoryOpen(true)
  }

  // Use a historical thumbnail version
  const handleUseThumbnailVersion = (imageId: string) => {
    // The visual is selected via output update if needed
    // For now just close the modal - the history shows all versions
    setThumbnailHistoryOpen(false)
  }

  // Get step-specific content
  const getStepContent = () => {
    if (!data) return null

    const { output, project } = data
    const currentStep = project.current_step

    // Setup stage - show editable project info
    if (currentStep === 'setup') {
      return (
        <div className="max-w-2xl mx-auto space-y-6 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={project.name}
                onChange={async (e) => {
                  try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: e.target.value }),
                    })
                    if (response.ok) {
                      const updated = await response.json()
                      setData(prev => prev ? { ...prev, project: updated } : null)
                    }
                  } catch (err) {
                    console.error('Failed to update project name:', err)
                  }
                }}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Platform
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300">
                {project.platform.charAt(0).toUpperCase() + project.platform.slice(1)}
                <span className="text-xs text-gray-500 ml-2">(cannot be changed after creation)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Topic
              </label>
              <textarea
                value={project.topic}
                onChange={async (e) => {
                  try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ topic: e.target.value }),
                    })
                    if (response.ok) {
                      const updated = await response.json()
                      setData(prev => prev ? { ...prev, project: updated } : null)
                    }
                  } catch (err) {
                    console.error('Failed to update topic:', err)
                  }
                }}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={project.target_audience || ''}
                onChange={async (e) => {
                  try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target_audience: e.target.value }),
                    })
                    if (response.ok) {
                      const updated = await response.json()
                      setData(prev => prev ? { ...prev, project: updated } : null)
                    }
                  } catch (err) {
                    console.error('Failed to update target audience:', err)
                  }
                }}
                placeholder="e.g., Marketing professionals, startup founders..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Style
              </label>
              <input
                type="text"
                value={project.content_style || ''}
                onChange={async (e) => {
                  try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content_style: e.target.value }),
                    })
                    if (response.ok) {
                      const updated = await response.json()
                      setData(prev => prev ? { ...prev, project: updated } : null)
                    }
                  } catch (err) {
                    console.error('Failed to update content style:', err)
                  }
                }}
                placeholder="e.g., Professional, casual, humorous..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            These settings help customize your AI-generated content. Click Next to proceed to content generation.
          </div>
        </div>
      )
    }

    // Check if we need to generate content first
    if (!output && currentStep !== 'complete' && currentStep !== 'setup') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Generate Content
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Click below to generate {STEP_LABELS[currentStep].toLowerCase()} for your {project.platform} content.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Content'
            )}
          </button>
        </div>
      )
    }

    if (currentStep === 'complete' && output) {
      return (
        <CompleteSummary
          project={project}
          output={output}
          onNavigateToStep={(step) => handleStepChange(step as WorkflowStep)}
          generatedImages={data.generatedImages}
        />
      )
    }

    if (currentStep === 'complete' && !output) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <p className="text-gray-500 dark:text-gray-400">No content generated yet.</p>
        </div>
      )
    }

    // Render content based on step
    const sectionMap: Record<string, {
      items: string[] | VisualConcept[]
      originalItems?: string[] | VisualConcept[]
      selectedIndex: number
      indexKey: string
      itemsKey: string
    }> = {
      hooks: { items: output?.hooks || [], originalItems: output?.hooks_original || [], selectedIndex: output?.selected_hook_index ?? -1, indexKey: 'selected_hook_index', itemsKey: 'hooks' },
      body: { items: [output?.body_content || ''], originalItems: [output?.body_content_original || ''], selectedIndex: output?.selected_body_index ?? -1, indexKey: 'selected_body_index', itemsKey: 'body_content' },
      intros: { items: output?.intros || [], originalItems: output?.intros_original || [], selectedIndex: output?.selected_intro_index ?? -1, indexKey: 'selected_intro_index', itemsKey: 'intros' },
      titles: { items: output?.titles || [], originalItems: output?.titles_original || [], selectedIndex: output?.selected_title_index ?? -1, indexKey: 'selected_title_index', itemsKey: 'titles' },
      ctas: { items: output?.ctas || [], originalItems: output?.ctas_original || [], selectedIndex: output?.selected_cta_index ?? -1, indexKey: 'selected_cta_index', itemsKey: 'ctas' },
      visuals: { items: output?.visual_concepts || [], originalItems: output?.visual_concepts_original || [], selectedIndex: output?.selected_visual_index ?? -1, indexKey: 'selected_visual_index', itemsKey: 'visual_concepts' },
      thumbnails: { items: output?.visual_concepts || [], originalItems: output?.visual_concepts_original || [], selectedIndex: output?.selected_visual_index ?? -1, indexKey: 'selected_visual_index', itemsKey: 'visual_concepts' },
    }

    // For carousel step (check before sectionMap since carousel isn't in it)
    if (currentStep === 'carousel') {
      if (showTemplateImporter) {
        return (
          <TemplateImporter
            projectId={projectId}
            onImported={handleTemplateImported}
            onCancel={() => setShowTemplateImporter(false)}
          />
        )
      }

      return (
        <div className="space-y-4">
          {/* Template selector */}
          {!carousel && !carouselTemplate && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Optional: Import a template from Canva for branded carousels
              </p>
              <button
                onClick={() => setShowTemplateImporter(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Import Template
              </button>
            </div>
          )}

          {carouselTemplate && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Template: {carouselTemplate.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {carouselTemplate.slide_count} slides
                </p>
              </div>
              <button
                onClick={() => setCarouselTemplate(null)}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Remove
              </button>
            </div>
          )}

          <CarouselEditor
            projectId={projectId}
            carousel={carousel}
            template={carouselTemplate}
            onUpdate={handleUpdateCarouselSlides}
            onGenerate={handleGenerateCarousel}
            onRender={handleRenderCarousel}
            onExport={handleExportCarousel}
            isLoading={isCarouselLoading}
          />
        </div>
      )
    }

    // Get section data for other steps
    const section = sectionMap[currentStep]
    if (!section) return null

    // For visuals/thumbnails, use ImageCard or VisualConceptCard
    if (currentStep === 'visuals' || currentStep === 'thumbnails') {
      // Get generated images for this project to match with concepts
      const generatedImages = data.generatedImages || []
      const isVisuals = currentStep === 'visuals'
      const isSkipped = section.selectedIndex === -2  // -2 means explicitly skipped

      return (
        <div className="space-y-4">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aspect Ratio:</span>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIO_OPTIONS.map((option) => (
                <button
                  key={option.ratio}
                  onClick={() => setSelectedAspectRatio(option)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    selectedAspectRatio.ratio === option.ratio
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Skip option for visuals (not thumbnails) */}
            {isVisuals && (
              <SkipOptionCard
                isSelected={isSkipped}
                onSelect={() => handleOutputUpdate({ selected_visual_index: -2 })}
                label="No Image Needed"
                description="Continue without a post image"
              />
            )}

            {(section.items as VisualConcept[]).map((concept, index) => {
              // Find matching generated image for this concept
              // First try explicit linkage via visual_concept_index
              let matchingImage = generatedImages.find(
                img => img.visual_concept_index === index
              ) as GeneratedImage | undefined

              // Fallback to prompt matching for backward compatibility with existing images
              if (!matchingImage) {
                matchingImage = generatedImages.find(
                  img => img.visual_concept_index === undefined &&
                         (img.prompt === concept.description || img.prompt?.includes(concept.description?.substring(0, 50)))
                ) as GeneratedImage | undefined
              }

              // If no image generated yet, show the VisualConceptCard (text-only with edit/delete)
              if (!matchingImage) {
                return (
                  <VisualConceptCard
                    key={index}
                    index={index}
                    concept={concept}
                    isSelected={!isSkipped && index === section.selectedIndex}
                    onSelect={() => handleOutputUpdate({ [section.indexKey]: index })}
                    onEdit={(newDescription) => handleEditVisualConcept(index, newDescription)}
                    onDelete={() => handleDeleteVisualConcept(index)}
                    onGenerate={() => handleGenerateImage(concept, index)}
                    isGenerating={generatingImageIndex === index}
                  />
                )
              }

              // Image exists, show the full ImageCard
              return (
                <ImageCard
                  key={index}
                  index={index}
                  concept={concept}
                  image={matchingImage}
                  isSelected={!isSkipped && index === section.selectedIndex}
                  onSelect={() => handleOutputUpdate({ [section.indexKey]: index })}
                  onGenerate={() => handleGenerateImage(concept, index)}
                  isGenerating={generatingImageIndex === index}
                  onRefine={matchingImage ? () => handleOpenRefineModal(matchingImage) : undefined}
                  onUpscale={matchingImage && !matchingImage.is_upscaled ? () => handleOpenUpscaleModal(matchingImage) : undefined}
                  onDelete={matchingImage ? () => handleDeleteImage(matchingImage) : undefined}
                  onDownload={matchingImage ? () => handleDownloadImage(matchingImage) : undefined}
                  onViewFullScreen={matchingImage ? () => handleViewFullScreen(matchingImage, index) : undefined}
                  onHistory={matchingImage ? () => handleOpenThumbnailHistory(matchingImage.id) : undefined}
                  showPrompt={true}
                />
              )
            })}

            {/* Custom concept input */}
            <CustomContentCard
              onSave={handleAddCustomVisual}
              placeholder="Describe your image concept..."
              label="Describe Your Own Image"
            />
          </div>
        </div>
      )
    }

    // For body content, show single card
    if (currentStep === 'body') {
      return (
        <div className="max-w-2xl mx-auto">
          <ContentCard
            index={0}
            content={output?.body_content || ''}
            isSelected={true}
            isEdited={output?.body_content !== output?.body_content_original}
            originalContent={output?.body_content_original}
            onEdit={(newContent) => handleOutputUpdate({ body_content: newContent })}
            onRevert={() => handleOutputUpdate({ body_content: output?.body_content_original })}
            showIndex={false}
            maxLines={20}
          />
        </div>
      )
    }

    // For other content types, show cards
    const originalItems = section.originalItems as string[] || []
    const isCTA = currentStep === 'ctas'
    const isSkipped = isCTA && section.selectedIndex === -2  // -2 means explicitly skipped

    // Map step to content type for history
    const stepToContentType: Record<string, ContentType> = {
      hooks: 'hook',
      intros: 'intro',
      titles: 'title',
      ctas: 'cta',
    }
    const contentType = stepToContentType[currentStep]

    // Handle adding custom content
    const handleAddCustomContent = (newContent: string) => {
      const items = [...(section.items as string[]), newContent]
      // Also update original items to include the new content as "original"
      const originalKey = section.itemsKey + '_original'
      const newOriginalItems = [...originalItems, newContent]
      handleOutputUpdate({
        [section.itemsKey]: items,
        [originalKey]: newOriginalItems,
        [section.indexKey]: items.length - 1, // Select the new item
      })
    }

    // Handle opening history modal
    const openHistoryModal = (index: number, current: string, original: string) => {
      setHistoryModalData({
        contentType,
        contentIndex: index,
        currentContent: current,
        originalContent: original,
      })
      setHistoryModalOpen(true)
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skip option for CTAs */}
        {isCTA && (
          <SkipOptionCard
            isSelected={isSkipped}
            onSelect={() => handleOutputUpdate({ selected_cta_index: -2 })}
            label="No CTA Needed"
            description="Continue without a call to action"
          />
        )}

        {(section.items as string[]).map((item, index) => {
          const originalContent = originalItems[index]
          const isEdited = originalContent !== undefined && item !== originalContent
          return (
            <ContentCard
              key={index}
              index={index}
              content={item}
              isSelected={!isSkipped && index === section.selectedIndex}
              isEdited={isEdited}
              originalContent={originalContent}
              onSelect={() => handleOutputUpdate({ [section.indexKey]: index })}
              onEdit={(newContent) => {
                const items = [...(section.items as string[])]
                items[index] = newContent
                handleOutputUpdate({ [section.itemsKey]: items })
              }}
              onRevert={isEdited ? () => {
                const items = [...(section.items as string[])]
                items[index] = originalContent
                handleOutputUpdate({ [section.itemsKey]: items })
              } : undefined}
              onHistory={contentType ? () => openHistoryModal(index, item, originalContent || item) : undefined}
            />
          )
        })}

        {/* Custom content input */}
        <CustomContentCard
          onSave={handleAddCustomContent}
          placeholder={`Write your own ${STEP_LABELS[currentStep].toLowerCase()}...`}
          label={`Write Your Own ${STEP_LABELS[currentStep]}`}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  const { project, messages, output } = data
  const sectionToRegenerate = project.current_step === 'thumbnails' ? 'visuals' : project.current_step

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.platform.charAt(0).toUpperCase() + project.platform.slice(1)} • {project.topic.substring(0, 50)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={project.current_step}
          platform={project.platform}
          onStepClick={handleStepChange}
          completedSteps={completedSteps}
        />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Context Panel - relative z-10 ensures it stays above other content */}
          <div className="px-6 pt-4 flex-shrink-0 relative z-10">
            <ContextPanel projectId={projectId} />
          </div>

          <StepContainer
            currentStep={project.current_step}
            platform={project.platform}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onRegenerate={output ? () => handleRegenerate(sectionToRegenerate) : undefined}
            onAddMore={output && project.current_step !== 'body' && project.current_step !== 'complete' ? handleAddMore : undefined}
            isLoading={isGenerating}
            canProceed={!!output}
            showAddMore={project.current_step !== 'body' && project.current_step !== 'complete'}
          >
            {getStepContent()}
          </StepContainer>
        </div>

        {/* Assistant Panel */}
        <div className="w-96 flex-shrink-0 h-full hidden lg:block">
          <AssistantPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            projectContext={{
              topic: project.topic,
              platform: project.platform,
              currentStep: STEP_LABELS[project.current_step],
            }}
          />
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={fullImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* Content History Modal */}
      {historyModalData && (
        <ContentHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false)
            setHistoryModalData(null)
          }}
          projectId={projectId}
          contentType={historyModalData.contentType}
          contentIndex={historyModalData.contentIndex}
          currentContent={historyModalData.currentContent}
          originalContent={historyModalData.originalContent}
          onUseVersion={(content) => {
            // Restore a version by updating the appropriate field
            const stepToField: Record<ContentType, string> = {
              hook: 'hooks',
              body: 'body_content',
              intro: 'intros',
              title: 'titles',
              cta: 'ctas',
              visual: 'visual_concepts',
            }
            const field = stepToField[historyModalData.contentType]
            if (field === 'body_content') {
              handleOutputUpdate({ body_content: content })
            } else if (output) {
              const items = [...(output[field as keyof Output] as string[])]
              items[historyModalData.contentIndex] = content
              handleOutputUpdate({ [field]: items })
            }
          }}
        />
      )}

      {/* Refine Image Modal */}
      {refineImageData && (
        <RefineImageModal
          isOpen={refineModalOpen}
          onClose={() => {
            setRefineModalOpen(false)
            setRefineImageData(null)
          }}
          currentImage={refineImageData}
          onRefine={handleRefineImage}
          onRegenerate={handleRegenerateImage}
        />
      )}

      {/* Thumbnail History Modal */}
      <ThumbnailHistoryModal
        isOpen={thumbnailHistoryOpen}
        onClose={() => {
          setThumbnailHistoryOpen(false)
          setCurrentThumbnailId(undefined)
        }}
        projectId={projectId}
        currentImageId={currentThumbnailId}
        onUseVersion={handleUseThumbnailVersion}
      />

      {/* Upscale Modal */}
      {upscaleImageData && (
        <UpscaleModal
          isOpen={upscaleModalOpen}
          onClose={() => {
            setUpscaleModalOpen(false)
            setUpscaleImageData(null)
          }}
          currentImage={upscaleImageData}
          onUpscale={handleUpscaleImage}
        />
      )}
    </div>
  )
}
