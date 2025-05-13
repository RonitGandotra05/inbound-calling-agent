"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

type Assistant = {
  id: string;
  vapiId: string;
  name: string;
  phoneNumberId: string | null;
  phoneNumber: string | null;
  systemPrompt: string | null;
  isActive: boolean;
  createdAt: string;
};

type PhoneNumber = {
  id: string;
  vapiId: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assistants' | 'phoneNumbers'>('assistants');
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/");
      return;
    }

    // If user is an admin, redirect to admin dashboard
    if (session.isAdmin) {
      router.push("/admin");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const assistantsResponse = await axios.get('/api/assistants');
        const phoneNumbersResponse = await axios.get('/api/phone-numbers');
        
        setAssistants(assistantsResponse.data);
        setPhoneNumbers(phoneNumbersResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  const createAssistant = async () => {
    setIsCreatingAssistant(true);
    setFormError(null);
    
    try {
      const response = await axios.post('/api/assistants', {});
      
      setAssistants([...assistants, response.data]);
    } catch (error) {
      console.error('Error creating assistant:', error);
      setFormError('Failed to create assistant. Please try again.');
    } finally {
      setIsCreatingAssistant(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-100 mb-4">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Loading your dashboard...</span>
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
          <p className="text-sm text-gray-500 mt-1">Welcome back!</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Main Menu
          </div>
          <button
            onClick={() => setActiveTab('assistants')}
            className={`w-full flex items-center px-4 py-3 ${activeTab === 'assistants' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            My Assistants
          </button>
          <button
            onClick={() => setActiveTab('phoneNumbers')}
            className={`w-full flex items-center px-4 py-3 ${activeTab === 'phoneNumbers' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Phone Numbers
          </button>
        </nav>
        
        <div className="px-4 mt-8 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
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
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'assistants' ? 'My Assistants' : 'Phone Numbers'}
            </h2>
            
            {activeTab === 'assistants' && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-colors"
                onClick={createAssistant}
                disabled={isCreatingAssistant}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isCreatingAssistant ? 'Creating...' : 'Create New Assistant'}
              </button>
            )}
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formError}
            </div>
          )}

          {activeTab === 'assistants' && (
            <div>
              {assistants.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No assistants yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">Create your first assistant to start managing calls and appointments.</p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
                    onClick={createAssistant}
                    disabled={isCreatingAssistant}
                  >
                    {isCreatingAssistant ? 'Creating...' : 'Create Your First Assistant'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assistants.map((assistant) => (
                    <div key={assistant.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-lg text-gray-800 truncate">{assistant.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${assistant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {assistant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Created: {new Date(assistant.createdAt).toLocaleDateString()}</p>
                        {assistant.phoneNumber && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Phone:</span> {assistant.phoneNumber}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {assistant.systemPrompt || "No system prompt set"}
                        </p>
                        <Link 
                          href={`/dashboard/${assistant.id}`}
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Manage Assistant
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'phoneNumbers' && (
            <div>
              {phoneNumbers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No phone numbers available</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Phone numbers are automatically created when you create a new assistant. 
                    Create an assistant to get your first phone number.
                  </p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
                    onClick={() => setActiveTab('assistants')}
                  >
                    Go to Assistants
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Associated With</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {phoneNumbers.map((phone) => {
                          // Find assistant using this phone number
                          const associatedAssistant = assistants.find(
                            assistant => assistant.phoneNumberId === phone.id
                          );
                          
                          return (
                            <tr key={phone.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phone.id.substring(0, 8)}...</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{phone.phoneNumber || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${phone.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {phone.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(phone.createdAt).toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {associatedAssistant ? (
                                  <Link href={`/dashboard/${associatedAssistant.id}`} className="text-blue-600 hover:text-blue-800">
                                    {associatedAssistant.name}
                                  </Link>
                                ) : (
                                  'Not assigned'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Phone Number Management</span>
                </div>
                <p>Phone numbers are automatically created when you create new assistants. Each assistant requires its own phone number to receive calls.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 