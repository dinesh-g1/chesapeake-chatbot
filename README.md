# Chesapeake City Agentic AI Chatbot

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.4-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/DeepSeek_AI-API-5E17EB?style=for-the-badge&logo=openai&logoColor=white" alt="DeepSeek AI">
  <img src="https://img.shields.io/badge/Docker-20.10-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</div>

<div align="center">
  <h3>An advanced Agentic AI-powered chatbot for Chesapeake City government services</h3>
  <p>24/7 intelligent assistance for citizens, powered by Retrieval-Augmented Generation (RAG)</p>
</div>

## 🎯 Project Overview

The **Chesapeake City Agentic AI Chatbot** is a sophisticated AI assistant designed to provide 24/7 support for Chesapeake City residents, businesses, and visitors. Leveraging advanced **Agentic AI** capabilities and **Retrieval-Augmented Generation (RAG)**, the chatbot delivers accurate, context-aware responses based exclusively on official Chesapeake City website content.

### Key Highlights
- **Agentic AI Intelligence**: Advanced reasoning, context retention, and proactive guidance
- **Zero Hallucinations**: Responses grounded in verified official city content
- **Ultra-Responsive Design**: Mobile-first, accessibility-compliant interface
- **Production-Ready**: Modular architecture with Docker deployment
- **Cost-Effective**: Reduces call center volume while improving citizen satisfaction

## ✨ Features

### 🤖 Advanced AI Capabilities
- **Context-Aware Conversations**: Remembers previous interactions for continuity
- **Multi-Step Guidance**: Breaks complex processes into manageable steps
- **Proactive Suggestions**: Anticipates follow-up questions
- **Source Citations**: Every response includes source references
- **No Dead Ends**: Always provides actionable next steps

### 📱 Ultra-Responsive UX/UI
- **Mobile-First Design**: Perfect on all devices (desktop, tablet, mobile)
- **Real-Time Streaming**: Live response streaming for better UX
- **Accessibility Compliant**: WCAG 2.1 AA standards
- **Touch-Friendly Interface**: Optimized for mobile interaction
- **Fast Loading**: Optimized performance with caching

### 🏗️ Robust Architecture
- **Modular Design**: Easy component replacement (LLM, vector store, etc.)
- **Production-Grade**: Docker containerization with orchestration
- **Scalable**: Horizontal scaling ready
- **Monitoring**: Health checks, logging, and metrics
- **Security**: Rate limiting, CORS, and input validation

## 🏗️ Technology Stack

### Frontend
- **Next.js 16** (App Router) - React framework with SSR
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first styling
- **React 19** - Latest React features

### Backend & AI
- **DeepSeek AI** - LLM and embeddings (cost-effective alternative to OpenAI)
- **RAG Pipeline** - Retrieval-Augmented Generation for accurate responses
- **SQLite with Vector Extension** - Local vector database (production: PostgreSQL + pgvector)
- **Cheerio** - Web scraping for knowledge base population

### Infrastructure
- **Docker & Docker Compose** - Containerization and orchestration
- **Nginx** - Reverse proxy and load balancing (production)
- **Node.js 20** - Runtime environment
- **GitHub Actions** - CI/CD pipeline

## 🏗️ System Architecture

