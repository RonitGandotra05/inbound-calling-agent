"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

// Type definitions
interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export default function SlotsPage() {
  const params = useParams();
  const router = useRouter();
  const assistantId = params.assistantId as string;
  
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Fetch slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await axios.get("/api/slots");
        setSlots(response.data);
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSlots();
  }, []);
  
  // Generate new slots
  const generateSlots = async () => {
    try {
      setGenerating(true);
      await axios.post("/api/slots/generate");
      // Refetch slots
      const response = await axios.get("/api/slots");
      setSlots(response.data);
      alert("Slots generated successfully!");
    } catch (error) {
      console.error("Error generating slots:", error);
      alert("Failed to generate slots");
    } finally {
      setGenerating(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };
  
  // Group slots by date
  const groupSlotsByDate = () => {
    const groups: { [key: string]: Slot[] } = {};
    
    slots.forEach(slot => {
      const date = new Date(slot.startTime).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(slot);
    });
    
    return groups;
  };
  
  if (loading) {
    return <div className="p-8">Loading...</div>;
  }
  
  const groupedSlots = groupSlotsByDate();
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Availability Slots</h1>
        <div className="space-x-4">
          <Link href={`/dashboard/${assistantId}`} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Back to Dashboard
          </Link>
          <button
            onClick={generateSlots}
            disabled={generating}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
          >
            {generating ? "Generating..." : "Generate New Slots"}
          </button>
        </div>
      </div>
      
      {Object.keys(groupedSlots).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">No availability slots found</p>
          <button
            onClick={generateSlots}
            disabled={generating}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {generating ? "Generating..." : "Generate Slots"}
          </button>
        </div>
      ) : (
        Object.entries(groupedSlots).map(([date, daySlots]) => (
          <div key={date} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{date}</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {daySlots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(slot.startTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(slot.endTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          slot.isBooked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}>
                          {slot.isBooked ? "Booked" : "Available"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
} 