import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { invokeModel, extractToolCalls, extractText, hasToolCalls, Message } from '@/lib/bedrock'
import { agentTools } from '@/lib/agent/tools'
import { getSystemPrompt, formatProjectContext } from '@/lib/agent/prompts'
import { executeToolCall, formatToolResult } from '@/lib/agent/executor'

export const maxDuration = 60 // Allow up to 60 seconds for agent responses

interface AgentRequest {
  message: string
  projectId: string
  owner: string
  repo: string
  conversationHistory?: Message[]
}

export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AgentRequest = await request.json()
    const { message, owner, repo, conversationHistory = [] } = body

    // Build project context
    const projectContext = formatProjectContext({
      repoName: `${owner}/${repo}`,
      techStack: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    })

    // Build messages array
    const messages: Message[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Get system prompt
    const systemPrompt = getSystemPrompt(projectContext)

    // Invoke the model
    let response = await invokeModel({
      systemPrompt,
      messages,
      tools: agentTools,
      maxTokens: 4096,
    })

    // Collect the assistant's response
    const assistantMessages: string[] = []
    const toolResults: Array<{ toolUseId: string; result: string }> = []

    // Process tool calls in a loop
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops

    while (hasToolCalls(response) && iterations < maxIterations) {
      iterations++

      // Extract text if any
      const text = extractText(response)
      if (text) {
        assistantMessages.push(text)
      }

      // Execute tool calls
      const toolCalls = extractToolCalls(response)
      for (const toolCall of toolCalls) {
        const result = await executeToolCall(toolCall, {
          githubToken: session.accessToken,
          vercelToken: process.env.VERCEL_TOKEN!,
          vercelTeamId: process.env.VERCEL_TEAM_ID,
          owner,
          repo,
        })

        const formattedResult = formatToolResult(toolCall.id, result)
        toolResults.push({ toolUseId: toolCall.id, result: formattedResult })
      }

      // Continue conversation with tool results
      const toolResultsContent = toolResults
        .map((tr) => `Tool result (${tr.toolUseId}): ${tr.result}`)
        .join('\n')

      messages.push({
        role: 'assistant',
        content: assistantMessages.join('\n') + '\n[Tool calls executed]',
      })
      messages.push({
        role: 'user',
        content: toolResultsContent,
      })

      // Get next response
      response = await invokeModel({
        systemPrompt,
        messages,
        tools: agentTools,
        maxTokens: 4096,
      })

      // Clear for next iteration
      toolResults.length = 0
    }

    // Extract final text response
    const finalText = extractText(response)
    if (finalText) {
      assistantMessages.push(finalText)
    }

    return NextResponse.json({
      response: assistantMessages.join('\n'),
      usage: response.usage,
      stopReason: response.stop_reason,
    })
  } catch (error) {
    console.error('Agent error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}