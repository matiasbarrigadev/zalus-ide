import Link from 'next/link'
import { Github, Zap, Cloud, Bot, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Zalus IDE</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Github className="w-4 h-4 mr-2" />
              Iniciar con GitHub
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Desarrolla con un{' '}
            <span className="text-primary bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Ingeniero IA
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            IDE cloud-native donde un agente de IA escribe código por ti. 
            Solo describe lo que necesitas y observa cómo tu aplicación cobra vida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-lg"
            >
              Comenzar Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 text-lg"
            >
              Ver Características
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">
            ¿Cómo funciona?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Agente IA Integrado</h3>
              <p className="text-muted-foreground">
                Claude Opus 4.5 actúa como tu ingeniero de software. 
                Describe tu idea y el agente escribe, modifica y mejora el código.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-violet-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">GitHub Nativo</h3>
              <p className="text-muted-foreground">
                Tu código vive directamente en GitHub. Cada cambio es un commit. 
                Historial completo, colaboración y control de versiones incluido.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Deploy Automático</h3>
              <p className="text-muted-foreground">
                Cada cambio despliega automáticamente en Vercel. 
                Ve tu aplicación en vivo en segundos, sin configuración.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">
            Flujo de Trabajo Simple
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {[
                {
                  step: '1',
                  title: 'Conecta tu GitHub',
                  description: 'Inicia sesión con tu cuenta de GitHub. Creamos o seleccionamos un repositorio para tu proyecto.',
                },
                {
                  step: '2',
                  title: 'Describe tu idea',
                  description: 'Escribe en lenguaje natural lo que quieres crear. "Crea un landing page con formulario de contacto".',
                },
                {
                  step: '3',
                  title: 'El agente construye',
                  description: 'El agente IA analiza, planifica y escribe el código. Hace commits directamente a tu repositorio.',
                },
                {
                  step: '4',
                  title: 'Ve el resultado',
                  description: 'Vercel despliega automáticamente. Ve tu app funcionando en vivo mientras iteras con el agente.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-32 text-center">
          <div className="rounded-2xl border border-border bg-card p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para desarrollar diferente?
            </h2>
            <p className="text-muted-foreground mb-8">
              Únete a la nueva era del desarrollo web. Sin setup, sin complicaciones.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-lg"
            >
              <Github className="w-5 h-5 mr-2" />
              Comenzar con GitHub
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Zalus IDE</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Zalus. Cloud-native development platform.
          </p>
        </div>
      </footer>
    </div>
  )
}