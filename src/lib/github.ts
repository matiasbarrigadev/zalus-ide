import { Octokit } from '@octokit/rest'

/**
 * Create an authenticated Octokit client
 */
export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  })
}

export interface FileContent {
  path: string
  content: string
}

export interface RepoFile {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  sha: string
}

/**
 * List files in a repository directory
 */
export async function listRepositoryFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ''
): Promise<RepoFile[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    if (Array.isArray(data)) {
      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'dir',
        size: item.size,
        sha: item.sha,
      }))
    }

    // Single file
    return [
      {
        name: data.name,
        path: data.path,
        type: data.type as 'file' | 'dir',
        size: data.size,
        sha: data.sha,
      },
    ]
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 404) {
      return []
    }
    throw error
  }
}

/**
 * Read a file from the repository
 */
export async function readFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  })

  if (Array.isArray(data)) {
    throw new Error(`Path ${path} is a directory, not a file`)
  }

  if (data.type !== 'file') {
    throw new Error(`Path ${path} is not a file`)
  }

  // Content is base64 encoded
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return content
}

/**
 * Write multiple files in a single commit
 */
export async function writeFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: FileContent[],
  commitMessage: string,
  branch: string = 'main'
): Promise<{ sha: string; url: string }> {
  // Get the current commit SHA for the branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })
  const currentCommitSha = refData.object.sha

  // Get the current tree
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  })
  const currentTreeSha = commitData.tree.sha

  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      })
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: data.sha,
      }
    })
  )

  // Create a new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentTreeSha,
    tree: blobs,
  })

  // Create a new commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [currentCommitSha],
  })

  // Update the reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  })

  return {
    sha: newCommit.sha,
    url: newCommit.html_url,
  }
}

/**
 * Delete files from the repository
 */
export async function deleteFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  paths: string[],
  commitMessage: string,
  branch: string = 'main'
): Promise<{ sha: string }> {
  // Get the current commit SHA
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })
  const currentCommitSha = refData.object.sha

  // Get the current tree
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  })

  // Get the full tree recursively
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitData.tree.sha,
    recursive: 'true',
  })

  // Filter out the files to delete
  const newTreeItems = treeData.tree
    .filter((item) => !paths.includes(item.path || ''))
    .map((item) => ({
      path: item.path!,
      mode: item.mode as '100644' | '100755' | '040000' | '160000' | '120000',
      type: item.type as 'blob' | 'tree' | 'commit',
      sha: item.sha!,
    }))

  // Create a new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: newTreeItems,
  })

  // Create a new commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [currentCommitSha],
  })

  // Update the reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  })

  return { sha: newCommit.sha }
}

/**
 * Search for code in the repository
 */
export async function searchInRepository(
  octokit: Octokit,
  owner: string,
  repo: string,
  query: string,
  filePattern?: string
): Promise<Array<{ path: string; matches: string[] }>> {
  let searchQuery = `${query} repo:${owner}/${repo}`
  if (filePattern) {
    searchQuery += ` filename:${filePattern}`
  }

  const { data } = await octokit.search.code({
    q: searchQuery,
    per_page: 20,
  })

  return data.items.map((item) => ({
    path: item.path,
    matches: item.text_matches?.map((m) => m.fragment) || [],
  }))
}

/**
 * Create a new branch
 */
export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string = 'main'
): Promise<{ ref: string }> {
  // Get the SHA of the base branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  })

  // Create the new branch
  const { data } = await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha,
  })

  return { ref: data.ref }
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  headBranch: string,
  baseBranch: string = 'main',
  body?: string
): Promise<{ number: number; url: string }> {
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head: headBranch,
    base: baseBranch,
    body,
  })

  return {
    number: data.number,
    url: data.html_url,
  }
}

/**
 * Get repository information
 */
export async function getRepository(
  octokit: Octokit,
  owner: string,
  repo: string
) {
  const { data } = await octokit.repos.get({
    owner,
    repo,
  })

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    defaultBranch: data.default_branch,
    private: data.private,
    htmlUrl: data.html_url,
  }
}

/**
 * Create a new repository
 */
export async function createRepository(
  octokit: Octokit,
  name: string,
  options?: {
    description?: string
    private?: boolean
    autoInit?: boolean
  }
): Promise<{ name: string; fullName: string; htmlUrl: string }> {
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description: options?.description,
    private: options?.private ?? false,
    auto_init: options?.autoInit ?? true,
  })

  return {
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
  }
}

/**
 * List user's repositories
 */
export async function listUserRepositories(
  octokit: Octokit,
  options?: {
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    per_page?: number
  }
): Promise<Array<{ name: string; fullName: string; description: string | null; private: boolean }>> {
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: options?.sort || 'updated',
    per_page: options?.per_page || 30,
  })

  return data.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
  }))
}