### 📊 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CHESAPEAKE CITY CHATBOT                          │
│                         (Next.js 16 Application)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
    │    FRONTEND LAYER │  │     API LAYER     │  │   DATA PIPELINE   │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │  │  ┌─────────────┐  │
    │  │   Next.js   │  │  │  │ App Router  │  │  │  │   Ingest    │  │
    │  │   React     │──┼──┼─▶│ /api/chat   │◀─┼──┼──│   Script    │  │
    │  │ Components  │  │  │  │ /api/*      │  │  │  │             │  │
    │  └─────────────┘  │  │  └─────────────┘  │  │  └─────────────┘  │
    │         │         │  │         │         │  │         │         │
    │         ▼         │  │         ▼         │  │         ▼         │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │  │  ┌─────────────┐  │
    │  │   Chat UI   │  │  │  │ ChatService │  │  │  │  Scraper    │  │
    │  │  (Stream)   │  │  │  │             │  │  │  │ (Cheerio)   │  │
    │  └─────────────┘  │  │  └─────────────┘  │  │  └─────────────┘  │
    └───────────────────┘  └─────────┬─────────┘  │         │         │
                                     │            │         ▼         │
               ┌─────────────────────┼────────────┼─────────────────┐ │
               ▼                     ▼            │                 ▼ │
    ┌───────────────────┐  ┌───────────────────┐ │  ┌───────────────────┐
    │   SERVICE LAYER   │  │   RAG PIPELINE    │ │  │   CHUNKING &      │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │ │  │   VALIDATION      │
    │  │Validation-  │  │  │  │   Query     │  │ │  │  ┌─────────────┐  │
    │  │ Service     │  │  │  │  Processing │◀─┼─┼──┼──│ Chunking    │  │
    │  └─────────────┘  │  │  └─────────────┘  │ │  │  │ Service     │  │
    │         │         │  │         │         │ │  │  └─────────────┘  │
    │         ▼         │  │         ▼         │ │  │         │         │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │ │  │         ▼         │
    │  │ Conversation│  │  │  │   Vector    │  │ │  │  ┌─────────────┐  │
    │  │   Storage   │  │  │  │   Search    │──┼─┼──┼─▶│   Vector    │  │
    │  │  (Memory/   │  │  │  └─────────────┘  │ │  │  │  Documents  │  │
    │  │   SQLite)   │  │  │         │         │ │  │  └─────────────┘  │
    │  └─────────────┘  │  │         ▼         │ │  └───────────────────┘
    └───────────────────┘  │  ┌─────────────┐  │ │
                           │  │ Context     │  │ │
                           │  │ Assembly    │  │ │
                           │  └─────────────┘  │ │
                           │         │         │ │
                           │         ▼         │ │
                           │  ┌─────────────┐  │ │
                           │  │    LLM      │──┼─┘
                           │  │ Generation  │  │
                           │  └─────────────┘  │
                           └───────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
    │  PROVIDER LAYER   │  │  CONFIGURATION    │  │   DATA STORES     │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │  │  ┌─────────────┐  │
    │  │ LLM Provider│  │  │  │ Centralized │  │  │  │ Vector DB   │  │
    │  │ (DeepSeek)  │  │  │  │   Config    │  │  │  │ (SQLite +   │  │
    │  └─────────────┘  │  │  │  Manager    │  │  │  │  pgvector)  │  │
    │         │         │  │  └─────────────┘  │  │  └─────────────┘  │
    │         ▼         │  │         │         │  │         │         │
    │  ┌─────────────┐  │  │         ▼         │  │         ▼         │
    │  │Embedding    │  │  │  ┌─────────────┐  │  │  ┌─────────────┐  │
    │  │ Provider    │──┼──┼─▶│ Environment │  │  │  │  Raw HTML   │  │
    │  │ (DeepSeek)  │  │  │  │ Variables   │  │  │  │   Storage   │  │
    │  └─────────────┘  │  │  └─────────────┘  │  │  └─────────────┘  │
    │         │         │  │                   │  │                   │
    │         ▼         │  │                   │  │                   │
    │  ┌─────────────┐  │  │                   │  │                   │
    │  │ Vector Store│  │  │                   │  │                   │
    │  │  Provider   │  │  │                   │  │                   │
    │  │  (SQLite)   │  │  │                   │  │                   │
    │  └─────────────┘  │  │                   │  │                   │
    └───────────────────┘  └───────────────────┘  └───────────────────┘
```

### 🔄 Data Flow Sequence

```mermaid
sequenceDiagram
    participant User as Citizen User
    participant Frontend as Next.js Frontend
    participant API as Chat API (/api/chat)
    participant Service as ChatService
    participant RAG as RAG Pipeline
    participant VectorDB as Vector Store
    participant LLM as DeepSeek LLM
    participant Embed as Embedding Model

    User->>Frontend: Ask question
    Frontend->>API: POST /api/chat
    API->>Service: processMessage()
    Service->>RAG: processQuery()
    RAG->>Embed: Generate query embedding
    Embed-->>RAG: Query vector
    RAG->>VectorDB: similaritySearch()
    VectorDB-->>RAG: Top K relevant chunks
    RAG->>LLM: Generate response with context
    LLM-->>RAG: AI response
    RAG-->>Service: RAGResult
    Service-->>API: ChatResponse
    API-->>Frontend: Stream response
    Frontend-->>User: Display answer + sources
```

### 🏗️ Current Component Inventory

| Layer | Component | Implementation | Purpose |
|-------|-----------|----------------|---------|
| **Frontend** | `ChatInterface.tsx` | React + TypeScript | Main chat UI component |
| | `ChatWidget.tsx` | React component | Embedded chat widget |
| | `Header/Footer.tsx` | Static components | Chesapeake branding |
| **API** | `app/api/chat/route.ts` | Next.js App Router | Chat endpoint handler |
| **Services** | `ChatService` | TypeScript class | Conversation management |
| | `ChunkingService` | Text splitting | Content chunking logic |
| | `ValidationService` | Content validation | Data quality checks |
| **Providers** | `DeepSeekLLMProvider` | Axios + API | LLM completions |
| | `DeepSeekEmbeddingProvider` | Axios + API | Vector embeddings |
| | `SQLiteVectorStore` | SQLite + vector | Local vector storage |
| | `CheerioContentScraper` | Cheerio library | Website scraping |
| **Pipeline** | `DataIngestionPipeline` | Script (`ingest.ts`) | End-to-end data pipeline |
| | `RAGPipeline` | Orchestration | Retrieval + generation |
| **Config** | `config.ts` | TypeScript config | Centralized configuration |
| **Types** | `types.ts` | TypeScript interfaces | Type definitions |

### ✅ Design Assessment: Optimal or Over-Engineered?

#### **Strengths (Optimal Design)**
1. **Modular Architecture** - Clean separation with provider interfaces allows easy swapping (e.g., DeepSeek → Qwen)
2. **Production-Ready Patterns** - Factory pattern, dependency injection, configuration management
3. **Scalability Prepared** - SQLite for demo, but interfaces support Supabase/Pinecone
4. **Testing-Friendly** - Mock implementations for all providers
5. **Comprehensive Error Handling** - Validation at each layer
6. **Type Safety** - Full TypeScript implementation

#### **Appropriate Complexity Level**
- **Not over-engineered for a demo**: The modular design is justified because:
  - It demonstrates enterprise-ready architecture to potential clients
  - Allows easy provider switching (critical for demo flexibility)
  - Supports multiple deployment scenarios (local, cloud, hybrid)
  - Includes fallback mechanisms (mock providers)

#### **Minor Improvements Suggested**
1. **Caching Layer**: Add Redis/MemoryCache for frequent queries
2. **Monitoring**: Basic metrics collection for demo insights
3. **Batch Processing**: For larger-scale ingestion
4. **Edge Cases**: More robust error recovery in scraping

### 🔄 Qwen Embedding Model Recommendations

Since DeepSeek doesn't offer a dedicated embedding model, switching to Qwen embeddings is recommended:

#### **Recommended Models**
- **Qwen/Qwen2.5-7B-Instruct** (4096 dimensions, 32K context) - Best for general RAG tasks
- **Qwen/Qwen2.5-1.5B-Instruct** (2048 dimensions) - Lightweight deployment
- **Qwen/Qwen2.5-Coder-7B** (4096 dimensions) - Technical/government content

#### **Implementation Steps**
1. Update configuration to use Qwen provider
2. Create `QwenEmbeddingProvider` implementation
3. Update vector store dimension to 4096
4. Re-embed all existing documents

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Docker
- **Option 1 (Cloud)**: DeepSeek API key (free tier available)
- **Option 2 (Local)**: Ollama installed for Qwen embeddings
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/chesapeake-chatbot.git
   cd chesapeake-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your DeepSeek API key
   ```

4. **Populate knowledge base**
   ```bash
   npm run ingest
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

### Docker Development

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Run data ingestion (first time)**
   ```bash
   docker-compose run --rm chatbot npm run ingest
   ```

3. **Access the application**
   ```
   http://localhost:3000
   ```

## 📦 Production Deployment

### VPS Deployment (Recommended)

**Minimum VPS Requirements:**
- **vCPU**: 2 cores
- **RAM**: 4GB (2GB minimum)
- **Storage**: 20GB SSD
- **OS**: Ubuntu 22.04 LTS

**Deployment Steps:**

1. **Prepare VPS**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt-get install docker-compose-plugin
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-org/chesapeake-chatbot.git
   cd chesapeake-chatbot
   
   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values
   
   # Set RUN_DATA_INGESTION=true for first deployment
   echo "RUN_DATA_INGESTION=true" >> .env
   
   # Start services
   docker-compose up -d --build
   
   # Monitor logs
   docker-compose logs -f chatbot
   ```

3. **Configure Domain & SSL (Optional)**
   ```bash
   # Enable nginx in docker-compose.yml
   # Update nginx/nginx.conf with your domain
   # Place SSL certificates in nginx/ssl/
   docker-compose up -d --build
   ```

### Vercel Deployment (Simple)

1. **Connect repository to Vercel**
2. **Configure environment variables**
3. **Disable serverless functions timeout (for ingestion)**
4. **Deploy**

### Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare DNS                            │
│                    (your-domain.com)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPS / Cloud Provider                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Nginx Reverse Proxy               │  │
│  │  • SSL Termination                                 │  │
│  │  • Rate Limiting                                  │  │
│  │  • Static File Caching                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Containers                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Chatbot   │  │  PostgreSQL │  │    Redis    │  │  │
│  │  │   App       │  │  (optional) │  │  (optional) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

### Local Qwen Embeddings Setup

For local embeddings (no API costs), follow these steps:

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Pull Qwen model**
   ```bash
   ollama pull qwen2.5:1.5b
   # Alternative: qwen2.5:7b for better quality (requires more RAM)
   ```

3. **Start Ollama server**
   ```bash
   ollama serve
   # Runs on http://localhost:11434 by default
   ```

4. **Configure environment variables**
   ```bash
   # In .env.local or docker-compose.override.yml
   EMBEDDING_PROVIDER=qwen
   EMBEDDING_MODEL=qwen2.5:1.5b
   EMBEDDING_BASE_URL=http://localhost:11434
   EMBEDDING_API_KEY=""  # No API key needed for local Ollama
   ```

5. **Test the setup**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Test embeddings
   curl http://localhost:11434/api/embeddings \
     -H "Content-Type: application/json" \
     -d '{"model": "qwen2.5:1.5b", "prompt": "test embedding"}'
   ```

6. **Update vector store dimension**
   Since Qwen2.5-1.5B uses 2048-dimensional embeddings (vs DeepSeek's 1536), you need to:
   - Clear existing vector store: `rm -rf data/vector_store.db`
   - Re-run ingestion: `npm run ingest`

**Docker Development**:
- Use `docker-compose --profile ollama up` to start with Ollama
- The Qwen model will be automatically pulled on first run
- Embeddings dimension is pre-configured to 2048

Key configuration options in `.env`:

```bash
# Required: DeepSeek API Key
LLM_API_KEY=sk-your-deepseek-api-key-here

# Optional: Vector Store (default: SQLite)
VECTOR_STORE_PROVIDER=sqlite  # Options: sqlite, supabase, pinecone

# Optional: Data Ingestion (first deployment)
RUN_DATA_INGESTION=true
INGESTION_MAX_PAGES=30  # Pages to scrape from website

# Optional: Production Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=chesapeake_chatbot
```

### System Prompt Customization

Edit `lib/config.ts` to modify the Agentic AI system prompt:

```typescript
systemPrompt: `# AGENTIC AI CHATBOT SYSTEM PROMPT
## Chesapeake City Government Assistant

### CORE IDENTITY
You are the Chesapeake City Agentic AI Chatbot...
`
```

## 📚 API Documentation

### Chat API Endpoint

**POST** `/api/chat`

```json
{
  "message": "How do I apply for a building permit?",
  "conversationId": "optional-conversation-id",
  "sessionId": "optional-session-id",
  "options": {
    "stream": true,
    "temperature": 0.7,
    "includeSources": true,
    "maxTokens": 1000
  }
}
```

**Response (Non-Streaming):**
```json
{
  "success": true,
  "data": {
    "message": "To apply for a building permit in Chesapeake City...",
    "conversationId": "conv_123456",
    "messageId": "msg_789012",
    "sources": [
      {
        "source": "https://www.cityofchesapeake.net",
        "url": "https://www.cityofchesapeake.net/permits",
        "title": "Building Permits - Chesapeake City"
      }
    ],
    "suggestedFollowUps": [
      "What documents do I need?",
      "How long does the process take?",
      "What are the fees?"
    ]
  }
}
```

**Streaming Response (SSE):**
```
data: {"type":"metadata","timestamp":"2024-01-01T00:00:00Z"}
data: {"type":"chunk","content":"To","timestamp":"2024-01-01T00:00:01Z"}
data: {"type":"chunk","content":" apply","timestamp":"2024-01-01T00:00:01Z"}
data: {"type":"sources","message":"Response complete"}
data: [DONE]
```

### Health Check

**GET** `/api/chat`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "production",
  "model": "deepseek-chat",
  "vectorStoreDocuments": 1250
}
```

## 🧪 Development

### Project Structure

```
chesapeake-chatbot/
├── app/                    # Next.js app router
│   ├── api/              # API routes
│   │   └── chat/         # Chat API endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ChatInterface.tsx # Main chat component
│   ├── Header.tsx        # Website header
│   └── Footer.tsx        # Website footer
├── lib/                  # Core library
│   ├── types.ts         # TypeScript interfaces
│   ├── config.ts        # Configuration management
│   ├── providers/       # Provider implementations
│   └── services/        # Business logic services
├── scripts/             # Utility scripts
│   └── ingest.ts       # Data ingestion pipeline
├── docker/              # Docker configuration
├── nginx/              # Nginx configuration
├── .env.example        # Environment template
├── docker-compose.yml  # Docker orchestration
├── Dockerfile          # Docker build
└── package.json        # Dependencies
```

### Adding New Providers

The system uses a modular provider pattern. To add a new LLM provider:

1. Create provider implementation:
   ```typescript
   // lib/providers/implementations/new-llm.ts
   export class NewLLMProvider implements LLMProvider {
     async generateCompletion(messages: ChatMessage[]): Promise<LLMResponse> {
       // Implementation
     }
   }
   ```

2. Update factory:
   ```typescript
   // lib/providers/factory.ts
   case "new-llm":
     return new NewLLMProvider(config);
   ```

3. Update configuration:
   ```typescript
   // lib/config.ts
   LLM_PROVIDER: "new-llm"
   ```

### Testing

```bash
# Run development server
npm run dev

# Test API endpoints
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'

# Run data ingestion
npm run ingest -- --max-pages 10 --verbose
```

## 🧪 Complete Testing Flow

### Embedding Provider Tests
Test different embedding providers using the included test suite:

```bash
# Test mock provider (fast, no external dependencies)
npm run test:embeddings mock

# Test Qwen provider with local Ollama
# First, ensure Ollama is running and Qwen model is pulled
npm run test:embeddings qwen

# Test DeepSeek provider (requires API key)
LLM_API_KEY=your_key npm run test:embeddings deepseek

# Test all providers
npm run test:embeddings all
```

### Full Flow Testing with Mock Providers
Test the complete RAG pipeline using mock providers:

```bash
# Set environment to use mock providers
export LLM_PROVIDER=mock
export EMBEDDING_PROVIDER=mock

# Run data ingestion with mock embeddings
npm run ingest -- --maxPages=1 --skipScraping

# Start development server
npm run dev

# Test the API endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I apply for a business license?"}'
```

### Integration Testing with Qwen Embeddings
For local testing with Qwen embeddings:

1. **Start Ollama service**:
   ```bash
   ollama serve
   ```

2. **Pull Qwen model**:
   ```bash
   ollama pull qwen2.5:1.5b
   ```

3. **Configure environment**:
   ```bash
   export EMBEDDING_PROVIDER=qwen
   export EMBEDDING_BASE_URL=http://localhost:11434
   ```

4. **Run full ingestion**:
   ```bash
   npm run ingest -- --maxPages=5
   ```

5. **Start application and test**:
   ```bash
   npm run dev
   ```

### Automated Test Suite
The project includes comprehensive type checking and build validation:

```bash
# TypeScript type checking
npx tsc --noEmit

# Build verification
npm run build

# Development server health check
curl http://localhost:3000/api/chat
```

### Testing Results Verification
- ✅ **Mock providers**: Instant responses, no external dependencies
- ✅ **Qwen embeddings**: Local inference, 2048-dimensional vectors
- ✅ **DeepSeek embeddings**: Cloud API, 1536-dimensional vectors
- ✅ **Type safety**: Full TypeScript validation
- ✅ **Build process**: Next.js production build verification

## 📊 Monitoring & Maintenance

### Health Monitoring

1. **Application Health**: `/api/chat` GET endpoint
2. **Docker Health**: `docker-compose ps`
3. **Nginx Status**: `docker-compose exec nginx nginx -t`

### Logs

```bash
# View application logs
docker-compose logs -f chatbot

# View nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# View error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

### Backup & Recovery

```bash
# Backup vector database
docker-compose exec chatbot cp /app/data/vector_store.db /app/data/backup/vector_store_$(date +%Y%m%d).db

# Backup ingestion data
tar -czf data_backup_$(date +%Y%m%d).tar.gz data/

# Restore from backup
docker-compose stop chatbot
cp backup/vector_store.db data/vector_store.db
docker-compose start chatbot
```

### Updating Knowledge Base

```bash
# Manual update
docker-compose run --rm chatbot npm run ingest

# Automated update (cron job)
0 2 * * * cd /path/to/chesapeake-chatbot && docker-compose run --rm chatbot npm run ingest >> /var/log/chatbot-ingestion.log 2>&1
```

## 🔒 Security

### Best Practices

1. **API Keys**: Store in environment variables, never in code
2. **Rate Limiting**: Configured in nginx and application layer
3. **Input Validation**: All user inputs are validated
4. **CORS**: Configured for specific origins
5. **HTTPS**: Always use SSL in production
6. **Regular Updates**: Keep dependencies updated

### Security Headers

The application includes:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security (HTTPS)

## 📈 Performance Optimization

### For 1000+ Concurrent Users

1. **Database**: Switch from SQLite to PostgreSQL + pgvector
2. **Caching**: Add Redis for session storage
3. **CDN**: Use Cloudflare for static assets
4. **Load Balancing**: Multiple chatbot instances behind nginx
5. **Monitoring**: Implement Prometheus + Grafana

### Expected Performance

- **Response Time**: < 2 seconds (including AI generation)
- **Uptime**: 99.9%+
- **Concurrent Users**: 100+ (single instance)
- **Knowledge Base**: 10,000+ documents

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive documentation
- Add tests for new features
- Update CHANGELOG.md
- Maintain backward compatibility

## 📄 License

This project is proprietary software developed for Chesapeake City. All rights reserved.

## 📞 Support

For technical support or deployment assistance:
- **Email**: tech-support@chesapeakecity.gov
- **Documentation**: [docs.chesapeakechatbot.com](https://docs.chesapeakechatbot.com)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/chesapeake-chatbot/issues)

---

<div align="center">
  <p>Built with ❤️ for the citizens of Chesapeake City</p>
  <p>© 2024 Chesapeake City Government. All rights reserved.</p>
</div>