// app/api/interactive-chat/route.ts
import { NextResponse } from 'next/server';
import { generateChatResponseOpenAI } from '../../../services/openai-service';
import { synthesizeSpeechGroq } from '../../../services/groq-service';
import { OpenAI } from 'openai'; // For ChatCompletionMessageParam type

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slideTitle, // Added slideTitle for better context
      slideContent,
      userResponse, // This will be undefined for the initial question
      conversationHistory = [], // Array of { role: 'user' | 'assistant', content: string }
    }: {
      slideTitle?: string;
      slideContent: string;
      userResponse?: string;
      conversationHistory?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    } = body;

    if (!slideContent) {
      return NextResponse.json({ error: 'slideContent is required' }, { status: 400 });
    }

    let systemPrompt: string;
    let currentTurnUserPrompt: string;

    if (userResponse) {
      // This is a follow-up turn
      systemPrompt = `You are an interactive presentation practice assistant. The user is practicing a presentation.
The current slide is titled "${slideTitle || 'Untitled Slide'}" and its content is:
---
${slideContent}
---
The user has just said: "${userResponse}".
Your role is to respond naturally, ask clarifying questions, or provide brief, relevant follow-up points based on their response and the slide content. Keep your responses concise and conversational. If the user's response seems complete for the current point, you can gently guide them to the next point or ask if they have questions.`;
      currentTurnUserPrompt = userResponse; // The user's latest utterance is the main prompt for this turn
    } else {
      // This is the initial turn for a new slide, AI asks the first question
      systemPrompt = `You are an interactive presentation practice assistant. The user is practicing a presentation and has just arrived at a new slide.
The current slide is titled "${slideTitle || 'Untitled Slide'}" and its content is:
---
${slideContent}
---
Your role is to initiate the conversation by asking a relevant, open-ended question about the slide's content to simulate an audience member or sales prospect. Make the question engaging and directly related to the provided slide material. Keep your question concise.`;
      currentTurnUserPrompt = "Based on the slide content, please ask me an initial question."; // A placeholder to trigger the system prompt's instruction
    }

    // 1. Generate AI's textual response using OpenAI
    const aiTextResponse = await generateChatResponseOpenAI(
      systemPrompt,
      currentTurnUserPrompt, // For follow-ups, this is userResponse. For initial, it's a trigger.
      conversationHistory
    );

    // 2. Convert AI's text response to speech using Groq PlayAI TTS
    const audioBlob = await synthesizeSpeechGroq(aiTextResponse);

    // Convert Blob to ArrayBuffer, then to base64 string to send in JSON
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

    // Add AI's response to conversation history for next turn
    const updatedConversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...conversationHistory,
    ];
    if (userResponse) { // Only add user response if it exists (not for initial AI question)
        updatedConversationHistory.push({ role: 'user', content: userResponse });
    }
    updatedConversationHistory.push({ role: 'assistant', content: aiTextResponse });


    return NextResponse.json({
      aiTextResponse: aiTextResponse,
      aiAudioBase64: audioBase64, // Send audio as base64
      contentType: audioBlob.type, // e.g., 'audio/wav'
      updatedConversationHistory: updatedConversationHistory,
    });

  } catch (error: any) {
    console.error('Error in /api/interactive-chat:', error);
    return NextResponse.json({ error: error.message || 'Failed to process interactive chat request' }, { status: 500 });
  }
}
