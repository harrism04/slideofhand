# Tech Context

## Technologies Used

-   **Framework**: Next.js 14 (with App Router)
-   **Language**: TypeScript
-   **UI Libraries/Components**:
    -   React
    -   shadcn/ui
    -   Recharts (for charts)
-   **Styling**: Tailwind CSS
-   **State Management**: React Hooks, React Context API
-   **Backend**:
    -   Next.js API Routes (Serverless Functions)
    -   Supabase (PostgreSQL database, Storage, Auth)
        -   Client-side interaction via `@supabase/supabase-js`.
        -   RLS policies configured for `anon` role.
        -   Requires `exec_sql` PostgreSQL function for schema management.
-   **AI Services**:
    -   **OpenAI API (gpt-4o-mini)**:
        -   Used for presentation content generation (including URL summarization via web_search_tool).
        -   Used for comprehensive analysis of transcribed recordings for feedback (standard practice mode).
        -   Used for generating textual responses/questions for the interactive Q&A practice mode.
    -   **GROQ API**:
        -   **`groq-whisper-large-v3-turbo`**: Used for highly accurate speech-to-text transcription.
        -   **`playai-tts` (e.g., Fritz-PlayAI voice)**: Used for text-to-speech synthesis for the AI's voice in interactive Q&A mode.
    -   **Firecrawl**: Used for web content scraping for URL summarization (can be leveraged by OpenAI or used directly).

## Development Setup

-   **Node.js & pnpm**: `pnpm` is the package manager, as indicated by `pnpm-lock.yaml`.
-   **IDE**: Visual Studio Code.
-   **Version Control**: Git.
-   **Environment Variables**: A `.env` file (or `.env.local`) is used. Key variables include:
    -   `NEXT_PUBLIC_SUPABASE_URL`: URL for the Supabase project.
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous key for client-side Supabase access.
    -   `OPENAI_API_KEY`: For server-side OpenAI API calls.
    -   `GROQ_API_KEY`: For server-side GROQ API calls for transcription.
    -   `FIRECRAWL_API_KEY` (when implemented/if used directly).
-   **Database Initialization**:
    -   SQL schema is defined (e.g., `database-schema.sql` or managed via `utils/init-database.ts`).
    -   The `utils/init-database.ts` script attempts to create tables and columns if they don't exist, using the `exec_sql` RPC call to Supabase.
-   **Commands**:
    -   `pnpm install`
    -   `pnpm dev`
    -   `pnpm build`

## Technical Constraints

-   **2-Minute Recording Limit**: For practice mode audio.
-   **AI API Rate Limits/Costs**: For OpenAI and GROQ.
-   **Serverless Function Limits**: For Next.js API routes.
-   **Supabase RLS**: Data access is strictly controlled by RLS policies. Incorrect or missing policies will lead to empty query results or permission errors.

## Dependencies

-   **Core**: `next`, `react`, `react-dom`, `typescript`
-   **UI & Styling**: `tailwindcss`, `shadcn-ui` (and its dependencies like `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`), `recharts`
-   **Supabase**: `@supabase/supabase-js`
-   **AI SDKs/Clients**: `openai` (or direct `fetch` for OpenAI and GROQ APIs), direct `fetch` for Firecrawl.
-   **Development**: `@types/*`, `eslint`, `prettier`, `postcss`, `autoprefixer`.
-   Refer to `package.json` and `pnpm-lock.yaml` for the definitive list.

## Tool Usage Patterns

-   **VS Code**: Primary IDE.
-   **Git**: Version control.
-   **pnpm**: Package management.
-   **ESLint/Prettier**: Code linting and formatting.
-   **Supabase Dashboard**:
    -   Database management (viewing tables, data).
    -   SQL Editor (for running schema changes, defining functions like `exec_sql`, managing RLS policies).
    -   Managing Storage buckets and policies.
    -   Checking authentication settings and user roles.
-   **Vercel**: Deployment platform.
-   **AI Provider Dashboards (OpenAI; Groq if/when integrated)**: API key management and usage monitoring.
-   **Terminal**: Running dev scripts, Git.
-   **Browser Developer Tools**: Debugging frontend (console logs, network requests, component inspection).
    -   *Used extensively in the last session to diagnose missing presentation data and identify a 404 error (clarified as favicon-related).*
