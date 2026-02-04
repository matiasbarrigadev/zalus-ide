import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'

// Create Amazon Bedrock provider
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

// Model - Claude 3.5 Sonnet v2
export const model = bedrock('anthropic.claude-3-5-sonnet-20241022-v2:0')

// Re-export for convenience
export { generateText, streamText, tool, z }