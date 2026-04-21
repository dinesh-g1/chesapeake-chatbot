"use client";

import { useState } from "react";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  // Navigation items
  const mainNavigation = [
    { label: "Home", href: "#" },
    { label: "Government", href: "#" },
    { label: "Business", href: "#" },
    { label: "Community", href: "#" },
    { label: "Visitors", href: "#" },
    { label: "How Do I...", href: "#" },
  ];

  // News items
  const newsItems = [
    {
      title: "FY27 Budget Presentation",
      date: "March 18, 2026",
      category: "Finance",
      description:
        "City Manager Chris Price presented his proposed Operating and Capital Budgets to City Council.",
    },
    {
      title: "2026 Special Election Voters Guide",
      date: "April 2, 2026",
      category: "Elections",
      description:
        "A special election will be held on Tuesday, April 21, 2026, for City Council District 2.",
    },
    {
      title: "Improper Battery Disposal Poses Fire Risk",
      date: "March 28, 2026",
      category: "Public Safety",
      description:
        "Improper disposal of lithium-ion batteries in household trash can cause dangerous fires.",
    },
    {
      title: "City Council Meeting Agenda",
      date: "April 21, 2026",
      category: "Government",
      description:
        "The next City Council meeting will be held on Tuesday, April 21 at 6:30 PM.",
    },
  ];

  // Quick links
  const quickLinks = [
    { label: "Pay Water Bill", href: "#" },
    { label: "Building Permits", href: "#" },
    { label: "Trash Schedule", href: "#" },
    { label: "Report an Issue", href: "#" },
    { label: "Property Taxes", href: "#" },
    { label: "Parks & Recreation", href: "#" },
    { label: "Chesapeake Alert", href: "#" },
    { label: "Online Services", href: "#" },
  ];

  // Departments
  const departments = [
    "Police Department",
    "Fire Department",
    "Public Works",
    "Planning Department",
    "Parks & Recreation",
    "Human Services",
  ];

  // Resources
  const resources = [
    "Public Records Request",
    "Open Data Portal",
    "Budget & Finance",
    "Employment Opportunities",
    "Bids & RFPs",
    "City Code",
  ];

  // Legal links
  const legalLinks = [
    "Privacy Policy",
    "Terms of Use",
    "Accessibility",
    "Copyright",
    "Disclaimer",
    "Non-Discrimination",
  ];

  return (
    <div className="min-h-screen bg-white text-[#454545] font-arial text-[0.95em] leading-[1.5]">
      {/* Header - Fixed position */}
      <header className="fixed top-[-1px] left-0 right-0 z-40 bg-white shadow-[3px_3px_25px_0_rgba(162,34,76,0.21)] border-b border-[#898a8e]">
        {/* Top bar */}
        <div className="chesapeake-bg-secondary text-white py-1">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm">
              <div className="mb-1 md:mb-0">
                <span className="font-semibold">
                  City of Chesapeake, Virginia
                </span>
                <span className="mx-2">|</span>
                <span className="text-gray-300">
                  Serving Our Community Since 1963
                </span>
              </div>
              <div className="flex space-x-4 mt-1 md:mt-0">
                <a
                  href="#"
                  onClick={handleLinkClick}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Accessibility
                </a>
                <a
                  href="#"
                  onClick={handleLinkClick}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </a>
                <a
                  href="#"
                  onClick={handleLinkClick}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Site Map
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Logo and search */}
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="chesapeake-bg-primary text-white w-10 h-10 rounded flex items-center justify-center font-bold text-lg mr-3">
                CC
              </div>
              <div>
                <h1 className="text-[1.7em] font-bold chesapeake-text-primary">
                  City of Chesapeake
                </h1>
                <p className="text-[#898a8e] text-sm">
                  Official Government Website
                </p>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search services..."
                className="w-full px-3 py-2 border border-[#898a8e] rounded focus:outline-none focus:ring-2 focus:ring-[#a21f4b] focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#898a8e]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <nav className="border-t border-[#898a8e]">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center md:justify-start py-2 space-x-0 md:space-x-6 space-y-1 md:space-y-0">
              {mainNavigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={handleLinkClick}
                  className="nav-hover font-open-sans font-semibold text-[#454545] uppercase px-3 py-1.5 md:px-2 md:py-1 text-sm hover:chesapeake-bg-primary hover:text-white rounded transition-all duration-300 ease-in-out"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Main content - offset for fixed header */}
      <main className="pt-40">
        {/* Hero section */}
        <section className="chesapeake-bg-primary bg-gradient-to-b from-[#a21f4b] via-[#a21f4b]/95 to-[#a21f4b]/80 py-8">
          <div className="container mx-auto px-4">
            <div className="text-white">
              <h2 className="text-[1.3em] font-bold mb-4">
                Welcome to Chesapeake
              </h2>
              <p className="mb-6 max-w-2xl">
                Discover city services, stay informed about local news, and
                connect with your government. We are committed to providing
                excellent service to our residents, businesses, and visitors.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleButtonClick}
                  className="bg-white chesapeake-text-primary px-5 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
                >
                  Explore Services
                </button>
                <button
                  onClick={handleButtonClick}
                  className="bg-transparent border-2 border-white text-white px-5 py-2 rounded font-semibold hover:bg-white/10 transition-colors"
                >
                  View Calendar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* News section */}
        <section className="bg-[#fafafa] py-8">
          <div className="container mx-auto px-4">
            <h3 className="text-[1.1em] font-bold chesapeake-text-primary border-b-4 border-[#898a8e] pb-2 mb-6">
              News & Updates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border border-[#898a8e] rounded p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold chesapeake-text-secondary">
                      {item.title}
                    </h4>
                    <span className="bg-[#f2f2f2] text-[#454545] text-xs font-medium px-3 py-1 rounded-full">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[#898a8e] text-sm mb-3">
                    Posted on {item.date}
                  </p>
                  <p className="mb-4">{item.description}</p>
                  <a
                    href="#"
                    onClick={handleLinkClick}
                    className="chesapeake-text-primary font-medium hover:underline inline-flex items-center"
                  >
                    Read More
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services and quick links */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* City services */}
              <div>
                <h3 className="text-[1.1em] font-bold chesapeake-text-secondary mb-6">
                  City Services
                </h3>
                <div className="bg-white border border-[#898a8e] rounded p-4">
                  <ul className="space-y-2">
                    {quickLinks.slice(0, 6).map((link, index) => (
                      <li key={index}>
                        <a
                          href={link.href}
                          onClick={handleLinkClick}
                          className="block py-2 px-3 chesapeake-text-secondary hover:chesapeake-bg-primary hover:text-white rounded transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quick links */}
              <div>
                <h3 className="text-[1.1em] font-bold chesapeake-text-secondary mb-6">
                  Quick Links
                </h3>
                <div className="bg-white border border-[#898a8e] rounded p-4">
                  <ul className="space-y-2">
                    {quickLinks.slice(6).map((link, index) => (
                      <li key={index}>
                        <a
                          href={link.href}
                          onClick={handleLinkClick}
                          className="block py-2 px-3 chesapeake-text-secondary hover:chesapeake-bg-primary hover:text-white rounded transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contact information */}
              <div>
                <h3 className="text-[1.1em] font-bold chesapeake-text-secondary mb-6">
                  Contact Information
                </h3>
                <div className="bg-white border border-[#898a8e] rounded p-4">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 chesapeake-text-primary mt-0.5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <div className="font-semibold">City Hall</div>
                        <div className="text-sm">306 Cedar Road</div>
                        <div className="text-sm">Chesapeake, VA 23320</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 chesapeake-text-primary mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <div>(757) 382-6000</div>
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 chesapeake-text-primary mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <div>info@cityofchesapeake.net</div>
                    </div>
                  </div>
                  <button
                    onClick={handleButtonClick}
                    className="w-full mt-6 chesapeake-bg-secondary text-white py-2 rounded font-semibold hover:chesapeake-bg-secondary-hover transition-colors"
                  >
                    Contact Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="chesapeake-bg-secondary bg-gradient-to-t from-[#072d4df5] to-[#0c5898cc] text-white py-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h5 className="text-lg font-bold mb-4">City of Chesapeake</h5>
                <p className="text-gray-300 text-sm">
                  Providing quality services to our residents, businesses, and
                  visitors since 1963.
                </p>
              </div>
              <div>
                <h6 className="font-bold mb-3">Departments</h6>
                <ul className="space-y-2 text-sm text-gray-300">
                  {departments.map((dept) => (
                    <li key={dept}>
                      <a
                        href="#"
                        onClick={handleLinkClick}
                        className="hover:text-white transition-colors"
                      >
                        {dept}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="font-bold mb-3">Resources</h6>
                <ul className="space-y-2 text-sm text-gray-300">
                  {resources.map((resource) => (
                    <li key={resource}>
                      <a
                        href="#"
                        onClick={handleLinkClick}
                        className="hover:text-white transition-colors"
                      >
                        {resource}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="font-bold mb-3">Legal</h6>
                <ul className="space-y-2 text-sm text-gray-300">
                  {legalLinks.map((legal) => (
                    <li key={legal}>
                      <a
                        href="#"
                        onClick={handleLinkClick}
                        className="hover:text-white transition-colors"
                      >
                        {legal}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
              <p>
                © {new Date().getFullYear()} City of Chesapeake, Virginia. All
                rights reserved.
              </p>
              <p className="mt-1">
                This is a demonstration site. All links are non-functional.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Chat Widget - Functional component */}
      <ChatWidget />
    </div>
  );
}
