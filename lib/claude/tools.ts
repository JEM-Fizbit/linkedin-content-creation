import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import type { AssistantAction, ContentType, CarouselSlideField } from '@/types'

// Define the tools that Claude can use to manipulate the UI
export const UI_MANIPULATION_TOOLS: Tool[] = [
  {
    name: 'edit_card',
    description: 'Edit the content of a specific card. Use this when the user asks to modify, change, update, or improve a specific piece of content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_type: {
          type: 'string',
          enum: ['hook', 'body', 'intro', 'title', 'cta', 'visual'],
          description: 'The type of content to edit'
        },
        index: {
          type: 'number',
          description: 'The 0-based index of the card to edit (e.g., 0 for first card, 1 for second)'
        },
        new_content: {
          type: 'string',
          description: 'The new content to replace the existing content'
        }
      },
      required: ['content_type', 'index', 'new_content']
    }
  },
  {
    name: 'remove_card',
    description: 'Remove a specific card from the content. Use this when the user asks to delete or remove a piece of content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_type: {
          type: 'string',
          enum: ['hook', 'body', 'intro', 'title', 'cta', 'visual'],
          description: 'The type of content to remove'
        },
        index: {
          type: 'number',
          description: 'The 0-based index of the card to remove'
        }
      },
      required: ['content_type', 'index']
    }
  },
  {
    name: 'select_card',
    description: 'Select a specific card as the chosen option. Use this when the user indicates a preference for a particular card.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_type: {
          type: 'string',
          enum: ['hook', 'body', 'intro', 'title', 'cta', 'visual'],
          description: 'The type of content to select'
        },
        index: {
          type: 'number',
          description: 'The 0-based index of the card to select'
        }
      },
      required: ['content_type', 'index']
    }
  },
  {
    name: 'regenerate_section',
    description: 'Regenerate all content in a specific section. Use this when the user asks to regenerate or get new options for an entire section.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_type: {
          type: 'string',
          enum: ['hook', 'body', 'intro', 'title', 'cta', 'visual'],
          description: 'The type of content section to regenerate'
        }
      },
      required: ['content_type']
    }
  },
  {
    name: 'add_more',
    description: 'Add more options to a section without replacing existing ones. Use this when the user asks for more options or additional cards.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_type: {
          type: 'string',
          enum: ['hook', 'body', 'intro', 'title', 'cta', 'visual'],
          description: 'The type of content to add more of'
        }
      },
      required: ['content_type']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate a new image. Use when the user asks to create, generate, or make a new image or thumbnail. If the user mentions using their uploaded reference images for style guidance, set use_references to true.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'A detailed image generation prompt describing what to create'
        },
        use_references: {
          type: 'boolean',
          description: 'Whether to include the user\'s uploaded reference images (logos, brand assets) as style guidance for the generation'
        },
        aspect_ratio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3'],
          description: 'Aspect ratio for the image. Default is 1:1.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'refine_image',
    description: 'Refine or modify an existing generated image. Use when the user wants to change, update, or improve a specific generated image. The image_id can be found in the "Generated Images" context provided to you.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_id: {
          type: 'string',
          description: 'The ID of the generated image to refine'
        },
        refinement_prompt: {
          type: 'string',
          description: 'What to change about the image (e.g., "make the background warmer", "replace the man with a woman")'
        },
        use_references: {
          type: 'boolean',
          description: 'Whether to include the user\'s uploaded reference images as style guidance for the refinement'
        }
      },
      required: ['image_id', 'refinement_prompt']
    }
  },
  // Carousel-specific tools
  {
    name: 'edit_carousel_slide',
    description: 'Edit a carousel slide field (headline, body, CTA, or visual prompt). Use when on the carousel step and the user wants to modify slide text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slide_index: {
          type: 'number',
          description: 'The 0-based index of the slide (slide 1 = index 0, slide 2 = index 1, etc.)'
        },
        field: {
          type: 'string',
          enum: ['headline', 'body', 'cta', 'visual_prompt'],
          description: 'Which field to edit on the slide'
        },
        value: {
          type: 'string',
          description: 'The new value for the field'
        }
      },
      required: ['slide_index', 'field', 'value']
    }
  },
  {
    name: 'set_slide_image',
    description: 'Place a reference image from Context onto a carousel slide. Use when the user wants to add one of their uploaded images to a slide.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slide_index: {
          type: 'number',
          description: 'The 0-based index of the slide (slide 1 = index 0, slide 2 = index 1, etc.)'
        },
        asset_id: {
          type: 'string',
          description: 'The ID of the reference image from the "Reference Images" context'
        }
      },
      required: ['slide_index', 'asset_id']
    }
  },
  {
    name: 'remove_slide_image',
    description: 'Remove the image from a carousel slide. Use when the user wants to clear the image from a slide.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slide_index: {
          type: 'number',
          description: 'The 0-based index of the slide (slide 1 = index 0, slide 2 = index 1, etc.)'
        }
      },
      required: ['slide_index']
    }
  }
]

