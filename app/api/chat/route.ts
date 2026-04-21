import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '../../../lib/config';
import { createProvidersFromConfig } from '../../../lib/providers/factory';
import { createChatService } from '../../../lib/services/chat';
import { ValidationService } from '../../../lib/services/validation';
import { ChatRequest, ChatOptions } from '../../../lib/types';

// Initialize providers and services (singleton pattern)
let providers: any = null;
let chatService: any = null;
let validationService: ValidationService | null = null;

function initializeServices() {
  if (!providers) {
    const config = configManager.getConfig();
    providers = createProvidersFromConfig(config);
    chatService = createChatService(providers.rag, providers.llm);
    validationService = ValidationService.createDefault();
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Initialize services
    initializeServices();

    // Parse request body
    const body = await request.json();

    // Validate request
    const { message, conversationId, sessionId, userId, options, stream } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create chat request
    const chatRequest: ChatRequest = {
      message: message.trim(),
      conversationId,
      sessionId: sessionId || request.headers.get('x-session-id') || undefined,
      userId: userId || request.headers.get('x-user-id') || undefined,
      options: {
        stream: stream === true,
        temperature: options?.temperature,
        includeSources: options?.includeSources !== false,
        maxTokens: options?.maxTokens,
        contextWindow: options?.contextWindow,
      } as ChatOptions,
    };

    // Handle streaming response
    if (chatRequest.options?.stream) {
      return handleStreamingResponse(chatRequest, request);
    }

    // Handle non-streaming response
    return handleNonStreamingResponse(chatRequest, request);

  } catch (error: any) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

async function handleStreamingResponse(chatRequest: ChatRequest, request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial response with metadata
        const initialData = {
          type: 'metadata',
          timestamp: new Date().toISOString(),
          conversationId: chatRequest.conversationId,
          model: providers?.llm.getModelName() || 'unknown',
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

        // Process message with streaming
        let fullResponse = '';

        for await (const chunk of await chatService.processMessageStream(chatRequest)) {
          fullResponse += chunk;

          const chunkData = {
            type: 'chunk',
            content: chunk,
            timestamp: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
        }

        // After streaming completes, send sources and final metadata
        const sourcesData = {
          type: 'sources',
          message: 'Response complete',
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sourcesData)}\n\n`));

        // Send done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));

      } catch (error: any) {
        console.error('Streaming error:', error);

        const errorData = {
          type: 'error',
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    },
  });
}

async function handleNonStreamingResponse(chatRequest: ChatRequest, request: NextRequest) {
  // Process message
  const response = await chatService.processMessage(chatRequest);

  // Validate response if validation service is available
  if (validationService) {
    try {
      const validation = await validationService.validateChatResponse(
        {
          message: response.message,
          sources: response.sources,
          suggestedFollowUps: response.suggestedFollowUps,
        },
        [], // TODO: Pass conversation context for validation
        {
          checkUrlStatus: false, // Don't check URLs in real-time for performance
          requireChesapeakeContext: true,
          maxSuggestions: 3,
          trustKnowledgeBase: true,
        }
      );

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Response validation warnings:', validation.warnings);
      }

      // Use validated suggestions if available
      if (validation.suggestions.length > 0) {
        response.suggestedFollowUps = validation.suggestions;
      }
    } catch (validationError) {
      console.warn('Response validation failed:', validationError);
      // Continue with original response
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      model: providers?.llm.getModelName() || 'unknown',
    },
    {
      status: 200,
      headers: corsHeaders
    }
  );
}

// Helper function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
export async function GET() {
  initializeServices();

  try {
    const config = configManager.getConfig();
    const isHealthy = providers && chatService;

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: config.deployment.environment,
        model: providers?.llm.getModelName() || 'unknown',
        vectorStoreDocuments: providers ? await providers.vectorStore.getDocumentCount() : 0,
      },
      { status: isHealthy ? 200 : 503, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503, headers: corsHeaders }
    );
  }
}
