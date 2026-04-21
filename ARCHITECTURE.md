# Chesapeake City Chatbot - Architecture Document

## Overview
A chatbot assistant for Chesapeake City citizens that provides information and services based exclusively on public information from the City of Chesapeake website (https://www.cityofchesapeake.net/). The system uses Retrieval-Augmented Generation (RAG) to ensure responses are grounded in official city information.

## Key Requirements
1. **Information Source**: Only use content from the Chesapeake City website
2. **UI/UX**: Match the Chesapeake City website design and branding
3. **Chat Memory**: Remember conversation history per user
4. **Formatted Outputs**: Well-structured, readable responses
5. **Public Hosting**: Deployable to public endpoint for demo

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Next.js Frontend (React/TypeScript)       │   │
│  │  • Matches Chesapeake City website design            │   │
│  │  • Chat interface with conversation history          │   │
│  │  • Responsive design for all devices                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js App Router)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Chat API (/api/chat)                     │   │
│  │  • Process user queries                              │   │
│  │  • Manage conversation context                       │   │
│  │  • Integrate with RAG pipeline                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   RAG (Retrieval-Augmented Generation)      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Query     │  │   Vector    │  │    LLM      │          │
│  │  Embedding  │  │   Search    │  │  Generation │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │               │                    │              │
│         └───────────────┼────────────────────┘              │
│                         ▼                                   │
│               ┌─────────────────┐                           │
│               │  Retrieved      │                           │
│               │  Context        │                           │
│               │  (Website Chunks)│                          │
│               └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Vector Database                         │   │
│  │  • Stores website content embeddings                 │   │
│  │  • Enables semantic search                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Conversation Storage                       │   │
│  │  • Stores chat history per user                      │   │
│  │  • Enables context-aware responses                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Source Data Pipeline                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Website Scraper                           │   │
│  │  • Extracts content from Chesapeake website          │   │
│  │  • Focuses on citizen-facing pages                   │   │
│  │  • Regular updates possible                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Website Scraper & Content Pipeline
**Purpose**: Extract and preprocess content from the Chesapeake City website
**Key Pages to Scrape**:
- Homepage
- Services directory
- Departments (Police, Fire, Utilities, Public Works)
- Contact information
- Forms and applications
- News and updates
- Events calendar
- FAQs and help center

**Implementation**:
- Use Cheerio/Playwright for scraping
- Extract text content, headings, and metadata
- Chunk content into manageable pieces (256-512 tokens)
- Store raw content for reference

### 2. Vector Database & Embeddings
**Purpose**: Enable semantic search over website content
**Options**:
- **Supabase pgvector** (Recommended for demo): Free tier, PostgreSQL with vector support
- **Pinecone**: Production-ready but costs $
- **ChromaDB**: Local, open-source option
- **SQLite with vector extension**: Simple local option

**Embedding Models**:
- **OpenAI text-embedding-3-small**: High quality, costs $
- **DeepSeek Embeddings**: Alternative to OpenAI
- **Local models (all-MiniLM-L6-v2)**: Free, runs locally

**Recommendation for Demo**: Use Supabase pgvector with OpenAI embeddings (free trial key)

### 3. LLM & RAG Pipeline
**Purpose**: Generate context-aware responses based on retrieved information
**Components**:
1. **Query Processing**: Parse user question, extract intent
2. **Vector Search**: Find relevant content chunks
3. **Context Assembly**: Combine chunks with query
4. **LLM Generation**: Generate response using retrieved context

**LLM Options**:
- **OpenAI GPT-4/GPT-3.5-turbo**: High quality, costs $
- **DeepSeek Chat**: Cost-effective alternative
- **Open-source models (Llama 3.1, Mistral)**: Local, free

**Recommendation for Demo**: Use DeepSeek Chat (available via API) for cost efficiency

### 4. Chat Interface & Memory
**Purpose**: Provide engaging user experience with conversation memory
**Features**:
- Chat interface matching Chesapeake website design
- Conversation history per session/user
- Ability to reference previous conversations
- Suggested follow-up questions
- Formatted outputs (lists, tables, links where applicable)

**Implementation**:
- Next.js React components
- Local storage for session persistence
- Supabase for user conversation history (if auth added)
- Streaming responses for better UX

### 5. Backend API
**Purpose**: Handle chat requests and orchestrate RAG pipeline
**Endpoints**:
- `POST /api/chat`: Process chat messages
- `GET /api/health`: System health check
- `POST /api/feedback`: Collect user feedback (optional)

**Authentication**: Optional for demo, can be added later

## Technology Stack

