'use client'

import { signIn } from 'next-auth/react'
import { Github, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('github', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Error signing in:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Bienvenido a Zalus IDE</h1>
            <p className="text-muted-foreground">
              Inicia sesión con tu cuenta de GitHub para comenzar a desarrollar con IA
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Github className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Conectando...' : 'Continuar con GitHub'}
            </button>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-3">Permisos requeridos:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Acceso a tu información de perfil público</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Leer y escribir en repositorios que selecciones</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>Crear y gestionar repositorios en tu nombre</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Al continuar, aceptas nuestros{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}