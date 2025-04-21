import { NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { pool } from '../../../../lib/db';

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyAuthToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          f.feedback_id,
          f.customer_name,
          f.phone_number,
          f.rating,
          f.comments,
          f.feedback_type,
          f.created_at,
          f.agent_id
        FROM feedback f
        ORDER BY f.created_at DESC
        LIMIT 100
      `);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
} 