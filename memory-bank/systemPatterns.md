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
    -   **GROQ API (groq-whisper-large-v3-turbo)**:
        -   Used for highly accurate speech-to-text transcription of practice recordings (via `/api/transcribe`).
    -   **OpenAI (gpt-4o-mini)**:
        -   Used for presentation content generation (via `/api/generate-presentation`).
        -   Used for comprehensive analysis of GROQ-generated transcriptions in presentation practice (via `/api/analyze`).
        -   Used for generating textual responses/questions in the interactive Q&A practice mode (via `/api/interactive-chat`).
    -   **GROQ API (PlayAI TTS - e.g., Fritz-PlayAI voice)**:
        -   Used for text-to-speech synthesis of AI responses in the interactive Q&A practice mode (via `/api/interactive-chat`, which calls `services/groq-service.ts`).
    -   **Firecrawl**: For web scraping when summarizing URLs for presentation content (via `/api/generate-presentation` in "summary" mode, potentially leveraged by OpenAI's web_search_tool).

**Interaction Flow for Transcription and Analysis (Standard Practice Mode):**
1.  **Transcription (`/api/transcribe`)**:
    -   User completes a practice recording in the frontend (`app/practice/page.tsx`).
    -   Audio data is sent to the `/api/transcribe` Next.js API route.
    -   The `/api/transcribe/route.ts` calls the GROQ API (groq-whisper-large-v3-turbo) to get the transcription.
    -   The transcription is returned to the client.
2.  **Analysis (`/api/analyze`)**:
    -   The client, having received the transcription from `/api/transcribe`, calls a service function (e.g., in `services/practice-service.ts` or a renamed `services/analysis-service.ts`), passing the GROQ transcription, original audio duration, and slide contents.
    -   This service function POSTs the data to the `/api/analyze` Next.js API route.
    -   The `/api/analyze/route.ts` then sends the transcription and slide content to OpenAI (gpt-4o-mini) for a comprehensive analysis (clarity, pace insights, filler words, feedback generation).
    -   The analysis results from OpenAI are returned to the client.

**Interaction Flow for Interactive Q&A Practice Mode:**
1.  **AI Initiates Question (New Slide)**:
    -   Frontend (`app/practice/interactive/page.tsx` - *to be created*) sends current slide content to `/api/interactive-chat`.
    -   Backend (`/api/interactive-chat/route.ts`):
        -   Calls `services/openai-service.ts#generateChatResponseOpenAI` to generate an initial question based on slide content.
        -   Calls `services/groq-service.ts#synthesizeSpeechGroq` to convert the AI's question text to speech (Fritz-PlayAI voice).
    -   Backend returns AI's question (text and base64 audio) to the client.
    -   Client plays audio and displays text.
2.  **User Responds (Voice or Text)**:
    -   **Voice**: User speaks. Audio recorded by client, sent to `/api/transcribe` (GROQ Whisper). Transcription returned to client.
    -   **Text**: User types response.
3.  **AI Follow-up**:
    -   Client sends user's transcribed/typed response + slide content + conversation history to `/api/interactive-chat`.
    -   Backend (`/api/interactive-chat/route.ts`):
        -   Calls `services/openai-service.ts#generateChatResponseOpenAI` for a follow-up response.
        -   Calls `services/groq-service.ts#synthesizeSpeechGroq` for TTS.
    -   Backend returns AI's follow-up (text and base64 audio) to the client.
    -   Client plays audio and displays text. Loop to User Responds.

## Key Technical Decisions

1.  **Next.js 14 with App Router**.
2.  **TypeScript**.
3.  **Supabase**: BaaS.
    -   **RLS Strategy**: `anon` role access for hackathon.
    -   **`exec_sql` Function**: For schema management.
4.  **shadcn/ui & Tailwind CSS**.
5.  **Specialized AI Service Strategy**:
    -   Utilizing best-in-class AI services for specific tasks:
        -   **GROQ (groq-whisper-large-v3-turbo)** for high-fidelity speech-to-text transcription.
        -   **OpenAI (gpt-4o-mini)** for versatile content generation, in-depth analysis of transcribed text, and conversational AI for interactive Q&A.
        -   **GROQ (PlayAI TTS)** for text-to-speech synthesis in interactive Q&A.
6.  **Serverless Functions (Next.js API Routes)**.
7.  **Integrated Full-Screen Mode**: Full-screen slide viewing is implemented as a toggle within existing practice pages (`app/practice/page.tsx`) rather than a separate route, for a more seamless UX.

## Design Patterns in Use

-   **Component-Based Architecture** (React).
-   **Serverless Pattern** (Next.js API Routes).
-   **Repository Pattern (Conceptual)**: `services/` directory.
-   **Provider Pattern (React Context)**.
-   **Utility-First CSS (Tailwind CSS)**.
-   **Conditional Rendering/Styling**: Used extensively for features like the full-screen slide mode, adapting UI elements based on application state.

## Component Relationships

-   **`/app` (Pages/Routes)**: Orchestrate UI and data flow.
    -   `app/practice/page.tsx`: Handles standard practice mode UI, recording, analysis, and **full-screen slide toggling**.
-   **`/components` (UI Elements)**:
    -   `components/feedback-panel.tsx`: Displays analysis results.
    -   `components/slide-preview.tsx`: Displays individual slides. **Modified to accept an `isFullscreen` prop to adjust its rendering for full-screen display.**
-   **`/services` (Business Logic/API Interaction)**:
    -   `services/practice-service.ts`: Contains functions to interact with `/api/transcribe`, `/api/analyze`, and the new `/api/interactive-chat` (via `getInteractiveChatResponse`).
    -   `services/groq-service.ts`: Contains `transcribeAudio` (client-side caller for `/api/transcribe`) and `synthesizeSpeechGroq` (server-side, called by `/api/interactive-chat`).
    -   `services/openai-service.ts`: Contains `generateChatResponseOpenAI` (server-side, called by `/api/interactive-chat`).
-   **`/api/transcribe/route.ts`**: Backend logic for interacting with GROQ API for transcription.
-   **`/api/analyze/route.ts`**: Backend logic for sending transcriptions to OpenAI for comprehensive analysis and feedback generation.
-   **`/api/interactive-chat/route.ts`**: New backend logic to orchestrate OpenAI text generation and Groq TTS for interactive Q&A.

## Critical Implementation Paths

1.  **AI Content Generation Workflow**.
2.  **Practice Mode & Feedback Loop**:
    -   Client (`app/practice/page.tsx`) captures audio.
    -   Audio sent to `/api/transcribe` which uses GROQ for transcription.
    -   Client receives GROQ transcription.
    -   Client sends GROQ transcription, duration, and slide content to `/api/analyze`.
    -   Backend (`/api/analyze/route.ts`) sends this data to OpenAI (gpt-4o-mini) for comprehensive analysis and feedback.
    -   Results displayed in `components/feedback-panel.tsx`.
    -   **Full-screen slide display toggle within this flow.**
3.  **Interactive Q&A Practice Mode Workflow**:
    -   Client (`app/practice/interactive/page.tsx`) initiates interaction.
    -   `/api/interactive-chat` orchestrates OpenAI LLM for text and Groq TTS for speech.
    -   Client handles audio recording, transcription via `/api/transcribe`, and displays conversation.
4.  **Data Persistence & Retrieval** (Supabase CRUD, RLS).

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
