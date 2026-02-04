import { gateway } from '@ai-sdk/gateway'
import { generateText, streamText } from 'ai'
import { z } from 'zod'

// Model - Claude Opus 4 through AI Gateway
export const model = gateway('anthropic/claude-opus-4')

// Re-export for convenience
export { generateText, streamText, z, gateway }