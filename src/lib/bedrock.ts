import { gateway } from '@ai-sdk/gateway'
import { generateText, streamText } from 'ai'
import { z } from 'zod'

// Model - Claude Sonnet 4 through AI Gateway (faster than Opus)
export const model = gateway('anthropic/claude-sonnet-4')

// Re-export for convenience
export { generateText, streamText, z, gateway }