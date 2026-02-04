import { gateway } from '@ai-sdk/gateway'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'

// Model via Vercel AI Gateway - Claude Opus 4 through Bedrock BYOK
// When using BYOK with Amazon Bedrock, use the standard model format
// AI Gateway will route through your Bedrock credentials
export const model = gateway('anthropic/claude-opus-4')

// Re-export for convenience
export { generateText, streamText, tool, z }