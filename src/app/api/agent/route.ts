import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { model, streamText } from '@/lib/bedrock'
import { getSystemPrompt, formatProjectContext } from '@/lib/agent/prompts'
import * as github from '@/lib/github'
import { createVercelClient } from '@/lib/vercel'

export const maxDuration = 60

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

    const systemPrompt = getSystemPrompt(projectContext) + repoContext + deploymentContext

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Stream text response
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
    })

    // Return streaming response
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Agent error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}