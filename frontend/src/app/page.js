import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full px-4 overflow-hidden">

      {/* Background Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/30 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
      <div className="absolute top-40 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] -z-10 animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-violet-300 font-medium mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          Next-Generation AI Voice Agents Available Now
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Voice AI that sounds <br className="hidden md:block" />
          <span className="text-gradient">fundamentally human.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          OmniVoice Labs provides intelligent agent-based systems that handle complex inbound and outbound calls using advanced Speech-to-Text, LLMs, and Text-to-Speech technologies.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/try-for-free"
            className="px-8 py-4 rounded-xl text-md font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-[0_0_40px_rgba(139,92,246,0.5)] transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
          >
            Deploy your Agent — It's Free
          </Link>
          <Link
            href="#features"
            className="px-8 py-4 rounded-xl text-md font-semibold text-white glass hover:bg-white/10 transition-colors w-full sm:w-auto"
          >
            See how it works
          </Link>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-24 relative mx-auto w-full max-w-5xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl blur opacity-30"></div>
          <div className="relative glass-panel rounded-2xl border border-white/10 p-2 shadow-2xl h-[400px] flex items-center justify-center overflow-hidden">
            {/* Abstract wave visualization representing voice */}
            <div className="flex items-center gap-1 opacity-50">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-violet-500 to-cyan-400 rounded-full animate-pulse-slow"
                  style={{
                    height: `${Math.max(20, Math.sin(i * 0.5) * 100 + 120)}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                ></div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
            <div className="absolute bottom-10 text-center">
              <p className="text-sm font-mono text-cyan-400">STATUS: AGENT ONLINE · WAITING FOR CALLS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full max-w-7xl mx-auto py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for the enterprise.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Everything you need to automate your customer interactions without sounding like a robot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.08-7.076-6.975l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Instant Twilio Sync</h3>
            <p className="text-gray-400 leading-relaxed">
              Connect your Twilio phone numbers in seconds. Our infrastructure handles the bi-directional audio streaming with near-zero latency.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.98 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">RAG Knowledge Base</h3>
            <p className="text-gray-400 leading-relaxed">
              Upload your PDFs, internal docs, or JSON FAQs. The agent automatically ingests them into Pinecone and references them accurately.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 19.5 16.5h-2.25m-9 0h9m-9 0 1.25 5.092m7.5-5.092-1.25 5.092m-5.83-5.092h5.83" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Live Call Analytics</h3>
            <p className="text-gray-400 leading-relaxed">
              Monitor transcriptions, sentiment, and agent routing in real-time. Automatically categorize calls into inquiries, bookings, or complaints.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
