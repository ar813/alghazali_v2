import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // In a real OpenAI setup, we would call openai.chat.sessions.create()
    // Since we are using an OpenRouter Bridge, we return a mock session
    // and we will configure the frontend to talk to our custom /api/chatkit/chat route.
    
    return NextResponse.json({
      client_secret: 'mock_session_secret_for_local_bridge',
      session_id: 'local_session_' + Date.now(),
    });
  } catch (error) {
    console.error('Session Error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
