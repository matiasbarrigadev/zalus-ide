import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createGitHubClient, readFile } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const path = searchParams.get('path')

    if (!owner || !repo || !path) {
      return NextResponse.json({ error: 'Missing owner, repo, or path' }, { status: 400 })
    }

    const octokit = createGitHubClient(session.accessToken)
    const content = await readFile(octokit, owner, repo, path)

    return NextResponse.json({ content, path })
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}