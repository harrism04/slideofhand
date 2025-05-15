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
    -   OpenAI API (gpt-4o-mini with web_search_tool)
    -   Local Analysis (planned: Groq API - groq-whisper-large-v3-turbo for speech analysis, currently local)
    -   Firecrawl (for URL summarization - planned)
-   **Speech Processing**: Browser Web Speech API for transcription, custom local logic for analysis.

## Development Setup

-   **Node.js & pnpm**: `pnpm` is the package manager, as indicated by `pnpm-lock.yaml`.
-   **IDE**: Visual Studio Code.
-   **Version Control**: Git.
-   **Environment Variables**: A `.env` file (or `.env.local`) is used. Key variables include:
    -   `NEXT_PUBLIC_SUPABASE_URL`: URL for the Supabase project.
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous key for client-side Supabase access.
    -   `OPENAI_API_KEY`: For server-side OpenAI API calls.
    -   `GROQ_API_KEY`: For potential future server-side Groq API calls (analysis currently local).
    -   `FIRECRAWL_API_KEY` (when implemented).
-   **Database Initialization**:
    -   SQL schema is defined (e.g., `database-schema.sql` or managed via `utils/init-database.ts`).
    -   The `utils/init-database.ts` script attempts to create tables and columns if they don't exist, using the `exec_sql` RPC call to Supabase.
-   **Commands**:
    -   `pnpm install`
    -   `pnpm dev`
    -   `pnpm build`

## Technical Constraints

-   **2-Minute Recording Limit**: For practice mode audio.
-   **Browser Web Speech API**: Cross-browser compatibility.
-   **AI API Rate Limits/Costs**: For OpenAI (Groq planned).
-   **Serverless Function Limits**: For Next.js API routes.
-   **Supabase RLS**: Data access is strictly controlled by RLS policies. Incorrect or missing policies will lead to empty query results or permission errors.

## Dependencies

-   **Core**: `next`, `react`, `react-dom`, `typescript`
-   **UI & Styling**: `tailwindcss`, `shadcn-ui` (and its dependencies like `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`), `recharts`
-   **Supabase**: `@supabase/supabase-js`
-   **AI SDKs/Clients**: `openai` (or direct `fetch`), direct `fetch` for Firecrawl (Groq planned, analysis currently local).
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
