"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditUserPage({ params }) {
  const { id } = params;
  const [user, setUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    isAdmin: false,
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Fetch user data
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('authToken');
            router.push('/admin/login');
            return;
          }
          
          if (response.status === 404) {
            throw new Error('User not found');
          }
          
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        setUser({
          email: data.email,
          password: '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phoneNumber: data.phone_number || '',
          isAdmin: data.is_admin || false,
          isActive: data.is_active || true
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, router]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUser({
      ...user,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password || undefined, // Only include if not empty
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          isAdmin: user.isAdmin,
          isActive: user.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      // Clear password field and show success message
      setUser({
        ...user,
        password: ''
      });
      setSuccess('User updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Edit User</h1>
            </div>
            <div className="flex items-center">
              <Link 
                href="/admin/users"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}

        <div className="bg-white p-6 rounded-md shadow-md">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={user.email}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  name="password"
                  value={user.password}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={user.firstName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={user.lastName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={user.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center space-x-4 mt-7">
                <div>
                  <input
                    type="checkbox"
                    id="isAdmin"
                    name="isAdmin"
                    checked={user.isAdmin}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700">
                    Admin Privileges
                  </label>
                </div>
                
                <div>
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={user.isActive}
                    onChange={handleInputChange}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update User
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 