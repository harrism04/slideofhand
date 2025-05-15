# POP Presentation Pro - Project Brief

## Project Overview

POP Presentation Pro is an innovative web application designed to help users create, practice, and improve their presentations. With its distinctive pop art visual style, the application combines modern AI technologies with interactive features to provide a comprehensive presentation preparation tool. The platform enables users to create slide decks, practice their delivery, receive AI-powered feedback, and track their improvement over time.

## Purpose & Goals

### Primary Purpose
To provide a comprehensive tool that addresses the entire presentation creation and practice workflow, helping users become more confident and effective presenters.

### Key Goals
- Simplify the process of creating engaging presentation content
- Provide a platform for practicing presentation delivery
- Offer actionable feedback on presentation performance
- Track improvement over time with detailed analytics
- Create an enjoyable, visually distinctive user experience

## Features & Functionality

### 1. Presentation Creation
- **Slide Editor**: Create and edit presentation slides with a user-friendly interface
- **AI Content Generation**: Generate presentation content using AI with four different modes:
  - Topic-based generation (complete presentation from just a topic)
  - Bullet point expansion (develop full content from key points)
  - Content formatting (structure existing content into slides)
  - Text/URL summarization (create presentations from large texts or websites)
- **Rich Text Formatting**: Support for bullet points, numbered lists, and basic text formatting
- **Image Integration**: Add images to slides via URLs

### 2. Practice Mode
- **Slide Navigation**: Browse through presentation slides during practice
- **Audio Recording**: Record presentation delivery for analysis
- **Timer**: Track presentation duration with automatic cutoff at 2 minutes
- **Transcription**: Convert speech to text using AI for analysis
- **Real-time Feedback**: Receive immediate analysis after practice sessions

### 3. Performance Analysis
- **Speech Analysis**: AI-powered evaluation of:
  - Speaking pace (words per minute)
  - Clarity and pronunciation - dependant if the sentence(s) makes sense since STT models typically may transcribe differently if enunciation isn't good
  - Filler word usage
  - Overall engagement and energy
- **Improvement Suggestions**: Actionable tips based on performance
- **Audio Playback**: Review recorded practice sessions

### 4. History & Analytics
- **Session History**: View all past practice sessions
- **Performance Metrics**: Track key metrics over time
  - Overall scores
  - Speaking pace
  - Clarity scores
  - Filler word usage
- **Performance Charts**: Visualize improvement trends
- **Detailed Breakdowns**: Analyze specific aspects of performance

### 5. User Experience
- **Pop Art Design**: Distinctive visual style with bold colors and playful elements
- **Responsive Interface**: Works across desktop and mobile devices
- **Intuitive Navigation**: Clear user flows and accessible controls
- **Interactive Elements**: Engaging UI components with immediate feedback

## Technical Specifications

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Components**: Custom components built with shadcn/ui
- **Styling**: Tailwind CSS with custom theming
- **State Management**: React hooks and context
- **Charts**: Recharts for data visualization

### Backend
- **API Routes**: Next.js API routes for serverless functions
- **Database**: Supabase (PostgreSQL)
  - **Access Control**: Row Level Security (RLS) policies are implemented, currently configured for the `anon` role for broad access in the hackathon context.
  - **Schema Management**: Requires the `exec_sql` PostgreSQL function for dynamic schema adjustments (e.g., adding columns).
- **Authentication**: Supabase Auth (currently using `anon` role for unauthenticated access; full user authentication is planned/optional)
- **Storage**: Supabase Storage for audio recordings

### AI Integration
- **OpenAI**: gpt-4o-mini for presentation content generation (has web_search_tool)
- **Local Analysis**: Speech analysis (pace, clarity, filler words, engagement) is performed locally within the `/api/analyze` route based on the transcription. (Note: Groq integration for this was planned but is not currently implemented).
- **Speech Processing**: Browser Web Speech API and custom audio processing for transcription.
- **Firecrawl**: For web scraping when summarizing URLs for presentation content.

