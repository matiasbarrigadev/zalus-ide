import { Tool } from '../bedrock'

/**
 * Agent tools for interacting with GitHub and Vercel
 */
export const agentTools: Tool[] = [
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
      'Crea o modifica múltiples archivos en el repositorio con un solo commit. Ideal para cambios que afectan varios archivos.',
    input_schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Array de archivos a crear/modificar',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Ruta del archivo',
              },
              content: {
                type: 'string',
                description: 'Contenido completo del archivo',
              },
            },
            required: ['path', 'content'],
          },
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
          items: { type: 'string' },
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
      'Busca texto o código en el repositorio. Útil para encontrar implementaciones o referencias.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto o patrón a buscar',
        },
        file_pattern: {
          type: 'string',
          description: 'Patrón de archivos a buscar (ej: *.tsx, *.ts)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_deployment_status',
    description:
      'Obtiene el estado del deployment más reciente en Vercel. Incluye URL del preview.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_deployment_logs',
    description:
      'Obtiene los logs de build de un deployment específico de Vercel. Útil para debuggear errores de build.',
    input_schema: {
      type: 'object',
      properties: {
        deployment_id: {
          type: 'string',
          description: 'ID del deployment (opcional, usa el más reciente si no se especifica)',
        },
      },
    },
  },
  {
    name: 'create_branch',
    description:
      'Crea una nueva rama en el repositorio basada en la rama principal.',
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
      'Crea un Pull Request desde una rama feature hacia la rama principal.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título del Pull Request',
        },
        body: {
          type: 'string',
          description: 'Descripción del Pull Request',
        },
        head_branch: {
          type: 'string',
          description: 'Rama con los cambios',
        },
        base_branch: {
          type: 'string',
          description: 'Rama destino (por defecto: main)',
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
  | 'get_deployment_logs'
  | 'create_branch'
  | 'create_pull_request'