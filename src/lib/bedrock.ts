import { gateway } from '@ai-sdk/gateway'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'

// Model via Vercel AI Gateway - Claude Opus 4.5 through Bedrock BYOK
// The gateway handles authentication via the configured Bedrock credentials
export const model = gateway('amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0')

// Re-export for convenience
export { generateText, streamText, tool, z }