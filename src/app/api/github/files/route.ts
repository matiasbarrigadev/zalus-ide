import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createGitHubClient, listRepositoryFiles } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const path = searchParams.get('path') || ''

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const octokit = createGitHubClient(session.accessToken)
    const files = await listRepositoryFiles(octokit, owner, repo, path)

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}