### Frontend
- **Next.js 16** (App Router) - React framework with SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling matching Chesapeake website
- **React Query / SWR** - Data fetching
- **shadcn/ui** - UI components (optional)

### Backend
- **Next.js API Routes** - Backend API
- **Supabase** - Database (pgvector + conversation storage)
- **OpenAI/DeepSeek API** - LLM and embeddings
- **Cheerio/Playwright** - Web scraping

### Deployment
- **Vercel** - Hosting platform (free tier)
- **Supabase** - Database hosting (free tier)
- **GitHub Actions** - CI/CD pipeline

## Data Flow

1. **Initial Setup**:
   ```
   Scrape Chesapeake website → Extract text → Create embeddings → Store in vector DB
   ```

2. **Chat Interaction**:
   ```
   User asks question → Create query embedding → Search vector DB → 
   Retrieve relevant chunks → Format context → Send to LLM → 
   Generate response → Return to user → Store conversation
   ```

3. **Context Management**:
   ```
   New message → Load previous messages → Include in context → 
   Generate response → Update conversation history
   ```

## Security Considerations

1. **API Keys**: Store in environment variables (not in code)
2. **Rate Limiting**: Prevent abuse of chat endpoint
3. **Data Privacy**: Don't store personal information without consent
4. **Content Filtering**: Ensure responses are appropriate
5. **CORS**: Configure for public access

## Performance Considerations

1. **Caching**: Cache frequent queries and responses
2. **Streaming**: Stream LLM responses for better UX
3. **Chunk Size**: Optimize for retrieval accuracy vs performance
4. **Database Indexing**: Proper indexing for vector search
5. **CDN**: Use Vercel's edge network for static assets

## Demo-Specific Adjustments

For the proof-of-concept demo, we can simplify:

1. **Limited Scraping**: Focus on 10-20 key pages instead of entire site
2. **Local Vector Store**: Use SQLite with vector extension for simplicity
3. **Session-based Memory**: Use browser storage instead of database
4. **Mock Authentication**: Simulate user accounts if needed
5. **Fallback Responses**: Graceful degradation if APIs fail

## Deployment Strategy

1. **Local Development**: Full setup with all components
2. **Staging Environment**: Deploy to Vercel preview
3. **Production Demo**: Deploy to public Vercel URL
4. **Monitoring**: Basic health checks and error tracking
5. **Backup**: Regular backups of vector database

## Success Metrics for Demo

1. **Accuracy**: Responses based on actual website content
2. **Speed**: Response time under 3 seconds
3. **UX**: Interface matches Chesapeake website design
4. **Reliability**: 99% uptime during demo
5. **Scalability**: Can handle multiple concurrent users

## Future Enhancements (Post-Contract)

1. **Comprehensive Scraping**: Full website coverage
2. **Document Upload**: Allow internal document training
3. **Multi-language Support**: Spanish and other languages
4. **Voice Interface**: Speech-to-text and text-to-speech
5. **Integration**: Connect with city services and databases
6. **Analytics**: Track common questions and user satisfaction
7. **Automated Updates**: Regular website content updates

## Timeline for Demo Development

**Day 1 (Today)**:
- [x] Project setup (Next.js, dependencies)
- [ ] Architecture documentation (this document)
- [ ] Basic scraping script
- [ ] Vector database setup

**Day 2**:
- [ ] RAG pipeline implementation
- [ ] Chat API development
- [ ] Basic UI with Chesapeake styling

**Day 3**:
- [ ] Chat memory implementation
- [ ] Enhanced UI/UX
- [ ] Testing and refinement

**Day 4**:
- [ ] Deployment to Vercel
- [ ] Performance optimization
- [ ] Demo preparation

**Day 5 (Demo Day)**:
- [ ] Final testing
- [ ] Presentation materials
- [ ] Demo rehearsal

## Risk Mitigation

1. **API Costs**: Use DeepSeek instead of OpenAI to reduce costs
2. **Scraping Blocks**: Implement respectful scraping with delays
3. **LLM Limitations**: Implement fallback to keyword search
4. **Deployment Issues**: Use Vercel for simplicity
5. **Data Accuracy**: Regular validation against source website

## Conclusion

This architecture provides a scalable, maintainable foundation for the Chesapeake City chatbot while meeting all demo requirements. The RAG approach ensures responses are grounded in official city information, and the modular design allows for easy enhancements once the project contract is secured.

The proof-of-concept will demonstrate:
1. **Technical Feasibility**: Working RAG system with accurate responses
2. **User Experience**: Clean interface matching city website
3. **Scalability**: Architecture ready for expansion
4. **Cost Efficiency**: Affordable solution for the city
5. **Value Proposition**: Clear benefits for citizens and city staff
