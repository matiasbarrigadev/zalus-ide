import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'

// Create Amazon Bedrock provider
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

// Model - Claude Opus 4.5
export const model = bedrock('global.anthropic.claude-4-5-opus-20251101-v1:0')

// Re-export for convenience
export { generateText, streamText, tool, z }