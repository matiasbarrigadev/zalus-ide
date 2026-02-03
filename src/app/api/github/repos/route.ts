import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createGitHubClient, listUserRepositories } from '@/lib/github'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const octokit = createGitHubClient(session.accessToken)
    const repositories = await listUserRepositories(octokit, { per_page: 50 })

    return NextResponse.json({ repositories })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}