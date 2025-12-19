import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs, Timestamp, QueryConstraint } from 'firebase/firestore';

export const runtime = 'nodejs';

/**
 * GET - Export audit logs as CSV
 * Same query params as /api/audit but returns CSV instead of JSON
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract filters (same as audit route)
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const action = searchParams.get('action');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const piiOnly = searchParams.get('piiOnly') === 'true';
    const status = searchParams.get('status');
    const dataResidency = searchParams.get('dataResidency');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Build query
    const constraints: QueryConstraint[] = [where('organizationId', '==', organizationId)];

    if (userId) constraints.push(where('userId', '==', userId));
    if (action) constraints.push(where('action', '==', action));
    if (piiOnly) constraints.push(where('piiDetected', '==', true));
    if (status) constraints.push(where('status', '==', status));
    if (dataResidency) constraints.push(where('dataResidency', '==', dataResidency));

    if (startDateStr) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(startDateStr))));
    }
    if (endDateStr) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(new Date(endDateStr))));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    // Execute query
    const auditQuery = query(collection(db, 'auditLogs'), ...constraints);
    const snapshot = await getDocs(auditQuery);

    // Build CSV
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Organization',
      'Action',
      'Description',
      'Model',
      'Data Residency',
      'Compliance Mode',
      'PII Detected',
      'PII Types',
      'PII Action',
      'Tokens',
      'Cost (SEK)',
      'Status',
      'Error',
      'IP Address',
    ];

    const rows = snapshot.docs.map((doc) => {
      const data = doc.data();
      return [
        data.timestamp?.toDate().toISOString() || '',
        escapeCsvValue(data.userName || ''),
        escapeCsvValue(data.userEmail || ''),
        escapeCsvValue(data.organizationName || ''),
        data.action || '',
        escapeCsvValue(data.actionDescription || ''),
        data.modelName || data.modelId || '',
        data.dataResidency || '',
        data.complianceMode || '',
        data.piiDetected ? 'Yes' : 'No',
        data.piiTypes?.join('; ') || '',
        data.piiAction || '',
        data.tokens || 0,
        (data.cost || 0).toFixed(4),
        data.status || '',
        escapeCsvValue(data.errorMessage || ''),
        data.ipAddress || '',
      ];
    });

    // Generate CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('[Audit Export] Error:', error);
    return NextResponse.json(
      { error: 'EXPORT_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 */
function escapeCsvValue(value: string): string {
  if (!value) return '';

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
