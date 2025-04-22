import { NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { pool } from '../../../../lib/db';

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Get conversations from complaints, bookings, inquiries, and feedback tables
      const result = await client.query(`
        (SELECT 
          complaint_id as id,
          'complaint' as type,
          customer_name,
          phone_number,
          date_of_complaint as interaction_date,
          complaint_id as source_id,
          service,
          summary,
          transcript
        FROM complaints)
        UNION ALL
        (SELECT 
          booking_id as id,
          'booking' as type,
          customer_name,
          phone_number,
          date_of_booking as interaction_date,
          booking_id as source_id,
          service_required as service,
          '' as summary,
          transcript
        FROM bookings)
        UNION ALL
        (SELECT 
          enquiry_id as id,
          'inquiry' as type,
          customer_name,
          phone_number,
          date_of_enquiry as interaction_date,
          enquiry_id as source_id,
          service_name as service,
          '' as summary,
          transcript
        FROM inquiry)
        UNION ALL
        (SELECT 
          feedback_id as id,
          'feedback' as type,
          customer_name,
          phone_number,
          date_of_feedback as interaction_date,
          feedback_id as source_id,
          service_name as service,
          summary,
          transcript
        FROM feedback)
        ORDER BY interaction_date DESC
        LIMIT 100
      `);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
} 