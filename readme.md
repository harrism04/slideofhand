# POP Presentation Pro

**Tagline:** An innovative web app to create, practice, and improve presentations with a distinctive pop art style and AI-powered feedback.

<!-- Add a link to your live demo if available -->
[Link to Live Demo - To be added]

<!-- Add a compelling screenshot of your application -->
<!-- ![POP Presentation Pro Screenshot](path/to/your/screenshot.png) -->
*Screenshot coming soon!*

## Core Features

POP Presentation Pro empowers you to become a more confident and effective presenter by offering:

*   🎨 **AI-Powered Presentation Creation**:
    *   Generate entire slide decks from just a topic.
    *   Expand your bullet points into rich content.
    *   Format existing text into a structured presentation.
    *   Summarize long articles or web URLs (via Firecrawl) into concise slides.
    *   Edit and refine slides with a user-friendly editor, including image integration (via URL).
*   🎤 **Interactive Practice Mode**:
    *   Navigate through your slides as you rehearse.
    *   Record your presentation audio (up to 2 minutes).
    *   Get an AI-powered transcription of your speech.
    *   Keep track of time with an integrated timer.
*   📊 **AI Performance Analysis**:
    *   Receive actionable feedback on your delivery, powered by OpenAI gpt-4o-mini's analysis of your transcribed speech.
    *   Insights cover areas like speaking pace, clarity, filler word usage, and overall delivery effectiveness.
*   📈 **History & Analytics**:
    *   Review all past practice sessions.
    *   Track your improvement over time with key performance metrics.
    *   Visualize trends with performance charts.

## Technology Stack

This project is built with a modern and robust technology stack:

*   **Frontend**:
    *   Framework: Next.js 14 (App Router)
    *   Language: TypeScript
    *   UI: React, shadcn/ui
    *   Styling: Tailwind CSS
    *   Charts: Recharts
*   **Backend**:
    *   API: Next.js API Routes (Serverless Functions)
    *   Database & Storage: Supabase (PostgreSQL, Supabase Storage)
    *   Authentication: Supabase Auth (currently configured for `anon` role access for hackathon purposes)
*   **AI Integration**:
    *   GROQ API (groq-whisper-large-v3-turbo): For highly accurate speech-to-text transcription.
    *   OpenAI API (gpt-4o-mini): For presentation content generation, and comprehensive analysis of transcribed recordings (e.g., clarity, pacing insights, filler word patterns) and generating actionable feedback.
    *   Firecrawl: For web content summarization (URL to presentation).
*   **Package Manager**: pnpm

## Getting Started

To run POP Presentation Pro locally:

1.  **Prerequisites**:
    *   Node.js (v18 or later recommended)
    *   pnpm (`npm install -g pnpm`)
2.  **Clone the repository**:
    ```bash
    git clone [your-repo-url]
    cd pop-art-presentation-tool
    ```
3.  **Set up Environment Variables**:
    Create a `.env.local` file in the root of the project and add the following (replace with your actual keys):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENAI_API_KEY=your_openai_api_key
    GROQ_API_KEY=your_groq_api_key
    FIRECRAWL_API_KEY=your_firecrawl_api_key
    ```
4.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
5.  **Run the Development Server**:
    ```bash
    pnpm dev
    ```
6.  Open your browser and navigate to `http://localhost:3000`.

## Hackathon Highlights

*   **Problem We Solved**: We tackle the often fragmented and stressful process of presentation preparation. Many struggle with creating engaging content, practicing effectively, and getting actionable feedback.
*   **Our Solution & Innovation**: Slides On Hand offers a unified, AI-driven platform with a unique and engaging pop art visual style. It streamlines the workflow from idea to delivery, integrating content generation, practice tools, and detailed performance analysis.
*   **Key Technical Aspects & Achievements**:
    *   Built on Next.js 14, leveraging serverless functions for a scalable backend.
    *   Implemented a hybrid AI analysis strategy: OpenAI gpt-4o-mini for nuanced clarity assessment and local logic for metrics like pace and filler words.
    *   Successfully integrated Supabase for database, authentication, and storage, including resolving complex SSR authentication challenges to ensure seamless user session management between client and server.
    *   Developed an engaging, step-by-step "Thinking" progress UI for asynchronous AI operations, enhancing user experience.

## Current Status & Limitations

*   **Functional**: Core features including AI-powered presentation generation, practice mode with audio recording and transcription, and performance analysis (pace, clarity, filler words) are implemented and working. PDF import is functional.
*   **PPTX Import Disabled**: Due to unresolved build issues with a third-party dependency, PPTX import is temporarily disabled.
*   **Hackathon Auth**: Full user authentication is implemented via Supabase.
*   **Missing Favicon**: A project favicon is yet to be added.

## Future Ideas

We're excited about the potential to expand POP Presentation Pro with features like:

*   Full user accounts with private presentation storage.
*   Export presentations to PowerPoint/PDF.
*   AI-generated images for slides.
*   Team collaboration features.

## Team

Built with Slides On Hand by Harris, Saurabh and Bill Gates!
