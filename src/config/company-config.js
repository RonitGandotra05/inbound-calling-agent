/**
 * Dynamic Company Configuration
 * Replaces the hardcoded company.js with database-driven config
 */

const { query } = require('../lib/db');

// Cache for company configs (with TTL)
const companyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get company config by phone number (for incoming calls)
 * @param {string} phoneNumber - Twilio phone number receiving the call
 * @returns {Promise<Object|null>} Company config or null
 */
async function getCompanyByPhone(phoneNumber) {
    const cacheKey = `phone:${phoneNumber}`;

    // Check cache
    const cached = companyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const result = await query(
            `SELECT 
        c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'pricing', s.pricing,
          'duration_minutes', s.duration_minutes,
          'is_bookable', s.is_bookable
        )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM companies c
      LEFT JOIN company_services s ON s.company_id = c.id AND s.is_active = true
      WHERE c.phone_number = $1 AND c.is_active = true
      GROUP BY c.id`,
            [phoneNumber]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const company = formatCompanyConfig(result.rows[0]);

        // Cache result
        companyCache.set(cacheKey, { data: company, timestamp: Date.now() });

        return company;
    } catch (error) {
        console.error('Error fetching company by phone:', error);
        return null;
    }
}

/**
 * Get company config by ID
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Object|null>} Company config or null
 */
async function getCompanyById(companyId) {
    const cacheKey = `id:${companyId}`;

    // Check cache
    const cached = companyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const result = await query(
            `SELECT 
        c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'pricing', s.pricing,
          'duration_minutes', s.duration_minutes,
          'is_bookable', s.is_bookable
        )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM companies c
      LEFT JOIN company_services s ON s.company_id = c.id AND s.is_active = true
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id`,
            [companyId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const company = formatCompanyConfig(result.rows[0]);

        // Cache result
        companyCache.set(cacheKey, { data: company, timestamp: Date.now() });

        return company;
    } catch (error) {
        console.error('Error fetching company by ID:', error);
        return null;
    }
}

/**
 * Get company by slug (for dashboard URLs)
 * @param {string} slug - URL-friendly company identifier
 * @returns {Promise<Object|null>} Company config or null
 */
async function getCompanyBySlug(slug) {
    try {
        const result = await query(
            `SELECT 
        c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'pricing', s.pricing,
          'duration_minutes', s.duration_minutes,
          'is_bookable', s.is_bookable
        )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM companies c
      LEFT JOIN company_services s ON s.company_id = c.id AND s.is_active = true
      WHERE c.slug = $1 AND c.is_active = true
      GROUP BY c.id`,
            [slug]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return formatCompanyConfig(result.rows[0]);
    } catch (error) {
        console.error('Error fetching company by slug:', error);
        return null;
    }
}

/**
 * Format raw database row into consistent config object
 */
function formatCompanyConfig(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        phoneNumber: row.phone_number,
        greeting: row.greeting,
        fallbackMessage: row.fallback_message,
        timezone: row.timezone,
        businessHours: row.business_hours,
        contactInfo: {
            email: row.contact_email,
            phone: row.contact_phone
        },
        services: row.services || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Clear cache for a specific company (call after updates)
 */
function invalidateCompanyCache(companyId, phoneNumber = null) {
    companyCache.delete(`id:${companyId}`);
    if (phoneNumber) {
        companyCache.delete(`phone:${phoneNumber}`);
    }
}

/**
 * Clear entire cache
 */
function clearCompanyCache() {
    companyCache.clear();
}

/**
 * Generate system prompt context from company config
 * This is used by agents to understand the company they're representing
 */
function generateCompanyContext(company) {
    const serviceList = company.services.length > 0
        ? company.services.map(s => s.name).join(', ')
        : 'various services';

    const businessHours = company.businessHours;
    const hoursText = businessHours
        ? `Weekdays: ${businessHours.weekdays?.open || '9:00'} - ${businessHours.weekdays?.close || '17:00'}, Weekends: ${businessHours.weekend?.open || 'Closed'} - ${businessHours.weekend?.close || ''}`
        : 'Standard business hours';

    return {
        companyName: company.name,
        greeting: company.greeting,
        fallbackMessage: company.fallbackMessage,
        services: serviceList,
        businessHours: hoursText,
        contactEmail: company.contactInfo?.email || '',
        contactPhone: company.contactInfo?.phone || '',
        timezone: company.timezone
    };
}

module.exports = {
    getCompanyByPhone,
    getCompanyById,
    getCompanyBySlug,
    invalidateCompanyCache,
    clearCompanyCache,
    generateCompanyContext
};
