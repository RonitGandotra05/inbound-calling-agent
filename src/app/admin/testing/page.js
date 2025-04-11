"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState('audio-test');
  const [tables, setTables] = useState({
    conversations: [],
    complaints: [],
    bookings: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [response, setResponse] = useState(null);
  const [transcription, setTranscription] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Fetch all tables data
    fetchTablesData(token);
  }, [router]);

  const fetchTablesData = async (token) => {
    try {
      setLoading(true);
      const [conversationsRes, complaintsRes, usersRes] = await Promise.all([
        fetch('/api/admin/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/complaints', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (conversationsRes.status === 401 || complaintsRes.status === 401 || 
          usersRes.status === 401) {
        localStorage.removeItem('authToken');
        router.push('/admin/login');
        return;
      }

      if (!conversationsRes.ok || !complaintsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch table data');
      }

      const [conversations, complaints, users] = await Promise.all([
        conversationsRes.json(),
        complaintsRes.json(),
        usersRes.json()
      ]);

      setTables({
        conversations,
        complaints,
        users,
        bookings: []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);

        // Convert audio to base64 and send to API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          setResponse(null); // Clear previous response
          setTranscription('Processing audio...'); // Indicate processing
          setError(''); // Clear previous errors
          
          try {
            const apiResponse = await fetch('/api/voice-chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                audio_data: base64Audio,
                phone_number: 'test-phone',
                audio_enabled: true, // Assuming audio response desired
                is_new_chat: true
              })
            });

            if (apiResponse.status === 401) {
              localStorage.removeItem('authToken');
              router.push('/admin/login');
              return;
            }

            const data = await apiResponse.json();
            
            // Update transcription state FIRST
            if (data.transcription && data.transcription.text) {
              setTranscription(data.transcription.text);
            } else {
              setTranscription('Transcription not available.');
            }

            if (!apiResponse.ok) {
              throw new Error(data.error || `API Error: ${apiResponse.status}`);
            }

            // Set the response state (which might be an object)
            setResponse(data); // Store the whole object

          } catch (err) {
            console.error("Audio processing error:", err);
            setError(err.message);
            setTranscription('Error during processing.'); // Update transcription state on error
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Stop recording after 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      }, 5000);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  const renderTable = (data, columns) => {
    if (!data || data.length === 0) {
      return <p className="text-gray-400">No data available</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Define columns based on actual data from API and schema
  const conversationsColumns = [
    { key: 'conversation_id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'query_type', label: 'Type' },
    { key: 'service', label: 'Service' },
    { key: 'source_id', label: 'Source ID' },
    { key: 'interaction_date', label: 'Date' },
    { key: 'summary', label: 'Summary' },
    { key: 'transcript', label: 'Transcript' },
  ];

  const complaintsColumns = [
    { key: 'complaint_id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'service', label: 'Service' },
    { key: 'date_of_complaint', label: 'Date' },
    { key: 'summary', label: 'Summary' },
    { key: 'transcript', label: 'Transcript' },
  ];

  const bookingsColumns = [
    { key: 'booking_id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'service_required', label: 'Service' },
    { key: 'date_of_booking', label: 'Booking Date' },
    { key: 'date_of_appointment', label: 'Appt. Date' },
    { key: 'time', label: 'Appt. Time' },
    { key: 'transcript', label: 'Transcript' },
  ];

  const usersColumns = [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'is_admin', label: 'Admin?' },
    { key: 'is_active', label: 'Active?' },
    { key: 'login_count', label: 'Logins' },
    { key: 'last_login', label: 'Last Login' },
    { key: 'created_at', label: 'Created' },
    { key: 'updated_at', label: 'Updated' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">Testing Interface</h1>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('audio-test')}
                className={`${
                  activeTab === 'audio-test'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Audio Testing
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`${
                  activeTab === 'conversations'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Conversations
              </button>
              <button
                onClick={() => setActiveTab('complaints')}
                className={`${
                  activeTab === 'complaints'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Complaints
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`${
                  activeTab === 'bookings'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Bookings
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Users
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'audio-test' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Audio Testing</h2>
              <button
                onClick={startRecording}
                disabled={isRecording}
                className={`px-4 py-2 rounded-lg ${
                  isRecording
                    ? 'bg-red-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>

              <div className="mt-8 space-y-4">
                {transcription && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-400 mb-2">Transcription:</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{transcription}</p>
                  </div>
                )}
                {audioUrl && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-400 mb-2">Recorded Audio:</h3>
                    <audio controls src={audioUrl} className="w-full" />
                  </div>
                )}
                {response && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-400 mb-2">Agent Response:</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {typeof response === 'object' && response !== null && response.response 
                        ? response.response 
                        : typeof response === 'string' 
                        ? response
                        : 'No text response received.'}
                    </p>
                    {typeof response === 'object' && response !== null && response.audio_url && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-indigo-500 mb-1 text-sm">Response Audio:</h4>
                        <audio controls src={response.audio_url} className="w-full" />
                      </div>
                    )}
                    {typeof response === 'object' && response !== null && response.errors && (
                       <div className="mt-4 p-3 rounded bg-red-900/50 border border-red-500/30">
                         <h4 className="font-semibold text-red-400 mb-1 text-sm">Errors:</h4>
                         <pre className="text-red-300 text-xs whitespace-pre-wrap">
                           {JSON.stringify(response.errors, null, 2)}
                         </pre>
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Conversations</h2>
            {renderTable(tables.conversations, conversationsColumns)}
          </div>
        )}

        {activeTab === 'complaints' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Complaints</h2>
            {renderTable(tables.complaints, complaintsColumns)}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Bookings</h2>
            {renderTable(tables.bookings, bookingsColumns)}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Users</h2>
            {renderTable(tables.users, usersColumns)}
          </div>
        )}
      </div>
    </div>
  );
} 