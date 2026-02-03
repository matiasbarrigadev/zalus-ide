'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Folder, 
  ExternalLink, 
  Github, 
  Zap,
  LogOut,
  Settings,
  Search
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface Repository {
  name: string
  fullName: string
  description: string | null
  private: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.accessToken) {
      fetchRepositories()
    }
  }, [session])

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/github/repos')
      if (response.ok) {
        const data = await response.json()
        setRepositories(data.repositories)
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Zalus IDE</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium hidden sm:block">
                {session?.user?.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Mis Proyectos</h1>
            <p className="text-muted-foreground">
              Selecciona un repositorio para comenzar a desarrollar con el agente IA
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proyecto
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar repositorios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Repository Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-6 animate-pulse"
              >
                <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-full mb-4" />
                <div className="h-8 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/ide/${encodeURIComponent(repo.fullName)}`}
                className="group rounded-lg border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold truncate">{repo.name}</h3>
                  </div>
                  {repo.private && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      Privado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                  {repo.description || 'Sin descripción'}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <Github className="w-4 h-4" />
                  <span className="truncate">{repo.fullName}</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron repositorios</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Intenta con otro término de búsqueda'
                : 'Crea un nuevo proyecto para comenzar'}
            </p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Proyecto
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}