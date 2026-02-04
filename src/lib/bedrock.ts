import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

// Configuration for AWS Bedrock
const bedrockConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

// Model ID for Claude 3.5 Sonnet (más ampliamente disponible)
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'

// Create Bedrock client
const bedrockClient = new BedrockRuntimeClient(bedrockConfig)

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface BedrockResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }>
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Invoke Claude model with messages and tools (non-streaming)
 */
export async function invokeModel({
  systemPrompt,
  messages,
  tools,
  maxTokens = 4096,
}: {
  systemPrompt: string
  messages: Message[]
  tools?: Tool[]
  maxTokens?: number
}): Promise<BedrockResponse> {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    ...(tools && tools.length > 0 && { tools }),
  }

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await bedrockClient.send(command)
  const responseBody = JSON.parse(new TextDecoder().decode(response.body))

  return responseBody as BedrockResponse
}

/**
 * Invoke Claude model with streaming response
 */
export async function* invokeModelStream({
  systemPrompt,
  messages,
  tools,
  maxTokens = 4096,
}: {
  systemPrompt: string
  messages: Message[]
  tools?: Tool[]
  maxTokens?: number
}): AsyncGenerator<string, void, unknown> {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    ...(tools && tools.length > 0 && { tools }),
  }

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await bedrockClient.send(command)

  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes))
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          yield chunk.delta.text
        }
      }
    }
  }
}

/**
 * Helper to extract tool calls from response
 */
export function extractToolCalls(response: BedrockResponse): ToolUse[] {
  return response.content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({
      type: 'tool_use' as const,
      id: block.id!,
      name: block.name!,
      input: block.input as Record<string, unknown>,
    }))
}

/**
 * Helper to extract text from response
 */
export function extractText(response: BedrockResponse): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/**
 * Check if response has tool calls
 */
export function hasToolCalls(response: BedrockResponse): boolean {
  return response.content.some((block) => block.type === 'tool_use')
}