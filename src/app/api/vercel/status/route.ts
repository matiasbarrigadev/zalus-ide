import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createVercelClient } from '@/lib/vercel'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const vercelToken = process.env.VERCEL_TOKEN
    if (!vercelToken) {
      return NextResponse.json({ error: 'Vercel not configured' }, { status: 500 })
    }

    const vercel = createVercelClient({
      token: vercelToken,
      teamId: process.env.VERCEL_TEAM_ID,
    })

    // Find project linked to this repo
    const projects = await vercel.listProjects()
    const project = projects.find((p) => p.link?.repo === `${owner}/${repo}`)

    if (!project) {
      return NextResponse.json({ 
        project: null, 
        deployment: null,
        message: 'No Vercel project linked to this repository' 
      })
    }

    // Get latest deployment
    const deployment = await vercel.getLatestDeployment(project.id)

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
      },
      deployment: deployment ? {
        id: deployment.id,
        state: deployment.state,
        url: deployment.url,
        createdAt: deployment.createdAt,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching Vercel status:', error)
    return NextResponse.json({ error: 'Failed to fetch Vercel status' }, { status: 500 })
  }
}