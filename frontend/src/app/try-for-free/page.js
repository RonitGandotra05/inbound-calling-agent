'use client';

import { useState } from 'react';
import { clientEnv } from '@/lib/env-client';

export default function TryForFreePage() {
    const [phone, setPhone] = useState('');
    const [policy, setPolicy] = useState('We are OmniVoice Labs. Our business hours are 9 AM to 5 PM EST, Monday through Friday. We offer AI voice agents starting at $0.15 per minute. If a customer asks a question you do not know the answer to, tell them they can email hello@omnovoicelabs.com.');
    const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'calling', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    const handleCallMe = async (e) => {
        e.preventDefault();

        if (!phone || phone.length < 10) {
            setErrorMessage('Please enter a valid phone number with country code (e.g., +14155552671)');
            return;
        }

        if (!policy || policy.length < 20) {
            setErrorMessage('Please provide a bit more context in the knowledge base so the agent can help you.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            // NOTE: This endpoint will be built in the next commit
            const response = await fetch(`${clientEnv.BACKEND_URL}/api/agent/try-for-free`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phone,
                    knowledge_text: policy
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to initiate call');
            }

            setStatus('calling');

            // Auto-reset after a minute so they can try again
            setTimeout(() => {
                setStatus('idle');
            }, 60000);

        } catch (err) {
            console.error('Call failed:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Something went wrong connecting to the telephony network. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center pt-20 pb-32 px-4 w-full relative min-h-screen">
            {/* Background Gradients */}
            <div className="absolute top-40 left-10 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -z-10"></div>
            <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] -z-10"></div>

            <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs text-cyan-400 font-mono mb-6 border-cyan-500/30">
                    LIVE DEMO ENVIRONMENT
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                    Hear it to believe it.
                </h1>
                <p className="text-xl text-gray-400">
                    Give the agent a personality and knowledge base, enter your phone number, and it will call you within seconds.
                </p>
            </div>

            <div className="glass-panel p-6 md:p-10 rounded-3xl w-full max-w-2xl border border-white/10 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                {status === 'calling' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse-slow">
                                <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.08-7.076-6.975l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                </svg>
                            </div>
                            <div className="absolute inset-0 rounded-full border border-violet-500/50 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                        </div>

                        <h3 className="text-3xl font-bold text-white mb-4">Calling you now...</h3>
                        <p className="text-gray-400 text-lg max-w-sm mb-8">
                            Please answer your phone. The agent is initializing its knowledge graph with your instructions.
                        </p>

                        <button
                            onClick={() => setStatus('idle')}
                            className="text-sm text-gray-500 hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Cancel or try another number
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleCallMe} className="flex flex-col gap-8">

                        {/* Step 1 */}
                        <div className="flex flex-col border border-white/5 bg-black/40 p-6 rounded-2xl relative">
                            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                1
                            </div>
                            <label htmlFor="policy" className="text-lg font-semibold text-white mb-2 ml-4">
                                What should the agent know?
                            </label>
                            <p className="text-sm text-gray-400 mb-4 ml-4">
                                Paste your company policy, FAQs, or a specific persona you want the agent to adopt.
                            </p>
                            <textarea
                                id="policy"
                                value={policy}
                                onChange={(e) => setPolicy(e.target.value)}
                                required
                                rows={6}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-mono text-sm leading-relaxed"
                                placeholder="E.g. You are a customer support agent for Acme Corp..."
                            ></textarea>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col border border-white/5 bg-black/40 p-6 rounded-2xl relative">
                            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                2
                            </div>
                            <label htmlFor="phone" className="text-lg font-semibold text-white mb-2 ml-4">
                                What number should we call?
                            </label>
                            <p className="text-sm text-gray-400 mb-4 ml-4">
                                Enter your real phone number including the country code (e.g. +1).
                            </p>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-lg tracking-wide placeholder:text-gray-600"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        {errorMessage && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-5 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>

                            {status === 'loading' ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.08-7.076-6.975l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                    <span className="relative z-10">Call Me Now</span>
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-2">
                            By clicking "Call Me Now", you agree to receive an automated phone call from OmniVoice Labs for demonstration purposes.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
