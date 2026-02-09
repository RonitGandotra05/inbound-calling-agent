import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * GET /api/companies - List all companies (admin only)
 * GET /api/companies?slug=xxx - Get company by slug
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const id = searchParams.get('id');

        let sql;
        let params = [];

        if (id) {
            sql = `
        SELECT 
          c.*,
          json_agg(DISTINCT jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'pricing', s.pricing,
            'duration_minutes', s.duration_minutes,
            'is_bookable', s.is_bookable
          )) FILTER (WHERE s.id IS NOT NULL) as services,
          (SELECT COUNT(*) FROM interactions WHERE company_id = c.id) as interaction_count,
          (SELECT COUNT(*) FROM knowledge_documents WHERE company_id = c.id AND status = 'indexed') as document_count
        FROM companies c
        LEFT JOIN company_services s ON s.company_id = c.id AND s.is_active = true
        WHERE c.id = $1
        GROUP BY c.id
      `;
            params = [id];
        } else if (slug) {
            sql = `
        SELECT 
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
        WHERE c.slug = $1
        GROUP BY c.id
      `;
            params = [slug];
        } else {
            // List all companies (paginated)
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            sql = `
        SELECT 
          c.id, c.name, c.slug, c.phone_number, c.is_active, c.created_at,
          (SELECT COUNT(*) FROM interactions WHERE company_id = c.id) as interaction_count
        FROM companies c
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
      `;
            params = [limit, offset];

            const result = await query(sql, params);
            const countResult = await query('SELECT COUNT(*) FROM companies');

            return NextResponse.json({
                companies: result.rows,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].count),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            });
        }

        const result = await query(sql, params);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json({ company: result.rows[0] });

    } catch (error) {
        console.error('Error fetching companies:', error);
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }
}

/**
 * POST /api/companies - Create a new company
 */
export async function POST(request) {
    try {
        const body = await request.json();

        const {
            name,
            slug,
            phoneNumber,
            greeting,
            fallbackMessage,
            timezone,
            businessHours,
            contactEmail,
            contactPhone,
            services  // Array of service objects
        } = body;

        // Validate required fields
        if (!name || !slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            );
        }

        // Check if slug is unique
        const slugCheck = await query('SELECT id FROM companies WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) {
            return NextResponse.json(
                { error: 'Slug already exists' },
                { status: 409 }
            );
        }

        // Create company
        const companyResult = await query(
            `INSERT INTO companies (
        name, slug, phone_number, greeting, fallback_message, 
        timezone, business_hours, contact_email, contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
            [
                name,
                slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                phoneNumber || null,
                greeting || 'Hello, thank you for calling. How may I assist you today?',
                fallbackMessage || 'I apologize, but I am unable to help with that. Would you like to speak with a representative?',
                timezone || 'UTC',
                JSON.stringify(businessHours || { weekdays: { open: '09:00', close: '17:00' }, weekend: { open: '10:00', close: '14:00' } }),
                contactEmail || null,
                contactPhone || null
            ]
        );

        const company = companyResult.rows[0];

        // Create services if provided
        if (services && Array.isArray(services) && services.length > 0) {
            for (const service of services) {
                await query(
                    `INSERT INTO company_services (company_id, name, description, pricing, duration_minutes, is_bookable)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        company.id,
                        service.name,
                        service.description || null,
                        service.pricing || null,
                        service.durationMinutes || null,
                        service.isBookable !== false
                    ]
                );
            }
        }

        // Generate initial API key
        const apiKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = await bcrypt.hash(apiKey, 10);

        await query(
            `INSERT INTO api_keys (company_id, key_hash, name, permissions)
       VALUES ($1, $2, $3, $4)`,
            [company.id, keyHash, 'Default API Key', JSON.stringify(['read', 'write'])]
        );

        return NextResponse.json({
            company,
            apiKey,  // Only returned once at creation!
            message: 'Company created successfully. Save your API key - it will not be shown again!'
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating company:', error);
        return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }
}

/**
 * PUT /api/companies - Update a company
 */
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        // Build dynamic update query
        const allowedFields = [
            'name', 'phone_number', 'greeting', 'fallback_message',
            'timezone', 'business_hours', 'contact_email', 'contact_phone', 'is_active'
        ];

        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        // Map camelCase to snake_case
        const fieldMap = {
            phoneNumber: 'phone_number',
            fallbackMessage: 'fallback_message',
            businessHours: 'business_hours',
            contactEmail: 'contact_email',
            contactPhone: 'contact_phone',
            isActive: 'is_active'
        };

        for (const [key, value] of Object.entries(updates)) {
            const dbField = fieldMap[key] || key;
            if (allowedFields.includes(dbField)) {
                setClauses.push(`${dbField} = $${paramIndex}`);
                values.push(dbField === 'business_hours' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        values.push(id);

        const result = await query(
            `UPDATE companies SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json({ company: result.rows[0] });

    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
}

/**
 * DELETE /api/companies - Delete a company (soft delete)
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        // Soft delete by setting is_active = false
        const result = await query(
            'UPDATE companies SET is_active = false WHERE id = $1 RETURNING id, name',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Company deactivated successfully',
            company: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting company:', error);
        return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
    }
}
