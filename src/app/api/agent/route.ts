import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { model, streamText } from '@/lib/bedrock'
import { getSystemPrompt, formatProjectContext } from '@/lib/agent/prompts'
import * as github from '@/lib/github'
import { createVercelClient } from '@/lib/vercel'

export const maxDuration = 60

// Tool definitions for the agent
const TOOLS_DESCRIPTION = `
You have access to these tools. To use a tool, output a JSON block like this:
<tool_call>
{"tool": "tool_name", "params": {...}}
</tool_call>

Available tools:

1. list_files - List files in a directory
   params: { "path": "optional/path" }

2. read_file - Read content of a file
   params: { "path": "file/path" }

3. write_file - Create or modify a file (creates a commit)
   params: { "path": "file/path", "content": "file content", "message": "commit message" }

4. search_code - Search for code patterns
   params: { "query": "search text" }

After using tools, continue your response. You can use multiple tools.
When you're done, provide your final response without tool calls.
IMPORTANT: Give a final response to the user after analyzing the project.
`

interface ToolCall {
  tool: string
  params: Record<string, string>
}

interface ToolResult {
  tool: string
  success: boolean
  result?: unknown
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTools(toolCalls: ToolCall[], octokit: any, owner: string, repo: string): Promise<ToolResult[]> {
  const results: ToolResult[] = []

  for (const call of toolCalls) {
    try {
      switch (call.tool) {
        case 'list_files': {
          const path = call.params.path || ''
          const files = await github.listRepositoryFiles(octokit, owner, repo, path)
          results.push({
            tool: 'list_files',
            success: true,
            result: files.map(f => ({ name: f.name, path: f.path, type: f.type }))
          })
          break
        }

        case 'read_file': {
          const content = await github.readFile(octokit, owner, repo, call.params.path)
          results.push({
            tool: 'read_file',
            success: true,
            result: { path: call.params.path, content: content.substring(0, 4000) }
          })
          break
        }

        case 'write_file': {
          const writeResult = await github.writeFiles(
            octokit,
            owner,
            repo,
            [{ path: call.params.path, content: call.params.content }],
            call.params.message || 'Update file',
            'main'
          )
          results.push({
            tool: 'write_file',
            success: true,
            result: { path: call.params.path, sha: writeResult.sha }
          })
          break
        }

        case 'search_code': {
          const searchResults = await github.searchInRepository(octokit, owner, repo, call.params.query)
          results.push({
            tool: 'search_code',
            success: true,
            result: searchResults.slice(0, 5)
          })
          break
        }

        default:
          results.push({
            tool: call.tool,
            success: false,
            error: `Unknown tool: ${call.tool}`
          })
      }
    } catch (error) {
      results.push({
        tool: call.tool,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

function parseToolCalls(text: string): { toolCalls: ToolCall[], cleanText: string } {
  const toolCalls: ToolCall[] = []
  let cleanText = text

  const regex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.tool) {
        toolCalls.push({
          tool: parsed.tool,
          params: parsed.params || {}
        })
      }
      cleanText = cleanText.replace(match[0], '')
    } catch {
      // Invalid JSON, skip
    }
  }

  return { toolCalls, cleanText: cleanText.trim() }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()
    const { message, owner, repo, conversationHistory = [] } = body

    const projectContext = formatProjectContext({
      repoName: `${owner}/${repo}`,
      techStack: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    })

    const octokit = github.createGitHubClient(session.accessToken)
    const vercelToken = session.vercelAccessToken
    const vercel = vercelToken ? createVercelClient({ token: vercelToken }) : null

    let repoContext = ''
    try {
      const files = await github.listRepositoryFiles(octokit, owner, repo, '')
      repoContext = `\n\nArchivos en el repositorio:\n${files.map(f => `- ${f.path} (${f.type})`).join('\n')}`
    } catch {
      repoContext = ''
    }

    let deploymentContext = ''
    if (vercel) {
      try {
        const projects = await vercel.listProjects()
        const project = projects.find((p) => p.link?.repo === `${owner}/${repo}`)
        if (project) {
          const deployment = await vercel.getLatestDeployment(project.id)
          if (deployment) {
            deploymentContext = `\n\nDeployment: ${deployment.state} - https://${deployment.url}`
          }
        }
      } catch { /* ignore */ }
    }

    const systemPrompt = getSystemPrompt(projectContext) + TOOLS_DESCRIPTION + repoContext + deploymentContext

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const sendEvent = async (event: string, data: unknown) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    }

    // Start processing in background
    ;(async () => {
      try {
        const allToolCalls: Array<{ call: ToolCall; result: ToolResult }> = []
        let iterations = 0
        const maxIterations = 3

        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
          ...conversationHistory.map((m: { role: string; content: string }) => ({ 
            role: m.role as 'user' | 'assistant', 
            content: m.content 
          })),
          { role: 'user', content: message },
        ]

        while (iterations < maxIterations) {
          iterations++
          await sendEvent('iteration', { iteration: iterations })

          // Stream text
          const result = streamText({
            model,
            system: systemPrompt,
            messages,
          })

          let fullText = ''
          
          // Stream the response text
          for await (const chunk of result.textStream) {
            fullText += chunk
            await sendEvent('text', { text: chunk })
          }

          const { toolCalls, cleanText } = parseToolCalls(fullText)

          if (toolCalls.length === 0) {
            // No more tool calls, this is the final response
            await sendEvent('done', { response: cleanText || fullText })
            break
          }

          // Send tool calls
          await sendEvent('tool_calls', { tools: toolCalls })

          // Execute tools
          const toolResults = await executeTools(toolCalls, octokit, owner, repo)

          for (let i = 0; i < toolCalls.length; i++) {
            allToolCalls.push({
              call: toolCalls[i],
              result: toolResults[i]
            })
            await sendEvent('tool_result', { 
              call: toolCalls[i], 
              result: toolResults[i] 
            })
          }

          // If we're at the last iteration, send what we have
          if (iterations >= maxIterations) {
            await sendEvent('done', { 
              response: cleanText || 'He analizado el proyecto. ¿En qué puedo ayudarte?' 
            })
            break
          }

          // Add tool results to conversation
          const toolResultsMessage = toolResults.map((r, i) => 
            `Tool: ${toolCalls[i].tool}\nResult: ${JSON.stringify(r.result || r.error, null, 2)}`
          ).join('\n\n')

          messages.push({ role: 'assistant', content: fullText })
          messages.push({ role: 'user', content: `Tool results:\n${toolResultsMessage}\n\nNow give a concise response.` })
        }

        // Send final summary
        await sendEvent('complete', { 
          toolCalls: allToolCalls,
          iterations 
        })
      } catch (error) {
        await sendEvent('error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Agent error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}