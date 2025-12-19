import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { AuditLog } from '@/types';

export const runtime = 'nodejs';

/**
 * GET - Fetch audit logs with filtering
 * Query params:
 * - userId: Filter by user
 * - organizationId: Filter by organization (required for non-super-admins)
 * - action: Filter by action type
 * - startDate: Start date (ISO string)
 * - endDate: End date (ISO string)
 * - piiOnly: Only show logs where PII was detected (true/false)
 * - status: Filter by status (SUCCESS, FAILED, BLOCKED)
 * - dataResidency: Filter by data residency
 * - limit: Number of results (default 100, max 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract filters
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const action = searchParams.get('action');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const piiOnly = searchParams.get('piiOnly') === 'true';
    const status = searchParams.get('status');
    const dataResidency = searchParams.get('dataResidency');
    const limitParam = parseInt(searchParams.get('limit') || '100');

    // Validate
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Build query constraints
    const constraints: QueryConstraint[] = [
      where('organizationId', '==', organizationId),
    ];

    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    if (action) {
      constraints.push(where('action', '==', action));
    }

    if (piiOnly) {
      constraints.push(where('piiDetected', '==', true));
    }

    if (status) {
      constraints.push(where('status', '==', status));
    }

    if (dataResidency) {
      constraints.push(where('dataResidency', '==', dataResidency));
    }

    // Date range filtering
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }

    if (endDateStr) {
      const endDate = new Date(endDateStr);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)));
    }

    // Add ordering and limit
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(Math.min(limitParam, 1000)));

    // Execute query
    const auditQuery = query(collection(db, 'auditLogs'), ...constraints);
    const snapshot = await getDocs(auditQuery);

    const logs: AuditLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        action: data.action,
        actionDescription: data.actionDescription,
        modelId: data.modelId,
        modelName: data.modelName,
        dataResidency: data.dataResidency,
        complianceMode: data.complianceMode,
        maskedQuery: data.maskedQuery,
        maskedResponse: data.maskedResponse,
        piiDetected: data.piiDetected || false,
        piiTypes: data.piiTypes,
        piiAction: data.piiAction,
        tokens: data.tokens,
        cost: data.cost,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        conversationId: data.conversationId,
        documentId: data.documentId,
        meetingId: data.meetingId,
        assistantId: data.assistantId,
        status: data.status,
        errorMessage: data.errorMessage,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalLogs: logs.length,
      totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
      totalTokens: logs.reduce((sum, log) => sum + (log.tokens || 0), 0),
      piiDetectedCount: logs.filter((log) => log.piiDetected).length,
      failedCount: logs.filter((log) => log.status === 'FAILED').length,
      blockedCount: logs.filter((log) => log.status === 'BLOCKED').length,
      successCount: logs.filter((log) => log.status === 'SUCCESS').length,
      actionBreakdown: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      dataResidencyBreakdown: logs.reduce((acc, log) => {
        acc[log.dataResidency] = (acc[log.dataResidency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      success: true,
      logs,
      summary,
    });
  } catch (error: any) {
    console.error('[Audit API] Error:', error);
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      userName,
      userEmail,
      organizationId,
      organizationName,
      action,
      actionDescription,
      modelId,
      modelName,
      dataResidency,
      complianceMode,
      maskedQuery,
      maskedResponse,
      piiDetected,
      piiTypes,
      piiAction,
      tokens,
      cost,
      conversationId,
      documentId,
      meetingId,
      assistantId,
      status,
      errorMessage,
    } = body;

    // Validation
    if (!userId || !organizationId || !action || !dataResidency || !complianceMode) {
      return NextResponse.json(
        {
          error: 'Missing required fields: userId, organizationId, action, dataResidency, complianceMode',
        },
        { status: 400 }
      );
    }

    // Get IP and user agent from headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create audit log entry
    const auditLogData = {
      timestamp: Timestamp.now(),
      userId,
      userName,
      userEmail,
      organizationId,
      organizationName,
      action,
      actionDescription,
      modelId: modelId || null,
      modelName: modelName || null,
      dataResidency,
      complianceMode,
      maskedQuery: maskedQuery || null,
      maskedResponse: maskedResponse || null,
      piiDetected: piiDetected || false,
      piiTypes: piiTypes || null,
      piiAction: piiAction || null,
      tokens: tokens || 0,
      cost: cost || 0,
      ipAddress,
      userAgent,
      conversationId: conversationId || null,
      documentId: documentId || null,
      meetingId: meetingId || null,
      assistantId: assistantId || null,
      status: status || 'SUCCESS',
      errorMessage: errorMessage || null,
    };

    await collection(db, 'auditLogs').add(auditLogData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Audit API] Error creating log:', error);
    return NextResponse.json(
      { error: 'CREATE_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