### Data Models
- **Presentations**: Store presentation metadata
  \`\`\`sql
  id UUID PRIMARY KEY
  title TEXT
  created_at TIMESTAMP
  updated_at TIMESTAMP
  user_id UUID
  deleted_at TIMESTAMP -- Used for soft deletes
  \`\`\`

- **slides**: Stores slide content
  \`\`\`sql
  id UUID PRIMARY KEY
  presentation_id UUID REFERENCES presentations(id)
  title TEXT
  content TEXT
  image_url TEXT
  order INTEGER
  created_at TIMESTAMP
  updated_at TIMESTAMP
  \`\`\`

- **practice_sessions**: Stores practice recordings and analysis
  \`\`\`sql
  id UUID PRIMARY KEY
  presentation_id UUID REFERENCES presentations(id)
  duration_seconds INTEGER
  audio_url TEXT
  transcription JSONB
  analysis JSONB
  created_at TIMESTAMP
  user_id UUID
  \`\`\`

## Architecture

### Application Structure
- **`/app`**: Next.js App Router pages and layouts
  - `/create`: Presentation creation and editing
  - `/practice`: Practice mode and recording
  - `/history`: Performance history and analytics
  - `/presentations`: Presentation management
- **`/components`**: Reusable UI components
- **`/services`**: API integration and business logic (e.g., `presentation-service.ts`, `openai-service.ts`)
- **`/utils`**: Helper functions and utilities (e.g., `supabase-client.ts`, `init-database.ts`)
- **`/types`**: TypeScript type definitions

### Database Schema
- **presentations**: Stores presentation metadata (includes `deleted_at` for soft deletes)
- **slides**: Stores slide content
- **practice_sessions**: Stores practice recordings and analysis
- **`exec_sql` function**: A required PostgreSQL function in Supabase for schema management tasks performed by the application.

## User Flow

1. **Homepage**: User is introduced to the application and its features
2. **Presentations Page**: User creates a new presentation or selects an existing one
3. **Create Page**: User edits slides or generates content with AI
4. **Practice Selection**: User chooses which presentation to practice
5. **Practice Mode**: User rehearses presentation and receives feedback
6. **History Page**: User reviews past sessions and tracks improvement

## Design Philosophy

The application follows a distinctive pop art aesthetic with:
- Bold, contrasting colors (red, blue, yellow, green, purple)
- Strong black borders and shadow effects
- Playful typography with the Bangers font for headings
- Card-based UI components with rounded corners
- Interactive elements with visual feedback

This design approach creates a fun, engaging experience that stands out from traditional presentation tools while maintaining usability and accessibility.

## Integrations

### Supabase
- Database for storing all application data.
- Storage for audio recordings.
- Row Level Security (RLS) is used, currently configured for `anon` role access.
- Requires `exec_sql` function for application-driven schema modifications.
- Client-side access uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### OpenAI
- gpt-4o-mini model for generating presentation content.
- API key (`OPENAI_API_KEY`) managed via environment variables.

### Groq
- (Planned/Not Currently Implemented) groq-whisper-large-v3-turbo model was planned for analyzing presentation delivery. Currently, analysis is local.
- API key (`GROQ_API_KEY`) managed via environment variables for potential future use.

### Firecrawl
- To be used for searching the web when user selects "URL summarization (create presentations from websites).

## Deployment

The application is designed to be deployed on Vercel, with:
- Serverless functions for API routes
- Edge caching for improved performance
- Environment variables for API keys and configuration
- Integration with Vercel Blob for additional storage options

## Future Enhancements

### Potential Features
- **User Authentication**: Personal accounts with private presentations
- **Collaboration**: Shared presentations and feedback
- **Export Options**: PowerPoint/PDF export functionality
- **Advanced Analytics**: More detailed performance metrics
- **Custom Templates**: Pre-designed presentation templates
- **Image Generation**: AI-generated images for slides
- **Video Recording**: Record video for more comprehensive feedback
- **Mobile App**: Native mobile experience
- **Favicon**: Add a project favicon.

## Maintenance & Updates

The project uses modern, maintainable technologies that support:
- Regular updates to AI models for improved performance
- Scalable database design for growing user needs
- Component-based architecture for easier feature additions
- Comprehensive error handling for reliability

## Conclusion

POP Presentation Pro represents a modern approach to presentation preparation, combining the latest in AI technology with an engaging user experience. By addressing the entire workflow from content creation to practice and improvement, the application provides a comprehensive solution for anyone looking to enhance their presentation skills.
