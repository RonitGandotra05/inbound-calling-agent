'use client';

import { useState } from 'react';

export default function ContactPage() {
    const [formState, setFormState] = useState('idle'); // 'idle', 'loading', 'success', 'error'

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormState('loading');

        // Simulate API call
        setTimeout(() => {
            setFormState('success');
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center pt-20 pb-32 px-4 w-full relative">
            <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] -z-10"></div>

            <div className="max-w-xl w-full text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Get in touch.</h1>
                <p className="text-gray-400 text-lg">
                    Whether you need a custom enterprise deployment or just have a question about our models, we're here to help.
                </p>
            </div>

            <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-xl border border-white/10 relative overflow-hidden">
                {formState === 'success' ? (
                    <div className="text-center py-16 animate-fade-in-up">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Message Sent</h3>
                        <p className="text-gray-400 mb-8">We'll get back to you within 24 hours.</p>
                        <button
                            onClick={() => setFormState('idle')}
                            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-medium"
                        >
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="name" className="text-sm font-medium text-gray-300">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-gray-600"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="company" className="text-sm font-medium text-gray-300">Company</label>
                                <input
                                    type="text"
                                    id="company"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-gray-600"
                                    placeholder="Acme Inc."
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-300">Work Email</label>
                            <input
                                type="email"
                                id="email"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-gray-600"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="message" className="text-sm font-medium text-gray-300">How can we help?</label>
                            <textarea
                                id="message"
                                required
                                rows={4}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-gray-600 resize-none"
                                placeholder="Tell us about your use case..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={formState === 'loading'}
                            className="w-full py-4 mt-2 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:opacity-50 flex items-center justify-center"
                        >
                            {formState === 'loading' ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Send Message'}
                        </button>
                    </form>
                )}
            </div>

            <div className="mt-16 flex flex-col md:flex-row gap-8 text-center text-sm text-gray-400">
                <div>
                    <span className="block font-semibold text-white mb-1">Email us directly</span>
                    hello@omnovoicelabs.com
                </div>
                <div className="hidden md:block w-px bg-white/10"></div>
                <div>
                    <span className="block font-semibold text-white mb-1">Global Headquarters</span>
                    San Francisco, CA
                </div>
            </div>
        </div>
    );
}