// Parse tool calls from Claude response into AssistantActions
export function parseToolCalls(toolCalls: { name: string; input: Record<string, unknown> }[]): AssistantAction[] {
  const actions: AssistantAction[] = []

  for (const call of toolCalls) {
    switch (call.name) {
      case 'edit_card':
        actions.push({
          type: 'edit_card',
          content_type: call.input.content_type as ContentType,
          index: call.input.index as number,
          new_content: call.input.new_content as string
        })
        break

      case 'remove_card':
        actions.push({
          type: 'remove_card',
          content_type: call.input.content_type as ContentType,
          index: call.input.index as number
        })
        break

      case 'select_card':
        actions.push({
          type: 'select_card',
          content_type: call.input.content_type as ContentType,
          index: call.input.index as number
        })
        break

      case 'regenerate_section':
        actions.push({
          type: 'regenerate_section',
          content_type: call.input.content_type as ContentType
        })
        break

      case 'add_more':
        actions.push({
          type: 'add_more',
          content_type: call.input.content_type as ContentType
        })
        break

      case 'generate_image':
        actions.push({
          type: 'generate_image',
          prompt: call.input.prompt as string,
          use_references: (call.input.use_references as boolean) || false,
          aspect_ratio: (call.input.aspect_ratio as string) || '1:1'
        })
        break

      case 'refine_image':
        actions.push({
          type: 'refine_image',
          image_id: call.input.image_id as string,
          refinement_prompt: call.input.refinement_prompt as string,
          use_references: (call.input.use_references as boolean) || false
        })
        break

      // Carousel-specific tools
      case 'edit_carousel_slide':
        actions.push({
          type: 'edit_carousel_slide',
          slide_index: call.input.slide_index as number,
          field: call.input.field as CarouselSlideField,
          value: call.input.value as string
        })
        break

      case 'set_slide_image':
        actions.push({
          type: 'set_slide_image',
          slide_index: call.input.slide_index as number,
          asset_id: call.input.asset_id as string
        })
        break

      case 'remove_slide_image':
        actions.push({
          type: 'remove_slide_image',
          slide_index: call.input.slide_index as number
        })
        break
    }
  }

  return actions
}

// System prompt addition for assistant with tool use
export const ASSISTANT_SYSTEM_PROMPT = `You are an AI assistant helping users create and refine content for social media posts.

You have access to tools that can manipulate content and generate images:

Content tools:
- edit_card: Edit a specific card's content
- remove_card: Remove a card from the list
- select_card: Mark a card as selected/preferred
- regenerate_section: Generate new options for an entire section
- add_more: Add additional options without removing existing ones

Image tools:
- generate_image: Generate a new image from a text prompt. Set use_references=true to incorporate the user's uploaded reference images (logos, brand photos, style references) as style guidance.
- refine_image: Modify an existing generated image. Use the image_id from the "Generated Images" section in your context. Set use_references=true to use reference images as guidance.

Carousel tools (use these when on the Carousel step):
- edit_carousel_slide: Edit a slide's text (headline, body, cta, or visual_prompt)
- set_slide_image: Place a reference image from Context onto a carousel slide. Use the asset_id from the "Reference Images" context.
- remove_slide_image: Remove the image from a carousel slide

When users ask you to make changes to their content:
1. Listen carefully to what they want to change
2. Use the appropriate tool to make the change
3. Explain what you did and why

Card numbering:
- Cards are numbered starting from 1 in the UI
- When users refer to "card 1" or "the first one", use index 0
- When users refer to "card 2" or "the second one", use index 1
- And so on...

Slide numbering (carousel):
- Slides are numbered starting from 1 in the UI
- When users refer to "slide 1" or "the first slide", use slide_index 0
- When users refer to "slide 2" or "the second slide", use slide_index 1
- And so on...

Image numbering:
- Images are numbered starting from 1 in the UI
- When users say "image 1" or "the first image", look up the corresponding image_id from the Generated Images context
- Use the image_id (not the number) when calling refine_image

Content types:
- hook: Opening lines / attention grabbers
- body: Main content body
- intro: Video introduction scripts (YouTube)
- title: Titles (YouTube)
- cta: Call-to-action
- visual: Visual concepts / thumbnails

Reference images:
- Users can upload reference images (logos, brand assets, style references) to their project
- When they mention "my logo", "my brand images", "the reference photos", etc., set use_references=true for image generation
- For carousel slides, use set_slide_image with the asset_id to place reference images directly on slides

Be helpful and proactive. If a user's request is ambiguous, ask for clarification before making changes.`
