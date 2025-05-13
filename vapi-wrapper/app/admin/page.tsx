"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";

type User = {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  lastLogin: string | null;
  loginCountToday: number;
};

type PhoneNumber = {
  id: string;
  ownerId: string | null;
  vapiId: string;
  phoneNumber: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
};

type Assistant = {
  id: string;
  ownerId: string | null;
  phoneNumberId: string | null;
  vapiId: string;
  name: string;
  systemPrompt: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'assistants' | 'phoneNumbers'>('users');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.isAdmin) {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const usersResponse = await axios.get('/api/admin/login-history');
        const phoneNumbersResponse = await axios.get('/api/admin/phone-numbers');
        const assistantsResponse = await axios.get('/api/admin/assistants');
        
        setUsers(usersResponse.data);
        setPhoneNumbers(phoneNumbersResponse.data);
        setAssistants(assistantsResponse.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  const assignPhoneNumber = async (phoneNumberId: string, userId: string) => {
    try {
      await axios.post('/api/admin/assign-phone-number', { phoneNumberId, userId });
      // Refresh data
      const response = await axios.get('/api/admin/phone-numbers');
      setPhoneNumbers(response.data);
    } catch (error) {
      console.error('Error assigning phone number:', error);
    }
  };

  const assignAssistant = async (assistantId: string, userId: string) => {
    try {
      await axios.post('/api/admin/assign-assistant', { assistantId, userId });
      // Refresh data
      const response = await axios.get('/api/admin/assistants');
      setAssistants(response.data);
    } catch (error) {
      console.error('Error assigning assistant:', error);
    }
  };

  const toggleDeletePhoneNumber = async (phoneNumberId: string, isDeleted: boolean) => {
    try {
      await axios.post('/api/admin/toggle-phone-number', { phoneNumberId, isDeleted: !isDeleted });
      // Refresh data
      const response = await axios.get('/api/admin/phone-numbers');
      setPhoneNumbers(response.data);
    } catch (error) {
      console.error('Error toggling phone number status:', error);
    }
  };

  const toggleDeleteAssistant = async (assistantId: string, isDeleted: boolean) => {
    try {
      await axios.post('/api/admin/toggle-assistant', { assistantId, isDeleted: !isDeleted });
      // Refresh data
      const response = await axios.get('/api/admin/assistants');
      setAssistants(response.data);
    } catch (error) {
      console.error('Error toggling assistant status:', error);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-md bg-red-50 text-red-700 border border-red-100 mb-4">
            <svg className="animate-spin h-5 w-5 mr-3 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Loading Admin Dashboard...</span>
          </div>
          <p className="text-gray-500 text-sm">Please wait while we load the admin interface</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Admin Mode
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'assistants' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('assistants')}
          >
            Assistants
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'phoneNumbers' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('phoneNumbers')}
          >
            Phone Numbers
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="border-b px-4 py-2 text-left">ID</th>
                  <th className="border-b px-4 py-2 text-left">Email</th>
                  <th className="border-b px-4 py-2 text-left">Created At</th>
                  <th className="border-b px-4 py-2 text-left">Last Login</th>
                  <th className="border-b px-4 py-2 text-left">Logins Today</th>
                  <th className="border-b px-4 py-2 text-left">Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="border-b px-4 py-2">{user.id}</td>
                    <td className="border-b px-4 py-2">{user.email}</td>
                    <td className="border-b px-4 py-2">{new Date(user.createdAt).toLocaleString()}</td>
                    <td className="border-b px-4 py-2">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="border-b px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.loginCountToday > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.loginCountToday}
                      </span>
                    </td>
                    <td className="border-b px-4 py-2">{user.isAdmin ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assistants' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Assistants</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="border-b px-4 py-2 text-left">ID</th>
                  <th className="border-b px-4 py-2 text-left">Name</th>
                  <th className="border-b px-4 py-2 text-left">Owner</th>
                  <th className="border-b px-4 py-2 text-left">Phone Number</th>
                  <th className="border-b px-4 py-2 text-left">Status</th>
                  <th className="border-b px-4 py-2 text-left">Created At</th>
                  <th className="border-b px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assistants.map((assistant) => (
                  <tr key={assistant.id} className={assistant.isDeleted ? "bg-red-100" : ""}>
                    <td className="border-b px-4 py-2">{assistant.id}</td>
                    <td className="border-b px-4 py-2">{assistant.name}</td>
                    <td className="border-b px-4 py-2">
                      {assistant.ownerId ? users.find(u => u.id === assistant.ownerId)?.email || assistant.ownerId : 'Unassigned'}
                      {!assistant.ownerId && (
                        <select 
                          className="ml-2 border rounded p-1"
                          onChange={(e) => assignAssistant(assistant.id, e.target.value)}
                        >
                          <option value="">Assign to user</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.email}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="border-b px-4 py-2">
                      {assistant.phoneNumberId ? 
                        phoneNumbers.find(p => p.id === assistant.phoneNumberId)?.phoneNumber || assistant.phoneNumberId 
                        : 'None'}
                    </td>
                    <td className="border-b px-4 py-2">
                      {assistant.isDeleted ? 'Deleted' : (assistant.isActive ? 'Active' : 'Inactive')}
                    </td>
                    <td className="border-b px-4 py-2">{new Date(assistant.createdAt).toLocaleString()}</td>
                    <td className="border-b px-4 py-2">
                      <button 
                        className={`px-3 py-1 rounded ${assistant.isDeleted ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                        onClick={() => toggleDeleteAssistant(assistant.id, assistant.isDeleted)}
                      >
                        {assistant.isDeleted ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'phoneNumbers' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Phone Numbers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="border-b px-4 py-2 text-left">ID</th>
                  <th className="border-b px-4 py-2 text-left">Phone Number</th>
                  <th className="border-b px-4 py-2 text-left">Owner</th>
                  <th className="border-b px-4 py-2 text-left">Status</th>
                  <th className="border-b px-4 py-2 text-left">Created At</th>
                  <th className="border-b px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {phoneNumbers.map((phone) => (
                  <tr key={phone.id} className={phone.isDeleted ? "bg-red-100" : ""}>
                    <td className="border-b px-4 py-2">{phone.id}</td>
                    <td className="border-b px-4 py-2">{phone.phoneNumber || phone.vapiId}</td>
                    <td className="border-b px-4 py-2">
                      {phone.ownerId ? users.find(u => u.id === phone.ownerId)?.email || phone.ownerId : 'Unassigned'}
                      {!phone.ownerId && (
                        <select 
                          className="ml-2 border rounded p-1"
                          onChange={(e) => assignPhoneNumber(phone.id, e.target.value)}
                        >
                          <option value="">Assign to user</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.email}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="border-b px-4 py-2">
                      {phone.isDeleted ? 'Deleted' : (phone.isActive ? 'Active' : 'Inactive')}
                    </td>
                    <td className="border-b px-4 py-2">{new Date(phone.createdAt).toLocaleString()}</td>
                    <td className="border-b px-4 py-2">
                      <button 
                        className={`px-3 py-1 rounded ${phone.isDeleted ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                        onClick={() => toggleDeletePhoneNumber(phone.id, phone.isDeleted)}
                      >
                        {phone.isDeleted ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 