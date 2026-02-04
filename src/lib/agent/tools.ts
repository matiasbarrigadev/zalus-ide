/**
 * Agent tools definition for reference
 * These are kept for documentation but are no longer used directly
 * with the AI SDK implementation
 */

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const agentTools: ToolDefinition[] = [
  {
    name: 'list_repository_files',
    description:
      'Lista archivos y directorios en el repositorio de GitHub. Útil para explorar la estructura del proyecto.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del directorio a listar (por defecto: raíz del repositorio)',
        },
      },
    },
  },
  {
    name: 'read_file',
    description:
      'Lee el contenido completo de un archivo del repositorio de GitHub.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del archivo a leer',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_files',
    description:
      'Crea o modifica múltiples archivos en el repositorio con un solo commit.',
    input_schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Array de archivos a crear/modificar',
        },
        commit_message: {
          type: 'string',
          description: 'Mensaje descriptivo del commit',
        },
        branch: {
          type: 'string',
          description: 'Rama destino (por defecto: main)',
        },
      },
      required: ['files', 'commit_message'],
    },
  },
  {
    name: 'delete_files',
    description: 'Elimina uno o más archivos del repositorio con un commit.',
    input_schema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          description: 'Array de rutas de archivos a eliminar',
        },
        commit_message: {
          type: 'string',
          description: 'Mensaje descriptivo del commit',
        },
      },
      required: ['paths', 'commit_message'],
    },
  },
  {
    name: 'search_in_repository',
    description:
      'Busca texto o código en el repositorio.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto o patrón a buscar',
        },
        file_pattern: {
          type: 'string',
          description: 'Patrón de archivos a buscar',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_deployment_status',
    description:
      'Obtiene el estado del deployment más reciente en Vercel.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_branch',
    description:
      'Crea una nueva rama en el repositorio.',
    input_schema: {
      type: 'object',
      properties: {
        branch_name: {
          type: 'string',
          description: 'Nombre de la nueva rama',
        },
        base_branch: {
          type: 'string',
          description: 'Rama base (por defecto: main)',
        },
      },
      required: ['branch_name'],
    },
  },
  {
    name: 'create_pull_request',
    description:
      'Crea un Pull Request desde una rama feature.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título del Pull Request',
        },
        head_branch: {
          type: 'string',
          description: 'Rama con los cambios',
        },
        base_branch: {
          type: 'string',
          description: 'Rama destino',
        },
      },
      required: ['title', 'head_branch'],
    },
  },
]

export type ToolName =
  | 'list_repository_files'
  | 'read_file'
  | 'write_files'
  | 'delete_files'
  | 'search_in_repository'
  | 'get_deployment_status'
  | 'create_branch'
  | 'create_pull_request'