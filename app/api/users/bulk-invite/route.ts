import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { UserInvitation, UserRole } from '@/types';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST - Bulk invite users
 * Body: {
 *   invitations: Array<{
 *     email: string;
 *     organizationId: string;
 *     organizationName: string;
 *     role: UserRole;
 *     tokenLimit?: number;
 *     budgetLimit?: number;
 *   }>,
 *   invitedBy: string; // userId
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitations, invitedBy } = body;

    // Validation
    if (!invitations || !Array.isArray(invitations)) {
      return NextResponse.json(
        { error: 'invitations must be an array' },
        { status: 400 }
      );
    }

    if (!invitedBy) {
      return NextResponse.json(
        { error: 'invitedBy is required' },
        { status: 400 }
      );
    }

    if (invitations.length === 0) {
      return NextResponse.json(
        { error: 'At least one invitation is required' },
        { status: 400 }
      );
    }

    if (invitations.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 invitations per batch' },
        { status: 400 }
      );
    }

    // Validate each invitation
    const errors: string[] = [];
    invitations.forEach((inv, index) => {
      if (!inv.email || !isValidEmail(inv.email)) {
        errors.push(`Row ${index + 1}: Invalid email "${inv.email}"`);
      }
      if (!inv.organizationId) {
        errors.push(`Row ${index + 1}: Missing organizationId`);
      }
      if (!inv.role || !isValidRole(inv.role)) {
        errors.push(`Row ${index + 1}: Invalid role "${inv.role}"`);
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: errors },
        { status: 400 }
      );
    }

    // Create invitation records
    const results: Array<{ email: string; status: 'created' | 'failed'; inviteUrl?: string; error?: string }> = [];
    const invitedAt = Timestamp.now();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

    for (const inv of invitations) {
      try {
        // Generate unique invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

        // Create invitation document
        const invitationData = {
          email: inv.email.toLowerCase().trim(),
          organizationId: inv.organizationId,
          organizationName: inv.organizationName || 'Unknown Organization',
          role: inv.role,
          invitedBy,
          invitedAt,
          tokenLimit: inv.tokenLimit || null,
          budgetLimit: inv.budgetLimit || null,
          status: 'PENDING',
          sentAt: null,
          acceptedAt: null,
          expiresAt,
          inviteToken,
          inviteUrl,
        };

        const docRef = await addDoc(collection(db, 'userInvitations'), invitationData);

        console.log(`[Bulk Invite] Created invitation for ${inv.email} (ID: ${docRef.id})`);

        results.push({
          email: inv.email,
          status: 'created',
          inviteUrl,
        });

        // TODO: Send invitation email
        // await sendInvitationEmail(inv.email, inviteUrl, inv.organizationName);

      } catch (error: any) {
        console.error(`[Bulk Invite] Failed to create invitation for ${inv.email}:`, error);
        results.push({
          email: inv.email,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'created').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    console.log(`[Bulk Invite] Completed: ${successCount} created, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: invitations.length,
        created: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Bulk Invite] Error:', error);
    return NextResponse.json(
      {
        error: 'BULK_INVITE_ERROR',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List all invitations (for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // TODO: Add pagination
    const snapshot = await collection(db, 'userInvitations')
      .where('organizationId', '==', organizationId)
      .orderBy('invitedAt', 'desc')
      .limit(100)
      .get();

    const invitations: UserInvitation[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        role: data.role,
        invitedBy: data.invitedBy,
        invitedAt: data.invitedAt?.toDate() || new Date(),
        tokenLimit: data.tokenLimit,
        budgetLimit: data.budgetLimit,
        status: data.status,
        sentAt: data.sentAt?.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
        inviteToken: data.inviteToken,
        inviteUrl: data.inviteUrl,
      };
    });

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: any) {
    console.error('[Bulk Invite] Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate user role
 */
function isValidRole(role: string): boolean {
  const validRoles: UserRole[] = ['SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN', 'USER', 'DPO'];
  return validRoles.includes(role as UserRole);
}
