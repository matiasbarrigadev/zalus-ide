// This file is kept for backward compatibility but is no longer used
// with the new AI SDK implementation

import { Octokit } from '@octokit/rest'
import * as github from '../github'
import { createVercelClient } from '../vercel'

export interface ExecutorContext {
  githubToken: string
  vercelToken: string
  vercelTeamId?: string
  owner: string
  repo: string
}

export interface ToolResult {
  success: boolean
  result?: unknown
  error?: string
}

export interface ToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/**
 * Execute a tool call and return the result
 * @deprecated This function is no longer used with the AI SDK
 */
export async function executeToolCall(
  toolCall: ToolUse,
  context: ExecutorContext
): Promise<ToolResult> {
  const octokit = github.createGitHubClient(context.githubToken)
  const vercel = createVercelClient({
    token: context.vercelToken,
    teamId: context.vercelTeamId,
  })

  const toolName = toolCall.name
  const input = toolCall.input

  try {
    switch (toolName) {
      case 'list_repository_files': {
        const path = (input.path as string) || ''
        const files = await github.listRepositoryFiles(
          octokit,
          context.owner,
          context.repo,
          path
        )
        return {
          success: true,
          result: files.map((f) => ({
            name: f.name,
            path: f.path,
            type: f.type,
          })),
        }
      }

      case 'read_file': {
        const path = input.path as string
        const content = await github.readFile(
          octokit,
          context.owner,
          context.repo,
          path
        )
        return {
          success: true,
          result: { path, content },
        }
      }

      case 'write_files': {
        const files = input.files as Array<{ path: string; content: string }>
        const commitMessage = input.commit_message as string
        const branch = (input.branch as string) || 'main'

        const result = await github.writeFiles(
          octokit,
          context.owner,
          context.repo,
          files,
          commitMessage,
          branch
        )

        return {
          success: true,
          result: {
            commitSha: result.sha,
            commitUrl: result.url,
            filesModified: files.map((f) => f.path),
          },
        }
      }

      case 'delete_files': {
        const paths = input.paths as string[]
        const commitMessage = input.commit_message as string

        const result = await github.deleteFiles(
          octokit,
          context.owner,
          context.repo,
          paths,
          commitMessage
        )

        return {
          success: true,
          result: {
            commitSha: result.sha,
            filesDeleted: paths,
          },
        }
      }

      case 'search_in_repository': {
        const query = input.query as string
        const filePattern = input.file_pattern as string | undefined

        const results = await github.searchInRepository(
          octokit,
          context.owner,
          context.repo,
          query,
          filePattern
        )

        return {
          success: true,
          result: results,
        }
      }

      case 'get_deployment_status': {
        const projects = await vercel.listProjects()
        const project = projects.find(
          (p) => p.link?.repo === `${context.owner}/${context.repo}`
        )

        if (!project) {
          return {
            success: false,
            error: 'No se encontró un proyecto de Vercel vinculado a este repositorio',
          }
        }

        const deployment = await vercel.getLatestDeployment(project.id)

        if (!deployment) {
          return {
            success: true,
            result: { message: 'No hay deployments aún' },
          }
        }

        return {
          success: true,
          result: {
            id: deployment.id,
            state: deployment.state,
            url: `https://${deployment.url}`,
            createdAt: new Date(deployment.createdAt).toISOString(),
            commit: deployment.meta?.githubCommitMessage,
          },
        }
      }

      case 'create_branch': {
        const branchName = input.branch_name as string
        const baseBranch = (input.base_branch as string) || 'main'

        const result = await github.createBranch(
          octokit,
          context.owner,
          context.repo,
          branchName,
          baseBranch
        )

        return {
          success: true,
          result: {
            branch: branchName,
            ref: result.ref,
          },
        }
      }

      case 'create_pull_request': {
        const title = input.title as string
        const body = input.body as string | undefined
        const headBranch = input.head_branch as string
        const baseBranch = (input.base_branch as string) || 'main'

        const result = await github.createPullRequest(
          octokit,
          context.owner,
          context.repo,
          title,
          headBranch,
          baseBranch,
          body
        )

        return {
          success: true,
          result: {
            number: result.number,
            url: result.url,
          },
        }
      }

      default:
        return {
          success: false,
          error: `Herramienta desconocida: ${toolName}`,
        }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Format tool result for sending back to the model
 */
export function formatToolResult(toolUseId: string, result: ToolResult): string {
  if (result.success) {
    return JSON.stringify({
      tool_use_id: toolUseId,
      success: true,
      result: result.result,
    })
  } else {
    return JSON.stringify({
      tool_use_id: toolUseId,
      success: false,
      error: result.error,
    })
  }
}