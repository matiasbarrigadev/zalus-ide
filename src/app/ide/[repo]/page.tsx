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
  PanelLeft,
  Wrench,
  Brain,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useIDEStore } from '@/store/ide-store'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div> }
)

interface ToolExecution {
  call: { tool: string; params: Record<string, string> }
  result: { tool: string; success: boolean; result?: unknown; error?: string }
}

interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: ToolExecution[]
  iterations?: number
}

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
    previewUrl,
    setPreviewUrl,
    sidebarOpen,
    toggleSidebar,
  } = useIDEStore()

  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isAgentWorking, setIsAgentWorking] = useState(false)
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set())
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const chatEndRef = useRef<HTMLDivElement>(null)

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
          setFileTree(data.files)
        } else {
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

  const [streamingText, setStreamingText] = useState('')
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolExecution[]>([])
  const [currentIteration, setCurrentIteration] = useState(0)

  const sendMessage = async () => {
    if (!inputMessage.trim() || isAgentWorking) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setStreamingText('')
    setStreamingToolCalls([])
    setCurrentIteration(0)
    
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
    }
    setMessages(prev => [...prev, userMsg])
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

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResponse = ''
      const toolCalls: ToolExecution[] = []
      let iterations = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            const dataLine = lines[i + 1]
            
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6))
                
                switch (eventType) {
                  case 'text':
                    setStreamingText(prev => prev + data.text)
                    break
                  case 'iteration':
                    setCurrentIteration(data.iteration)
                    iterations = data.iteration
                    break
                  case 'tool_result':
                    setStreamingToolCalls(prev => [...prev, { call: data.call, result: data.result }])
                    toolCalls.push({ call: data.call, result: data.result })
                    break
                  case 'done':
                    finalResponse = data.response
                    break
                  case 'error':
                    finalResponse = `Error: ${data.error}`
                    break
                }
              } catch {
                // Skip invalid JSON
              }
              i++ // Skip the data line we just processed
            }
          }
        }
      }

      // Add final message
      const assistantMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: finalResponse || 'Completado',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        iterations: iterations > 0 ? iterations : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingText('')
      setStreamingToolCalls([])
      loadFileTree()
      loadDeploymentStatus()
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Error de conexión. Por favor verifica tu conexión e intenta de nuevo.',
      }
      setMessages(prev => [...prev, errorMsg])
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

  const toggleReasoning = (id: string) => {
    setExpandedReasoning(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTools = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderFileTree = (nodes: typeof fileTree, depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === 'dir') handleFolderClick(node)
            else loadFileContent(node.path)
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
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </a>
          )}
          <button onClick={() => { loadFileTree(); loadDeploymentStatus(); }}
            className="p-1 text-muted-foreground hover:text-foreground" title="Actualizar">
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
          <div className="flex-1 overflow-auto p-2">{renderFileTree(fileTree)}</div>
        </div>

        {!sidebarOpen && (
          <button onClick={toggleSidebar}
            className="w-10 flex-shrink-0 border-r border-border flex items-center justify-center hover:bg-muted">
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
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on' }}
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
        <div className="w-[420px] flex-shrink-0 border-l border-border flex flex-col">
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
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`flex-1 space-y-2 ${message.role === 'user' ? '' : ''}`}>
                    {/* Main content */}
                    <div className={`rounded-lg p-3 text-sm ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Tool Calls Collapsible */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTools(message.id)}
                          className="w-full flex items-center gap-2 p-2 text-sm bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Wrench className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">Tools ({message.toolCalls.length})</span>
                          {expandedTools.has(message.id) ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                        {expandedTools.has(message.id) && (
                          <div className="p-2 space-y-2 text-xs">
                            {message.toolCalls.map((tc, i) => (
                              <div key={i} className="border border-border rounded p-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  {tc.result.success ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  )}
                                  <span className="font-medium">{tc.call.tool}</span>
                                </div>
                                <div className="text-muted-foreground overflow-hidden">
                                  <div className="font-medium text-foreground">Call:</div>
                                  <pre className="bg-background p-1 rounded overflow-x-auto max-h-20 text-[10px] whitespace-pre-wrap break-all">{JSON.stringify(tc.call.params, null, 2)}</pre>
                                </div>
                                <div className="text-muted-foreground overflow-hidden">
                                  <div className="font-medium text-foreground">Result:</div>
                                  <pre className="bg-background p-1 rounded overflow-x-auto max-h-32 text-[10px] whitespace-pre-wrap break-all">
                                    {tc.result.error || JSON.stringify(tc.result.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reasoning Collapsible */}
                    {message.reasoning && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleReasoning(message.id)}
                          className="w-full flex items-center gap-2 p-2 text-sm bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Brain className="w-4 h-4 text-purple-400" />
                          <span className="font-medium">Reasoning</span>
                          {message.iterations && <span className="text-xs text-muted-foreground">({message.iterations} iterations)</span>}
                          {expandedReasoning.has(message.id) ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                        {expandedReasoning.has(message.id) && (
                          <div className="p-2 text-xs">
                            <pre className="whitespace-pre-wrap text-muted-foreground max-h-64 overflow-auto">
                              {message.reasoning}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isAgentWorking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-2">
                  {/* Iteration indicator */}
                  {currentIteration > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Iteración {currentIteration}/3</span>
                    </div>
                  )}

                  {/* Streaming text */}
                  {streamingText && (
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p className="whitespace-pre-wrap">{streamingText}</p>
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    </div>
                  )}

                  {/* Streaming tool calls */}
                  {streamingToolCalls.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 p-2 text-sm bg-muted/50">
                        <Wrench className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">Tools ({streamingToolCalls.length})</span>
                        <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                      </div>
                      <div className="p-2 space-y-2 text-xs max-h-48 overflow-auto">
                        {streamingToolCalls.map((tc, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {tc.result.success ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className="font-medium">{tc.call.tool}</span>
                            <span className="text-muted-foreground truncate">
                              {JSON.stringify(tc.call.params).substring(0, 30)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading dots if no content yet */}
                  {!streamingText && streamingToolCalls.length === 0 && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe lo que quieres crear..."
              className="w-full min-h-[80px] max-h-[200px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isAgentWorking}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isAgentWorking}
              className="w-full mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10"
            >
              {isAgentWorking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
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
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', py: 'python', yml: 'yaml', yaml: 'yaml',
  }
  return languageMap[ext || ''] || 'plaintext'
}