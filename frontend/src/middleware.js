import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { query } from './lib/db';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Define protected routes
  const isAdminRoute = path.startsWith('/admin') && !path.includes('/admin/login');
  const isApiRoute = path.startsWith('/api') && 
                    !path.includes('/api/auth/login') && 
                    !path.includes('/api/health');
  
  // Skip authentication for non-protected routes
  if (!isAdminRoute && !isApiRoute) {
    return NextResponse.next();
  }
  
  const token = request.cookies.get('auth_token')?.value;
  
  // If no token is found, redirect to login or return unauthorized
  if (!token) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  
  try {
    // Verify the token
    const decoded = verify(token, process.env.JWT_SECRET);
    
    // Allow admins to access all routes
    if (decoded.isAdmin) {
      // Update last login time for admins (only on admin routes to reduce DB load)
      if (isAdminRoute) {
        try {
          await query(
            `UPDATE users SET 
             last_login = NOW() AT TIME ZONE 'Asia/Kolkata', 
             login_count = login_count + 1 
             WHERE email = $1`,
            [decoded.email]
          );
        } catch (error) {
          console.error('Error updating last login:', error);
        }
      }
      
      return NextResponse.next();
    }
    
    // For regular users, only allow specific API endpoints
    // Add any additional API route permissions here
    if (isApiRoute) {
      // Implement specific API permissions for regular users here
      // ...
      
      // For now, only allow admins to access API routes
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Don't allow regular users to access admin routes
    if (isAdminRoute) {
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required' },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  } catch (error) {
    // If token is invalid, redirect to login or return unauthorized
    console.error('Invalid token:', error);
    
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    return NextResponse.json(
      { error: 'Unauthorized - Invalid token' },
      { status: 401 }
    );
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}; 