import { NextResponse } from 'next/server';
import * as db from '../../../../lib/db';
import { compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    console.log("Login attempt email:", email);
    
    // Find user in database
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    const user = result.rows[0];
    console.log("User found in database:", !!user);
    
    // If user doesn't exist
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    try {
      console.log("Verifying password...");
      const isValidUser = await compare(password, user.password);
      console.log("Password valid:", isValidUser);
      
      if (!isValidUser) {
        return NextResponse.json(
          { message: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // Update last login time
      try {
        await db.query(
          `UPDATE users SET 
           last_login = NOW() AT TIME ZONE 'Asia/Kolkata', 
           login_count = login_count + 1 
           WHERE email = $1`,
          [email]
        );
      } catch (updateError) {
        console.error('Error updating last login:', updateError);
        // Continue with login process even if update fails
      }
      
      // Create a session token
      const token = sign(
        { 
          id: user.id,
          email: user.email,
          isAdmin: user.is_admin 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create the success response first
      const response = NextResponse.json({ 
        success: true,
        token: token
      });

      // Set the cookie on the response object
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      });

      // Return the response with the cookie attached
      return response;
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 