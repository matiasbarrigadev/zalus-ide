import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { model, generateText } from '@/lib/bedrock'
import { getSystemPrompt, formatProjectContext } from '@/lib/agent/prompts'
import * as github from '@/lib/github'
import { createVercelClient } from '@/lib/vercel'

export const maxDuration = 60 // Allow up to 60 seconds for agent responses

interface AgentRequest {
  message: string
  owner: string
  repo: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
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

    // Create GitHub client for context
    const octokit = github.createGitHubClient(session.accessToken)
    
    // Create Vercel client
    const vercel = createVercelClient({
      token: process.env.VERCEL_TOKEN!,
      teamId: process.env.VERCEL_TEAM_ID,
    })

    // Get repo files for context
    let repoContext = ''
    try {
      const files = await github.listRepositoryFiles(octokit, owner, repo, '')
      repoContext = `\n\nArchivos en el repositorio:\n${files.map(f => `- ${f.path} (${f.type})`).join('\n')}`
    } catch {
      repoContext = '\n\n(No se pudieron cargar los archivos del repositorio)'
    }

    // Get deployment status
    let deploymentContext = ''
    try {
      const projects = await vercel.listProjects()
      const project = projects.find((p) => p.link?.repo === `${owner}/${repo}`)
      if (project) {
        const deployment = await vercel.getLatestDeployment(project.id)
        if (deployment) {
          deploymentContext = `\n\nDeployment actual: ${deployment.state} - https://${deployment.url}`
        }
      }
    } catch {
      // Ignore deployment errors
    }

    // Get system prompt with context
    const systemPrompt = getSystemPrompt(projectContext) + repoContext + deploymentContext

    // Build messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Call the model with AI SDK (simple text generation)
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
    })

    return NextResponse.json({
      response: result.text,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Agent error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}