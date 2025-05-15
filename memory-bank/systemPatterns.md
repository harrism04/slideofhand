# System Patterns

## System Architecture

The application follows a modern web architecture leveraging the Next.js framework.

-   **Frontend**:
    -   Built with Next.js 14 (App Router) and React.
    -   User Interface (UI) components are custom-built using `shadcn/ui` and styled with Tailwind CSS.
    -   State management primarily relies on React hooks and Context API.
    -   Data visualization (charts) uses Recharts.
-   **Backend**:
    -   Next.js API Routes provide serverless functions for backend logic.
    -   Supabase (PostgreSQL) serves as the primary database.
        -   **Access Control**: Row Level Security (RLS) is enabled. For the hackathon context, policies are configured to grant full access (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to the `anon` role for `presentations`, `slides`, and `practice_sessions` tables.
        -   **Schema Management**: Relies on a custom PostgreSQL function `exec_sql(sql_string TEXT)` for application-driven schema modifications.
    -   Supabase Storage is used for storing audio recordings.
-   **AI Integration**:
    -   **OpenAI (gpt-4o-mini)**:
        - Used for presentation content generation (via `/api/generate-presentation`).
        - Used for **Clarity analysis** in presentation practice (via `/api/analyze`). The LLM compares slide content to transcribed speech to provide a score and feedback.
    -   **Local Analysis**:
        - Speech analysis for **Pace** (words per minute) and **Filler Words** is performed locally within the `/api/analyze` route based on the transcription.
    -   **Browser Web Speech API / Custom Audio Processing**: For capturing audio and performing transcription (via `/api/transcribe`).
    -   **Firecrawl**: For web scraping when summarizing URLs for presentation content (via `/api/generate-presentation` in "summary" mode).

**Interaction Flow for Analysis (`/api/analyze`):**
1.  User completes a practice recording in the frontend (`app/practice/page.tsx`).
2.  The frontend calls `analyzeTranscription` in `services/groq-service.ts`, passing the transcription, duration, and slide contents.
3.  `analyzeTranscription` POSTs this data to the `/api/analyze` Next.js API route.
4.  The `/api/analyze/route.ts` (`performBasicAnalysis` function):
    -   Calculates Pace and Filler Words locally.
    -   Calls `getClarityFromOpenAI` which constructs a prompt with slide content and transcription, then calls the OpenAI API (gpt-4o-mini) to get a clarity score and feedback.
    -   Combines these results (Pace, LLM-based Clarity, Filler Words) into a final analysis object.
    -   Returns the analysis to the client.

## Key Technical Decisions

1.  **Next.js 14 with App Router**.
2.  **TypeScript**.
3.  **Supabase**: BaaS.
    -   **RLS Strategy**: `anon` role access for hackathon.
    -   **`exec_sql` Function**: For schema management.
4.  **shadcn/ui & Tailwind CSS**.
5.  **Hybrid AI Analysis Strategy**:
    -   **LLM (OpenAI gpt-4o-mini)** for nuanced tasks like Clarity assessment.
    -   **Local, rule-based logic** for simpler metrics like Pace and Filler Words, ensuring speed and cost-effectiveness for these aspects.
6.  **Serverless Functions (Next.js API Routes)**.

## Design Patterns in Use

-   **Component-Based Architecture** (React).
-   **Serverless Pattern** (Next.js API Routes).
-   **Repository Pattern (Conceptual)**: `services/` directory.
-   **Provider Pattern (React Context)**.
-   **Utility-First CSS (Tailwind CSS)**.

## Component Relationships

-   **`/app` (Pages/Routes)**: Orchestrate UI and data flow.
    -   `app/practice/page.tsx`: Handles practice mode UI, recording, and calls `analyzeTranscription`.
-   **`/components` (UI Elements)**:
    -   `components/feedback-panel.tsx`: Displays analysis results (now excluding Engagement).
-   **`/services` (Business Logic/API Interaction)**:
    -   `services/groq-service.ts`: Contains `analyzeTranscription` which calls the `/api/analyze` endpoint.
-   **`/api/analyze/route.ts`**: Backend logic for calculating all performance metrics, including the LLM call for Clarity.

## Critical Implementation Paths

1.  **AI Content Generation Workflow**.
2.  **Practice Mode & Feedback Loop**:
    -   Client (`app/practice/page.tsx`) captures audio, sends for transcription.
    -   Client sends transcription, duration, and slide content to `/api/analyze` (via `services/groq-service.ts`).
    -   Backend (`/api/analyze/route.ts`) performs local analysis for Pace/Filler Words and calls OpenAI for Clarity.
    -   Results displayed in `components/feedback-panel.tsx`.
3.  **Data Persistence & Retrieval** (Supabase CRUD, RLS).

## Loading and Progress Indicators

-   **`ThinkingProgress` Component (`components/ui/thinking-progress.tsx`)**:
    -   **Purpose**: Provides a visually engaging, step-by-step progress indicator for long-running asynchronous operations, particularly those involving AI processing (e.g., presentation generation, practice analysis).
    -   **Design**:
        -   Displays a `Card`-based UI with a list of predefined steps.
        -   The active step is highlighted and its label can be animated with a typewriter effect (using `TypewriterText` component).
        -   Completed steps are marked (e.g., with a checkmark).
        -   Future steps can be shown with `Skeleton` placeholders.
        -   Includes an overall `Progress` bar.
        -   Styled to fit the project's energetic, pop-art-inspired aesthetic while maintaining clarity.
    -   **Mechanism**:
        -   Currently simulates progress by advancing through steps based on predefined `duration` properties for each step. This is because the backend APIs (e.g., `/api/generate`, `/api/analyze`) are single request/response and do not stream progress.
        -   The component is designed to be easily adaptable if backend streaming is implemented in the future.
    -   **Usage**: Implemented in `app/create/loading.tsx` and `app/practice/loading.tsx` to replace generic loading states.
-   **`TypewriterText` Component (`components/ui/typewriter-text.tsx`)**:
    -   **Purpose**: A reusable React component that displays text with a typewriter (character-by-character) animation.
    -   **Features**: Configurable speed, optional start delay, and an on-complete callback.
    -   **Usage**: Used within `ThinkingProgress` to animate the label of the currently active step.
