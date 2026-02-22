'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect for glassmorphism
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Features', path: '/#features' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'Contact', path: '/contact' },
    ];

    return (
        <header
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">
                        O
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">
                        OmniVoice <span className="text-gray-400 font-normal">Labs</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.path}
                            className={`text-sm font-medium transition-colors hover:text-white ${pathname === link.path ? 'text-white' : 'text-gray-400'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Action Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/admin/login"
                        className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/try-for-free"
                        className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all w-[130px] text-center"
                    >
                        Try for Free
                    </Link>
                </div>

                {/* Mobile Menu Button (simplified for now) */}
                <div className="md:hidden flex items-center">
                    <button className="text-gray-300 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
