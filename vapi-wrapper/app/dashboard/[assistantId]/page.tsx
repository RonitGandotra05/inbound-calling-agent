"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import axios from "axios";
import Link from "next/link";

// Type definitions
interface CallLog {
  id: string;
  fromNumber: string;
  toNumber: string;
  startedAt: string;
  endedAt: string | null;
  transcript: any;
  summary: string | null;
}

interface VapiAssistant {
  id: string;
  name: string;
  phoneNumber: string | null;
  systemPrompt: string | null;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const assistantId = params.assistantId as string;
  
  const [assistant, setAssistant] = useState<VapiAssistant | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'calls'>('details');
  
  // Fetch assistant data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assistant data
        const assistantRes = await axios.get(`/api/assistant/${assistantId}`);
        setAssistant(assistantRes.data);
        setSystemPrompt(assistantRes.data.systemPrompt || "");
        
        // Fetch call logs
        const logsRes = await axios.get(`/api/calls/${assistantId}`);
        setCallLogs(logsRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [assistantId]);
  
  // Update system prompt
  const updateSystemPrompt = async () => {
    try {
      setSaving(true);
      // Include the assistantId in the request
      await axios.put(`/api/assistant/${assistantId}`, { 
        systemPrompt,
        assistantId 
      });
      alert("System prompt updated successfully!");
    } catch (error) {
      console.error("Error updating system prompt:", error);
      alert("Failed to update system prompt");
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    // Clear browser cache for the current origin
    if (typeof window !== 'undefined' && window.caches) {
      const cacheKeys = await window.caches.keys();
      for (const key of cacheKeys) {
        await window.caches.delete(key);
      }
    }
    
    // Sign out and redirect to home page
    signOut({ callbackUrl: '/' });
  };
  
  // Handle navigation to dashboard with multiple fallbacks
  const handleBackToDashboard = () => {
    try {
      // Primary method: Use Next.js router
      router.push("/dashboard");
      
      // Fallback #1: If router fails, try direct navigation
      setTimeout(() => {
        if (window.location.pathname.includes("/assistantId")) {
          window.location.href = "/dashboard";
        }
      }, 100);
      
      // Fallback #2: Hard navigation after a delay
      setTimeout(() => {
        if (window.location.pathname.includes("/assistantId")) {
          window.location.replace("/dashboard");
        }
      }, 300);
    } catch (error) {
      console.error("Error navigating back:", error);
      // Last resort fallback
      window.open("/dashboard", "_self");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-100 mb-4">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Loading assistant data...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Vapi Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{assistant?.name || "Assistant"}</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Assistant Menu
          </div>
          <button
            onClick={() => setActiveTab('details')}
            className={`w-full flex items-center px-4 py-3 ${activeTab === 'details' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
            </svg>
            Assistant Details
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`w-full flex items-center px-4 py-3 ${activeTab === 'calls' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Logs
          </button>
          <Link 
            href={`/dashboard/${assistantId}/slots`}
            className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manage Slots
          </Link>
          <Link 
            href={`/dashboard/${assistantId}/bookings`}
            className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View Bookings
          </Link>
        </nav>
        
        <div className="mt-auto">
          <div className="px-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </div>
          <div className="flex flex-col">
            {/* Primary navigation button */}
            <button
              onClick={handleBackToDashboard} 
              className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v18" />
              </svg>
              Back to Dashboard
            </button>
            
            {/* Fallback link (always available) */}
            <Link 
              href="/dashboard"
              className="w-full flex items-center px-4 py-3 mt-1 bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Home Dashboard (Alt)
            </Link>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'details' ? 'Assistant Details' : 'Call Logs'}
            </h2>
          </div>

          {activeTab === 'details' && assistant && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Assistant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Assistant ID</p>
                    <p className="font-medium">{assistant.id}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                    <p className="font-medium">{assistant.phoneNumber || 'None assigned'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 mb-4">
                <h3 className="text-lg font-semibold mb-4">System Prompt</h3>
                <div className="mb-4">
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter system prompt for your assistant..."
                  />
                </div>
                
                <button 
                  onClick={updateSystemPrompt}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'calls' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Call History</h3>
              
              {callLogs.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">No Call Logs Yet</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    This assistant hasn't received any calls yet. When calls are made, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {callLogs.map((log) => {
                        const startTime = new Date(log.startedAt);
                        const endTime = log.endedAt ? new Date(log.endedAt) : null;
                        const duration = endTime 
                          ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
                          : "In progress";
                        
                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{log.fromNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{startTime.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {typeof duration === "number" ? `${duration} seconds` : duration}
                            </td>
                            <td className="px-6 py-4">{log.summary || "No summary available"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 