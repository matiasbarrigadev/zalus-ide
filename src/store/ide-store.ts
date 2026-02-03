import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolCalls?: Array<{
    name: string
    status: 'pending' | 'success' | 'error'
  }>
}

export interface Project {
  id: string
  name: string
  owner: string
  repo: string
  vercelProjectId?: string
  deploymentUrl?: string
  deploymentStatus?: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR'
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
  isLoading?: boolean
}

interface IDEState {
  // Current project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

  // File tree
  fileTree: FileNode[]
  setFileTree: (tree: FileNode[]) => void
  expandedPaths: Set<string>
  toggleExpanded: (path: string) => void

  // Selected file (for viewing)
  selectedFile: { path: string; content: string } | null
  setSelectedFile: (file: { path: string; content: string } | null) => void
  isLoadingFile: boolean
  setIsLoadingFile: (loading: boolean) => void

  // Chat/Agent
  messages: Message[]
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  isAgentWorking: boolean
  setIsAgentWorking: (working: boolean) => void

  // Preview
  previewUrl: string | null
  setPreviewUrl: (url: string | null) => void

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
  activePanel: 'files' | 'chat'
  setActivePanel: (panel: 'files' | 'chat') => void
}

export const useIDEStore = create<IDEState>((set, get) => ({
  // Current project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // File tree
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  expandedPaths: new Set<string>(),
  toggleExpanded: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedPaths)
      if (newExpanded.has(path)) {
        newExpanded.delete(path)
      } else {
        newExpanded.add(path)
      }
      return { expandedPaths: newExpanded }
    }),

  // Selected file
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
  isLoadingFile: false,
  setIsLoadingFile: (loading) => set({ isLoadingFile: loading }),

  // Chat/Agent
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  isAgentWorking: false,
  setIsAgentWorking: (working) => set({ isAgentWorking: working }),

  // Preview
  previewUrl: null,
  setPreviewUrl: (url) => set({ previewUrl: url }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  activePanel: 'chat',
  setActivePanel: (panel) => set({ activePanel: panel }),
}))