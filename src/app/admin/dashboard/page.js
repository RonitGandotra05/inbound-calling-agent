"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    complaints: 0,
    bookings: 0,
    inquiries: 0,
    feedback: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated - try localStorage first, then cookies for SSR environments
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Clear both cookie and localStorage on authentication failure
            localStorage.removeItem('authToken');
            router.push('/admin/login');
            return;
          }
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="text-xl text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <nav className="backdrop-blur-sm bg-black/30 border-b border-gray-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-md hover:from-red-600 hover:to-red-800 transform hover:scale-105 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Calls" value={stats.totalCalls} bgGradient="from-blue-600 to-blue-900" />
          <StatCard title="Complaints" value={stats.complaints} bgGradient="from-red-600 to-red-900" />
          <StatCard title="Bookings" value={stats.bookings} bgGradient="from-green-600 to-green-900" />
          <StatCard title="Inquiries" value={stats.inquiries} bgGradient="from-yellow-600 to-yellow-900" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard 
            title="Recent Conversations" 
            link="/admin/conversations"
            linkText="View All Conversations"
          >
            <p className="text-gray-300">View and manage all recent customer conversations</p>
          </SectionCard>
          
          <SectionCard 
            title="Bookings Management" 
            link="/admin/bookings"
            linkText="Manage Bookings"
          >
            <p className="text-gray-300">Review and manage customer appointment bookings</p>
          </SectionCard>
          
          <SectionCard 
            title="Complaints" 
            link="/admin/complaints"
            linkText="View Complaints"
          >
            <p className="text-gray-300">Address customer complaints and issues</p>
          </SectionCard>
          
          <SectionCard 
            title="User Management" 
            link="/admin/users"
            linkText="Manage Users"
          >
            <p className="text-gray-300">Add, edit, or remove admin users</p>
          </SectionCard>
          
          <SectionCard 
            title="Testing Interface" 
            link="/admin/testing"
            linkText="Open Testing Tools"
          >
            <p className="text-gray-300">Test voice interactions and view database records</p>
          </SectionCard>
        </div>
        
        <div className="mt-10 text-center">
          <div className="inline-block py-1.5 px-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-full text-gray-300 text-xs font-medium shadow-inner border border-gray-700">
            Admin Portal
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, bgGradient }) {
  return (
    <div className={`rounded-lg shadow-lg bg-gradient-to-b ${bgGradient} text-white p-6 border border-gray-700 backdrop-blur-sm hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function SectionCard({ title, children, link, linkText }) {
  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all transform hover:-translate-y-1 duration-300">
      <h2 className="text-xl font-semibold mb-2 text-white">{title}</h2>
      <div className="h-1 w-16 my-3 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full"></div>
      <div className="mb-4">
        {children}
      </div>
      <Link 
        href={link} 
        className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300"
      >
        {linkText}
      </Link>
    </div>
  );
} 