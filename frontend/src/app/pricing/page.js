import Link from 'next/link';

export const metadata = {
    title: "Pricing | OmniVoice Labs",
    description: "Simple, transparent pricing for next-generation AI voice agents.",
};

export default function PricingPage() {
    return (
        <div className="flex flex-col items-center justify-center w-full px-4 pt-12 pb-24 overflow-hidden">

            {/* Background elements */}
            <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 rounded-[100%] blur-[120px] -z-10"></div>

            <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
                    Simple, transparent pricing.
                </h1>
                <p className="text-lg text-gray-400">
                    Start for free, then pay only for the minutes your agents actually talk. No hidden fees or complex enterprise negotiations required.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">

                {/* Free Tier */}
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col">
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-white mb-2">Developer</h3>
                        <p className="text-gray-400 text-sm">Perfect for testing and building proofs of concept.</p>
                    </div>
                    <div className="mb-8 flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-white">$0</span>
                        <span className="text-gray-400">/ forever</span>
                    </div>

                    <ul className="space-y-4 mb-10 flex-grow">
                        {[
                            '1 Custom AI Agent',
                            'Up to 50 Outbound/Inbound calls per month',
                            'Standard TTS & STT Models',
                            'Basic Knowledge base (up to 5 documents)',
                            'Community Support'
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-300">
                                <svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <Link href="/try-for-free" className="w-full py-4 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors text-center border border-white/10">
                        Start Building
                    </Link>
                </div>

                {/* Pro Tier */}
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col border border-violet-500/30">
                    <div className="absolute top-0 right-0 py-1 px-4 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 rounded-bl-xl">
                        MOST POPULAR
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-b from-violet-600/10 to-transparent pointer-events-none"></div>

                    <div className="mb-8 relative">
                        <h3 className="text-2xl font-bold text-white mb-2 text-gradient">Scale</h3>
                        <p className="text-gray-400 text-sm">For businesses ready to automate their inbound operations.</p>
                    </div>
                    <div className="mb-8 flex items-baseline gap-2 relative">
                        <span className="text-5xl font-extrabold text-white">$0.15</span>
                        <span className="text-gray-400">/ minute</span>
                    </div>

                    <ul className="space-y-4 mb-10 flex-grow relative">
                        {[
                            'Unlimited Agents',
                            'Unlimited Calls',
                            'Ultra-low latency Premium Models (Llama 3, Cerebras)',
                            'Advanced RAG Document Ingestion',
                            'Real-time Call Transcripts & Analytics',
                            'Priority Email & Slack Support',
                            'Custom Twilio SIP Trunking'
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-300">
                                <svg className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <Link href="/contact" className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-opacity text-center shadow-[0_0_20px_rgba(139,92,246,0.3)] relative">
                        Contact Sales
                    </Link>
                </div>

            </div>

            {/* FAQ Section Placeholder */}
            <div className="mt-32 max-w-3xl mx-auto w-full text-center">
                <h2 className="text-2xl font-bold mb-8">Need custom engineering?</h2>
                <p className="text-gray-400 mb-8">
                    We offer white-glove setup, custom model fine-tuning, and on-premise deployments for enterprise clients.
                </p>
                <Link href="/contact" className="text-violet-400 hover:text-violet-300 font-medium underline underline-offset-4">
                    Talk to our engineering team
                </Link>
            </div>
        </div>
    );
}
