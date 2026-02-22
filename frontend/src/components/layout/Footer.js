import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/50 mt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                O
                            </div>
                            <span className="text-lg font-bold tracking-tight text-white">
                                OmniVoice <span className="text-gray-400 font-normal">Labs</span>
                            </span>
                        </Link>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Next-generation conversational AI agents that actually sound human and understand context.
                        </p>
                    </div>

                    {/* Links 1 */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
                        <ul className="space-y-3">
                            <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/try-for-free" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">Try for Free</Link></li>
                        </ul>
                    </div>

                    {/* Links 2 */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
                        <ul className="space-y-3">
                            <li><Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="/admin/login" className="text-sm text-gray-400 hover:text-white transition-colors">Admin Dashboard</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-600">
                        &copy; {new Date().getFullYear()} OmniVoice Labs. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        {/* Social Icons Placeholders */}
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
