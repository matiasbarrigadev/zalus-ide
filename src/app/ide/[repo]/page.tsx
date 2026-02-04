'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { 
  Send, 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown,
  ExternalLink,
  Github,
  Zap,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Bot,
  User,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { useIDEStore } from '@/store/ide-store'
import dynamic from 'next/dynamic'

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div> }
)

export default function IDEPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const repo = decodeURIComponent(params.repo as string)
  const [owner, repoName] = repo.split('/')

  const {
    fileTree,
    setFileTree,
    updateNodeChildren,
    setNodeLoading,
    expandedPaths,
    toggleExpanded,
    selectedFile,
    setSelectedFile,
    isLoadingFile,
    setIsLoadingFile,
    messages,
    addMessage,
    isAgentWorking,
    setIsAgentWorking,
    previewUrl,
    setPreviewUrl,
    sidebarOpen,
    toggleSidebar,
  } = useIDEStore()

  const [inputMessage, setInputMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.accessToken) {
      loadFileTree()
      loadDeploymentStatus()
    }
  }, [session, repo])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadFileTree = async (path: string = '') => {
    try {
      const response = await fetch(`/api/github/files?owner=${owner}&repo=${repoName}&path=${path}`)
      if (response.ok) {
        const data = await response.json()
        if (path === '') {
          // Root level - set the entire tree
          setFileTree(data.files)
        } else {
          // Subdirectory - update the children of the node
          updateNodeChildren(path, data.files)
        }
      }
    } catch (error) {
      console.error('Error loading file tree:', error)
    }
  }

  const handleFolderClick = async (node: { path: string; type: string; children?: unknown[] }) => {
    const isExpanded = expandedPaths.has(node.path)
    
    if (!isExpanded) {
      // Expanding - load children if not already loaded
      if (!node.children || node.children.length === 0) {
        setNodeLoading(node.path, true)
        await loadFileTree(node.path)
      }
    }
    
    toggleExpanded(node.path)
  }

  const loadDeploymentStatus = async () => {
    try {
      const response = await fetch(`/api/vercel/status?owner=${owner}&repo=${repoName}`)
      if (response.ok) {
        const data = await response.json()
        if (data.deployment?.url) {
          setPreviewUrl(`https://${data.deployment.url}`)
        }
      }
    } catch (error) {
      console.error('Error loading deployment status:', error)
    }
  }

  const loadFileContent = async (path: string) => {
    setIsLoadingFile(true)
    try {
      const response = await fetch(`/api/github/file?owner=${owner}&repo=${repoName}&path=${path}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedFile({ path, content: data.content })
      }
    } catch (error) {
      console.error('Error loading file:', error)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isAgentWorking) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    addMessage({ role: 'user', content: userMessage })
    setIsAgentWorking(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          owner,
          repo: repoName,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        addMessage({ role: 'assistant', content: data.response })
        // Refresh file tree and deployment status after agent action
        loadFileTree()
        loadDeploymentStatus()
      } else {
        addMessage({ 
          role: 'assistant', 
          content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.' 
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({ 
        role: 'assistant', 
        content: 'Error de conexión. Por favor verifica tu conexión e intenta de nuevo.' 
      })
    } finally {
      setIsAgentWorking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderFileTree = (nodes: typeof fileTree, depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === 'dir') {
              handleFolderClick(node)
            } else {
              loadFileContent(node.path)
            }
          }}
          className={`w-full flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded transition-colors ${
            selectedFile?.path === node.path ? 'bg-muted' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {node.type === 'dir' ? (
            <>
              {node.isLoading ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : expandedPaths.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Folder className="w-4 h-4 text-blue-400" />
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="w-4 h-4 text-muted-foreground" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === 'dir' && expandedPaths.has(node.path) && node.children && node.children.length > 0 && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-semibold">{repoName}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Github className="w-4 h-4" />
          <span>{repo}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </a>
          )}
          <button
            onClick={() => { loadFileTree(); loadDeploymentStatus(); }}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-border flex flex-col overflow-hidden transition-all`}>
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Archivos</span>
            <button onClick={toggleSidebar} className="p-1 text-muted-foreground hover:text-foreground">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Toggle sidebar button when closed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-10 flex-shrink-0 border-r border-border flex items-center justify-center hover:bg-muted"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div className="h-10 border-b border-border flex items-center px-4 gap-2 flex-shrink-0">
                <File className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{selectedFile.path}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                {isLoadingFile ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <MonacoEditor
                    height="100%"
                    language={getLanguageFromPath(selectedFile.path)}
                    value={selectedFile.content}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un archivo para ver su contenido</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="w-96 flex-shrink-0 border-l border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-medium">Agente IA</span>
            {isAgentWorking && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">¡Hola! Soy tu agente de desarrollo.</p>
                <p className="text-sm">Describe qué quieres crear y yo lo construiré.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 message-appear ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`flex-1 rounded-lg p-3 text-sm ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isAgentWorking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/50 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-foreground/50 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe lo que quieres crear..."
                className="flex-1 min-h-[80px] max-h-[200px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isAgentWorking}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isAgentWorking}
              className="w-full mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10"
            >
              {isAgentWorking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isAgentWorking ? 'Trabajando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    py: 'python',
    yml: 'yaml',
    yaml: 'yaml',
  }
  return languageMap[ext || ''] || 'plaintext'
}