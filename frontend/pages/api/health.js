import { query, pool } from '../../src/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check database connection
    const dbStatus = await checkDatabase();
    
    // Check API dependencies
    const dependencies = await checkDependencies();
    
    // Get basic system info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Determine overall status
    const status = determineStatus(dbStatus, dependencies);
    
    return res.status(200).json({
      status,
      systemInfo,
      database: dbStatus,
      dependencies
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
}

async function checkDatabase() {
  try {
    // Simple query to verify database connection
    await query('SELECT 1 as result', []);
    return { status: 'OK', latency: null };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'ERROR', error: error.message };
  }
}

async function checkDependencies() {
  const dependencies = {
    openai: { status: 'UNKNOWN' },
    twilio: { status: 'UNKNOWN' }
  };

  // Check OpenAI connection if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      // Simple validation - just checking if the key is present
      dependencies.openai.status = 'OK';
    } catch (error) {
      dependencies.openai.status = 'ERROR';
      dependencies.openai.error = error.message;
    }
  } else {
    dependencies.openai.status = 'ERROR';
    dependencies.openai.error = 'API key not configured';
  }

  // Check Twilio connection if credentials are available
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_PHONE_NUMBER) {
    try {
      // Simple validation - just checking if the credentials are present
      dependencies.twilio.status = 'OK';
    } catch (error) {
      dependencies.twilio.status = 'ERROR';
      dependencies.twilio.error = error.message;
    }
  } else {
    dependencies.twilio.status = 'ERROR';
    dependencies.twilio.error = 'Twilio credentials not configured';
  }

  return dependencies;
}

function determineStatus(dbStatus, dependencies) {
  // If any critical component is down, system is in ERROR state
  if (dbStatus.status === 'ERROR') {
    return 'ERROR';
  }
  
  // If all dependencies are OK, system is OK
  if (dependencies.openai.status === 'OK' && dependencies.twilio.status === 'OK') {
    return 'OK';
  }
  
  // Otherwise, we're in a degraded/warning state
  return 'WARNING';
} 