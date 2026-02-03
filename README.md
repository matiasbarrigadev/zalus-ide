# 🚀 Zalus IDE

**IDE cloud-native con agente de codificación IA integrado**

Desarrolla aplicaciones web describiendo lo que necesitas. El agente IA escribe código directamente en GitHub y Vercel despliega automáticamente.

![Zalus IDE](https://img.shields.io/badge/Status-En%20Desarrollo-yellow)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Claude](https://img.shields.io/badge/Claude-Opus%204.5-orange)

## ✨ Características

- 🤖 **Agente IA Integrado**: Claude Opus 4.5 actúa como tu ingeniero de software
- 📁 **GitHub Nativo**: El código vive en tu repositorio, cada cambio es un commit
- ☁️ **Deploy Automático**: Vercel despliega automáticamente cada cambio
- 👀 **Preview en Tiempo Real**: Ve tu aplicación mientras el agente la construye
- 🔒 **100% Cloud**: No necesitas instalar nada localmente

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 14 + Tailwind + Monaco Editor                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Vercel)                           │
│  API Routes + NextAuth + Agent Executor                         │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   AWS Bedrock    │  │    GitHub API    │  │   Vercel API     │
│  Claude Opus 4.5 │  │  (Code Storage)  │  │  (Deployments)   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## 🚦 Requisitos Previos

1. **Node.js 18+** 
2. **Cuenta de GitHub** con OAuth App configurada
3. **Cuenta de AWS** con acceso a Bedrock y Claude Opus 4.5
4. **Cuenta de Vercel** con token de API

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/zalus-ide.git
cd zalus-ide
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
# AWS Bedrock (Claude Opus 4.5)
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1

# GitHub OAuth App
# Crear en: https://github.com/settings/developers
GITHUB_CLIENT_ID=tu_client_id
GITHUB_CLIENT_SECRET=tu_client_secret

# Vercel API
# Crear en: https://vercel.com/account/tokens
VERCEL_TOKEN=tu_vercel_token
VERCEL_TEAM_ID=tu_team_id  # Opcional

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera_un_string_aleatorio_de_32_caracteres
```

### 4. Configurar GitHub OAuth App

1. Ve a [GitHub Developer Settings](https://github.com/settings/developers)
2. Crea una nueva OAuth App:
   - **Application name**: Zalus IDE
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Copia Client ID y Client Secret a tu `.env.local`

### 5. Configurar AWS Bedrock

1. Asegúrate de tener acceso a Claude Opus 4.5 en tu cuenta de AWS
2. El modelo debe estar habilitado en la región configurada
3. Las credenciales IAM necesitan permisos para `bedrock:InvokeModel`

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Uso

### 1. Iniciar Sesión
Haz clic en "Iniciar con GitHub" para autenticarte.

### 2. Seleccionar Proyecto
Desde el dashboard, selecciona un repositorio existente o crea uno nuevo.

### 3. Usar el Agente
En el IDE, describe lo que quieres crear en el chat:

```
"Crea un landing page con un hero section, 
formulario de contacto y footer"
```

### 4. Ver Resultados
El agente:
1. Analiza tu petición
2. Crea/modifica archivos
3. Hace commit a GitHub
4. Vercel despliega automáticamente
5. Ves el preview en tiempo real

## 📁 Estructura del Proyecto

```
zalus-ide/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── agent/          # Endpoint del agente IA
│   │   │   ├── auth/           # NextAuth.js
│   │   │   ├── github/         # Proxy GitHub API
│   │   │   └── vercel/         # Proxy Vercel API
│   │   ├── auth/               # Páginas de autenticación
│   │   ├── dashboard/          # Dashboard de proyectos
│   │   ├── ide/                # Vista del IDE
│   │   └── page.tsx            # Landing page
│   ├── components/             # Componentes React
│   ├── lib/                    # Librerías y utilidades
│   │   ├── agent/              # Lógica del agente
│   │   │   ├── executor.ts     # Ejecutor de herramientas
│   │   │   ├── prompts.ts      # System prompts
│   │   │   └── tools.ts        # Definición de herramientas
│   │   ├── bedrock.ts          # Cliente AWS Bedrock
│   │   ├── github.ts           # Cliente GitHub
│   │   └── vercel.ts           # Cliente Vercel
│   ├── store/                  # Estado global (Zustand)
│   └── types/                  # TypeScript types
├── .env.example                # Variables de entorno ejemplo
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🔧 Herramientas del Agente

El agente tiene acceso a estas herramientas:

| Herramienta | Descripción |
|-------------|-------------|
| `list_repository_files` | Lista archivos del repositorio |
| `read_file` | Lee contenido de un archivo |
| `write_files` | Crea/modifica archivos con commit |
| `delete_files` | Elimina archivos |
| `search_in_repository` | Busca código en el repo |
| `get_deployment_status` | Estado del deploy en Vercel |
| `get_deployment_logs` | Logs de build para debug |
| `create_branch` | Crea una rama |
| `create_pull_request` | Crea un PR |

## 🚀 Deploy a Producción

### Deploy en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel Dashboard
3. Actualiza `NEXTAUTH_URL` a tu dominio de producción
4. Actualiza la callback URL en tu GitHub OAuth App

```bash
vercel --prod
```

## 🛠️ Desarrollo

### Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Iniciar build de producción
npm run lint     # Ejecutar ESLint
```

### Agregar Nuevas Herramientas al Agente

1. Define la herramienta en `src/lib/agent/tools.ts`
2. Implementa la ejecución en `src/lib/agent/executor.ts`
3. Actualiza el system prompt si es necesario en `src/lib/agent/prompts.ts`

## 📝 Notas Técnicas

- **Modelo**: Claude Opus 4.5 (`anthropic.claude-opus-4-5-20251101-v1:0`)
- **Tool Use**: El agente usa function calling nativo de Claude
- **Commits Atómicos**: El agente agrupa cambios relacionados en un solo commit
- **Preview Deployments**: Cada commit genera un preview en Vercel

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

Hecho con ❤️ usando Next.js, Claude AI, y mucho ☕