import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md border-b-4 border-blue-700">
      {/* Top banner */}
      <div className="bg-blue-800 text-white py-2 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-sm">
            <span className="font-semibold">City of Chesapeake, Virginia</span>
            <span className="mx-2">|</span>
            <span>Serving Our Community Since 1963</span>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-blue-200 text-sm">Accessibility</a>
            <a href="#" className="hover:text-blue-200 text-sm">Contact</a>
            <a href="#" className="hover:text-blue-200 text-sm">Site Map</a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and Title */}
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-700 text-white rounded-lg p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Chesapeake City
                <span className="block text-lg md:text-xl text-blue-700 font-normal">Chat Assistant</span>
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="w-full md:w-auto">
            <ul className="flex flex-wrap justify-center space-x-1 md:space-x-4">
              <li>
                <Link
                  href="/"
                  className="px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                >
                  Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/departments"
                  className="px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                >
                  Departments
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </nav>

          {/* Search and User Area */}
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search services..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 md:w-56"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links Bar */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap justify-center md:justify-start space-x-4 text-sm">
            <a href="#" className="text-blue-700 hover:text-blue-900 font-medium">Request a Service</a>
            <span className="text-gray-400">|</span>
            <a href="#" className="text-blue-700 hover:text-blue-900 font-medium">Pay Bills</a>
            <span className="text-gray-400">|</span>
            <a href="#" className="text-blue-700 hover:text-blue-900 font-medium">Report Issues</a>
            <span className="text-gray-400">|</span>
            <a href="#" className="text-blue-700 hover:text-blue-900 font-medium">Events Calendar</a>
            <span className="text-gray-400">|</span>
            <a href="#" className="text-blue-700 hover:text-blue-900 font-medium">News & Updates</a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
