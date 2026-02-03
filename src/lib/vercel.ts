/**
 * Vercel API client for managing deployments and projects
 */

const VERCEL_API_BASE = 'https://api.vercel.com'

interface VercelConfig {
  token: string
  teamId?: string
}

export interface Deployment {
  id: string
  url: string
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED'
  createdAt: number
  meta?: {
    githubCommitSha?: string
    githubCommitMessage?: string
  }
}

export interface DeploymentLog {
  type: 'stdout' | 'stderr'
  text: string
  created: number
}

export interface VercelProject {
  id: string
  name: string
  framework?: string
  link?: {
    type: 'github'
    repo: string
    repoId: number
  }
}

/**
 * Create a Vercel API client
 */
export function createVercelClient(config: VercelConfig) {
  const headers: HeadersInit = {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  }

  const buildUrl = (path: string, params?: Record<string, string>) => {
    const url = new URL(`${VERCEL_API_BASE}${path}`)
    if (config.teamId) {
      url.searchParams.set('teamId', config.teamId)
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return url.toString()
  }

  return {
    /**
     * List all projects
     */
    async listProjects(): Promise<VercelProject[]> {
      const response = await fetch(buildUrl('/v9/projects'), { headers })
      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.statusText}`)
      }
      const data = await response.json()
      return data.projects
    },

    /**
     * Get a specific project
     */
    async getProject(projectId: string): Promise<VercelProject> {
      const response = await fetch(buildUrl(`/v9/projects/${projectId}`), { headers })
      if (!response.ok) {
        throw new Error(`Failed to get project: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Create a new project linked to a GitHub repo
     */
    async createProject(
      name: string,
      gitRepository: { type: 'github'; repo: string }
    ): Promise<VercelProject> {
      const response = await fetch(buildUrl('/v10/projects'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          gitRepository,
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: '.next',
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to create project: ${error.error?.message || response.statusText}`)
      }
      return response.json()
    },

    /**
     * List deployments for a project
     */
    async listDeployments(projectId: string, limit: number = 10): Promise<Deployment[]> {
      const response = await fetch(
        buildUrl('/v6/deployments', { projectId, limit: limit.toString() }),
        { headers }
      )
      if (!response.ok) {
        throw new Error(`Failed to list deployments: ${response.statusText}`)
      }
      const data = await response.json()
      return data.deployments
    },

    /**
     * Get a specific deployment
     */
    async getDeployment(deploymentId: string): Promise<Deployment> {
      const response = await fetch(buildUrl(`/v13/deployments/${deploymentId}`), { headers })
      if (!response.ok) {
        throw new Error(`Failed to get deployment: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Get the latest deployment for a project
     */
    async getLatestDeployment(projectId: string): Promise<Deployment | null> {
      const deployments = await this.listDeployments(projectId, 1)
      return deployments[0] || null
    },

    /**
     * Get deployment build logs
     */
    async getDeploymentLogs(deploymentId: string): Promise<DeploymentLog[]> {
      const response = await fetch(
        buildUrl(`/v2/deployments/${deploymentId}/events`),
        { headers }
      )
      if (!response.ok) {
        throw new Error(`Failed to get deployment logs: ${response.statusText}`)
      }
      const events = await response.json()
      return events
        .filter((e: { type: string }) => e.type === 'stdout' || e.type === 'stderr')
        .map((e: { type: string; text: string; created: number }) => ({
          type: e.type,
          text: e.text,
          created: e.created,
        }))
    },

    /**
     * Cancel a deployment
     */
    async cancelDeployment(deploymentId: string): Promise<void> {
      const response = await fetch(buildUrl(`/v12/deployments/${deploymentId}/cancel`), {
        method: 'PATCH',
        headers,
      })
      if (!response.ok) {
        throw new Error(`Failed to cancel deployment: ${response.statusText}`)
      }
    },

    /**
     * Redeploy (trigger a new deployment)
     */
    async redeploy(deploymentId: string): Promise<Deployment> {
      const response = await fetch(buildUrl('/v13/deployments'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deploymentId,
          target: 'production',
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to redeploy: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Get project domains
     */
    async getProjectDomains(projectId: string): Promise<Array<{ name: string; verified: boolean }>> {
      const response = await fetch(buildUrl(`/v9/projects/${projectId}/domains`), { headers })
      if (!response.ok) {
        throw new Error(`Failed to get domains: ${response.statusText}`)
      }
      const data = await response.json()
      return data.domains.map((d: { name: string; verified: boolean }) => ({
        name: d.name,
        verified: d.verified,
      }))
    },

    /**
     * Link a GitHub repository to a project
     */
    async linkGitHubRepo(
      projectId: string,
      repo: string,
      repoId: number
    ): Promise<void> {
      const response = await fetch(buildUrl(`/v9/projects/${projectId}/link`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'github',
          repo,
          repoId,
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to link GitHub repo: ${response.statusText}`)
      }
    },
  }
}

/**
 * Helper to format deployment status for display
 */
export function formatDeploymentStatus(state: Deployment['state']): {
  label: string
  color: string
} {
  switch (state) {
    case 'QUEUED':
      return { label: 'En cola', color: 'text-yellow-500' }
    case 'BUILDING':
      return { label: 'Construyendo', color: 'text-blue-500' }
    case 'READY':
      return { label: 'Listo', color: 'text-green-500' }
    case 'ERROR':
      return { label: 'Error', color: 'text-red-500' }
    case 'CANCELED':
      return { label: 'Cancelado', color: 'text-gray-500' }
    default:
      return { label: 'Desconocido', color: 'text-gray-500' }
  }
}

/**
 * Get deployment URL from deployment object
 */
export function getDeploymentUrl(deployment: Deployment): string {
  return `https://${deployment.url}`
}