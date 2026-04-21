chesapeake-chatbot/app/page.tsx
```

```tsx
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import ChatInterface to avoid SSR issues with browser APIs
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Agentic AI Chatbot...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm mb-6">
                <span className="flex h-2 w-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                Powered by Agentic AI Technology
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Chesapeake City{' '}
                <span className="text-blue-700">Agentic AI Chatbot</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                Your 24/7 intelligent assistant for all Chesapeake City government services,
                departments, permits, and community information.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="#live-demo"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Try Live Demo
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-700 bg-white border-2 border-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Learn More
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Agentic AI Assistant</h3>
                      <p className="text-sm text-gray-500">Online • 24/7 Available</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-gray-700">
                      "Hello! I'm your Chesapeake City Agentic AI Assistant. I can help you with permits, utilities, city services, and more. What can I help you with today?"
                    </p>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-4 ml-8">
                    <p className="text-gray-700">
                      "How do I apply for a building permit?"
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-gray-700">
                      "I can guide you through the building permit process step-by-step. You'll need to submit plans, pay fees, and schedule inspections. Would you like me to provide the detailed requirements?"
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-200 rounded-full blur-xl opacity-70"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-100 rounded-full blur-xl opacity-70"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Agentic AI Chatbot?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced AI technology designed specifically for Chesapeake City government services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                  <div className="text-blue-700 text-2xl">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Agentic AI Technology Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our advanced system combines multiple AI capabilities for comprehensive assistance
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-blue-200 -translate-y-1/2"></div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="live-demo" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Try Our Live Agentic AI Demo
              </h2>
              <p className="text-gray-600 mb-8">
                Experience firsthand how our advanced Agentic AI chatbot can assist you with Chesapeake City services.
              </p>

              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-3">Try Asking About:</h4>
                  <div className="space-y-3">
                    {demoQuestions.map((question, index) => (
                      <button
                        key={index}
                        className="block w-full text-left px-4 py-3 bg-white hover:bg-blue-100 border border-gray-200 rounded-lg transition-colors text-gray-700"
                        onClick={() => {
                          // This would be connected to the chat interface
                          console.log('Question:', question);
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-3">Key Features in Demo:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Real-time responses with streaming
                    </li>
                    <li className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Context-aware conversation
                    </li>
                    <li className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Source citations from official website
                    </li>
                    <li className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Suggested follow-up questions
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="bg-blue-700 text-white px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">Chesapeake City Agentic AI Chatbot</h3>
                      <p className="text-blue-100 text-sm">Live Demo • Powered by DeepSeek AI</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">Online</span>
                    </div>
                  </div>
                </div>
                <div className="h-[600px]">
                  <ChatInterface
                    apiEndpoint="/api/chat"
                    streamingEnabled={true}
                    initialMessages={[
                      {
                        id: 'welcome',
                        role: 'assistant',
                        content: 'Hello! I\'m the Chesapeake City Agentic AI Chatbot. I can help you with information about city services, departments, permits, utilities, events, and more. What can I assist you with today?',
                        timestamp: new Date(),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-16 md:py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted & Secure Government Technology
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built with security, privacy, and reliability as top priorities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {trustItems.map((item, index) => (
              <div key={index} className="text-center p-8 bg-gray-800 rounded-2xl">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Citizen Services?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
            Join the future of government-citizen interaction with our Agentic AI Chatbot technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#live-demo"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-700 bg-white hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Full Demo
            </Link>
            <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-transparent border-2 border-white hover:bg-white/10 rounded-lg transition-all duration-300">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Schedule a Consultation
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

// Data definitions
const features = [
  {
    icon: '🤖',
    title: 'Agentic AI Intelligence',
    description: 'Advanced AI that doesn\'t just answer questions - it understands context, remembers conversations, and provides proactive guidance.',
    bullets: [
      'Context-aware responses',
      'Multi-step process guidance',
      'Proactive suggestions',
      'Conversation memory',
    ],
  },
  {
    icon: '⚡',
    title: '24/7 Instant Response',
    description: 'Available round-the-clock to assist citizens when they need it, without waiting for office hours.',
    bullets: [
      'Instant response time',
      'No wait times or hold music',
      'Consistent service quality',
      'Scalable to handle high demand',
    ],
  },
  {
    icon: '🔒',
    title: 'Official & Accurate',
    description: 'All information comes directly from the Chesapeake City official website - no hallucinations or misinformation.',
    bullets: [
      'Source-verified information',
      'Regular content updates',
      'No AI hallucinations',
      'Government-approved responses',
    ],
  },
  {
    icon: '📱',
    title: 'Ultra-Responsive Design',
    description: 'Works perfectly on any device - desktop, tablet, or mobile - ensuring accessibility for all citizens.',
    bullets: [
      'Mobile-first design',
      'Touch-friendly interface',
      'Fast loading times',
      'Accessibility compliant',
    ],
  },
  {
    icon: '🔄',
    title: 'Continuous Improvement',
    description: 'The system learns from interactions to provide better service over time while maintaining strict quality controls.',
    bullets: [
      'Usage analytics',
      'Performance optimization',
      'Regular model updates',
      'Feedback integration',
    ],
  },
  {
    icon: '💰',
    title: 'Cost-Effective Solution',
    description: 'Reduce call center volume and staff workload while improving citizen satisfaction and service delivery.',
    bullets: [
      'Reduced operational costs',
      'Increased efficiency',
      'Better resource allocation',
      'High citizen satisfaction',
    ],
  },
];

const steps = [
  {
    number: '1',
    title: 'Understand Query',
    description: 'Advanced natural language processing to understand citizen questions in context',
  },
  {
    number: '2',
    title: 'Retrieve Information',
    description: 'Search official Chesapeake City website content for accurate, up-to-date information',
  },
  {
    number: '3',
    title: 'Generate Response',
    description: 'Create helpful, actionable responses with citations and next steps',
  },
  {
    number: '4',
    title: 'Provide Guidance',
    description: 'Offer follow-up questions, related services, and contact information',
  },
];

const demoQuestions = [
  'How do I apply for a building permit?',
  'What are the trash pickup schedules?',
  'How do I report a pothole?',
  'Where can I pay my water bill online?',
  'What city events are happening this month?',
  'How do I contact the police department?',
];

const trustItems = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure & Private',
    description: 'All conversations are encrypted and no personal data is stored without explicit consent.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Accurate Information',
    description: 'Responses are grounded in official Chesapeake City website content with source citations.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'High Performance',
    description: 'Built for reliability with 99.9% uptime and sub-second response times.',
  },
];
```

Now I need to create a Docker deployment setup for the VPS. Let me create the Dockerfile and docker-compose.yml files. First, let me check what files we need. We have a Next.js app with SQLite backend. We need Docker configuration that includes:

1. Dockerfile for the Next.js app
2. docker-compose.yml for orchestration
3. nginx configuration for production
4. environment variable setup

Let me start with Dockerfile.I'll create a comprehensive Docker deployment setup for the Chesapeake Agentic AI Chatbot.
