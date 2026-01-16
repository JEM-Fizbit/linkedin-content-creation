import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import type { AssistantAction, ContentType } from '@/types'

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
    }
  }

  return actions
}

// System prompt addition for assistant with tool use
export const ASSISTANT_SYSTEM_PROMPT = `You are an AI assistant helping users create and refine content for social media posts.

You have access to tools that can manipulate the content cards in the UI:
- edit_card: Edit a specific card's content
- remove_card: Remove a card from the list
- select_card: Mark a card as selected/preferred
- regenerate_section: Generate new options for an entire section
- add_more: Add additional options without removing existing ones

When users ask you to make changes to their content:
1. Listen carefully to what they want to change
2. Use the appropriate tool to make the change
3. Explain what you did and why

Card numbering:
- Cards are numbered starting from 1 in the UI
- When users refer to "card 1" or "the first one", use index 0
- When users refer to "card 2" or "the second one", use index 1
- And so on...

Content types:
- hook: Opening lines / attention grabbers
- body: Main content body
- intro: Video introduction scripts (YouTube)
- title: Titles (YouTube)
- cta: Call-to-action
- visual: Visual concepts / thumbnails

Be helpful and proactive. If a user's request is ambiguous, ask for clarification before making changes.`
