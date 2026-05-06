import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const dynamic = 'force-dynamic';

// Initialize OpenAI client pointed at OpenRouter
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "https://alghazali.vercel.app",
    "X-Title": "Al Ghazali Assistant",
  }
});

// Generate a random ID
function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 14)}`;
}

export async function GET() {
  return NextResponse.json({ status: 'active', message: 'ChatKit Bridge is online' });
}

export async function POST(req: NextRequest) {
  console.log('--- ChatKit Request Received ---');
  try {
    const body = await req.json();
    const { type } = body;
    console.log('Request Type:', type);
    console.log('Request Body:', JSON.stringify(body).substring(0, 200));

    // Handle thread listing (Initialization - VITAL FOR BLANK SCREEN FIX)
    if (type === 'threads.list') {
      console.log('Listing threads (Returning empty list)');
      return NextResponse.json({
        data: [],
        has_more: false,
        first_id: null,
        last_id: null,
        object: 'list'
      });
    }

    // Handle thread creation
    if (type === 'thread.create') {
      const threadId = genId('thread');
      console.log('Creating thread:', threadId);
      return NextResponse.json({
        id: threadId,
        object: 'thread',
        created_at: Math.floor(Date.now() / 1000),
        metadata: {}
      });
    }

    // Handle thread retrieval  
    if (type === 'thread.retrieve') {
      console.log('Retrieving thread:', body.thread_id);
      return NextResponse.json({
        id: body.thread_id || genId('thread'),
        object: 'thread',
        created_at: Math.floor(Date.now() / 1000),
        metadata: {}
      });
    }

    // Handle turn creation (user sent a message)
    if (type === 'turn.create') {
      const userMessage = body.messages?.[body.messages.length - 1]?.content || body.message || 'Hello';
      const threadId = body.thread_id || genId('thread');
      const messageId = genId('msg');
      
      console.log('User message content:', userMessage);

      // Call OpenRouter with streaming
      const stream = await openRouter.chat.completions.create({
        model: 'mistralai/mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `You are Al Ghazali High School's official AI assistant. 
            Answer in a professional manner. 
            Keep answers concise.`
          },
          { role: 'user', content: userMessage }
        ],
        stream: true,
      });

      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            // 1. Send thread.message.item.created event
            const createdEvent = {
              event: 'thread.message.item.created',
              data: {
                id: messageId,
                object: 'thread.message',
                role: 'assistant',
                content: [],
                thread_id: threadId,
                created_at: Math.floor(Date.now() / 1000),
              }
            };
            controller.enqueue(encoder.encode(`event: ${createdEvent.event}\ndata: ${JSON.stringify(createdEvent.data)}\n\n`));

            // 2. Stream content deltas
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                const deltaEvent = {
                  event: 'thread.message.delta',
                  data: {
                    id: messageId,
                    delta: {
                      content: [{ type: 'output_text', text: content }]
                    }
                  }
                };
                controller.enqueue(encoder.encode(`event: ${deltaEvent.event}\ndata: ${JSON.stringify(deltaEvent.data)}\n\n`));
              }
            }

            // 3. Send completion event
            const doneEvent = {
              event: 'thread.message.item.completed',
              data: {
                id: messageId,
                object: 'thread.message',
                role: 'assistant',
                thread_id: threadId,
              }
            };
            controller.enqueue(encoder.encode(`event: ${doneEvent.event}\ndata: ${JSON.stringify(doneEvent.data)}\n\n`));
            
            controller.enqueue(encoder.encode(`event: done\ndata: [DONE]\n\n`));
            controller.close();
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            controller.error(streamError);
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Default: return empty success for unknown request types
    console.warn('Unknown request type:', type);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('ChatKit Bridge Error Path:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
