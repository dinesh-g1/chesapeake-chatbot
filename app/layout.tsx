chesapeake-chatbot/app/layout.tsx
```

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chesapeake City Agentic AI Chatbot | Official Government Assistant",
  description: "An advanced Agentic AI-powered chatbot providing 24/7 assistance with Chesapeake City government services, departments, permits, utilities, and community information.",
  keywords: [
    "Chesapeake City",
    "Virginia government",
    "city services",
    "Agentic AI",
    "chatbot",
    "permit applications",
    "utility services",
    "public safety",
    "community information",
  ],
  authors: [{ name: "City of Chesapeake, Virginia" }],
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  openGraph: {
    type: "website",
    title: "Chesapeake City Agentic AI Chatbot",
    description: "24/7 AI-powered assistance for Chesapeake City government services",
    siteName: "Chesapeake City Government",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 selection:bg-blue-600 selection:text-white">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to main content
        </a>

        {/* Header */}
        <Header />

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12"
          role="main"
        >
          {children}
        </main>

        {/* Footer */}
        <Footer />

        {/* Loading indicator for better UX */}
        <div className="fixed bottom-4 right-4 z-40 opacity-0 pointer-events-none transition-opacity duration-300 data-[loading=true]:opacity-100" data-loading="false" id="global-loading">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Processing...</span>
          </div>
        </div>

        {/* Service worker registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js').catch(function(error) {
                    console.log('ServiceWorker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />

        {/* Global loading state handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                const loadingIndicator = document.getElementById('global-loading');

                // Show loading on form submissions
                document.addEventListener('submit', function(e) {
                  if (e.target.tagName === 'FORM') {
                    loadingIndicator.setAttribute('data-loading', 'true');
                  }
                });

                // Hide loading when forms complete
                document.addEventListener('ajaxComplete', function() {
                  loadingIndicator.setAttribute('data-loading', 'false');
                });

                // Also hide after 10 seconds as fallback
                setTimeout(() => {
                  loadingIndicator.setAttribute('data-loading', 'false');
                }, 10000);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
```

Now I need to update the home page as well. Let me write the new page.tsx file.
