import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="container px-5 py-24 mx-auto text-center">
        {/* Hero Section */}
        <div className="backdrop-blur-sm bg-black/30 rounded-xl p-10 mb-16 max-w-4xl mx-auto border border-gray-700 shadow-2xl">
          <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
            AI-Powered Inbound Calling System
          </h1>
          
          <div className="h-1 w-40 mx-auto my-5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 rounded"></div>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            An intelligent agent-based system that handles inbound calls using 
            advanced Speech-to-Text and Text-to-Speech technologies, delivering 
            seamless human-like interactions.
          </p>
          
          <Link href="/admin/login" className="inline-block py-4 px-8 text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25">
            Admin Dashboard
          </Link>
        </div>
        
        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 - Twilio Integration */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 backdrop-blur-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all transform hover:-translate-y-1 duration-300">
            <div className="w-16 h-16 mb-6 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Twilio Integration</h2>
            <div className="h-1 w-16 mx-auto my-3 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full"></div>
            <p className="text-gray-300">
              Handle inbound calls seamlessly through Twilio's API with advanced routing and real-time processing capabilities.
            </p>
          </div>
          
          {/* Feature 2 - AI Agents */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 backdrop-blur-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all transform hover:-translate-y-1 duration-300">
            <div className="w-16 h-16 mb-6 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">AI-Powered Agents</h2>
            <div className="h-1 w-16 mx-auto my-3 bg-gradient-to-r from-purple-400 to-indigo-600 rounded-full"></div>
            <p className="text-gray-300">
              Specialized intelligent agents handle different types of user queries with impressive accuracy and natural language understanding.
            </p>
          </div>
          
          {/* Feature 3 - Analytics */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all transform hover:-translate-y-1 duration-300">
            <div className="w-16 h-16 mb-6 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Advanced Analytics</h2>
            <div className="h-1 w-16 mx-auto my-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
            <p className="text-gray-300">
              Monitor system usage and agent performance with comprehensive analytics for continuous improvement and optimization.
            </p>
          </div>
        </div>
        
        {/* Metallic Badge */}
        <div className="mt-20 mb-8">
          <div className="inline-block py-2 px-6 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded-full text-white text-sm font-medium shadow-inner border border-gray-600">
            Enterprise-Grade AI Technology
          </div>
        </div>
      </div>
      
      {/* Footer with metallic effect */}
      <footer className="w-full py-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-800">
        <div className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} AI-Powered Inbound Calling System. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
