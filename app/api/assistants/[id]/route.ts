import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const runtime = 'edge';

/**
 * GET - Get specific assistant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;

    const assistantRef = doc(db, 'assistants', assistantId);
    const assistantSnap = await getDoc(assistantRef);

    if (!assistantSnap.exists()) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    const data = assistantSnap.data();
    const assistant = {
      id: assistantSnap.id,
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
      organizationId: data.organizationId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      modelId: data.modelId,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature || 0.7,
      attachedDocumentIds: data.attachedDocumentIds || [],
      isPublic: data.isPublic || false,
      useCount: data.useCount || 0,
      rating: data.rating,
      icon: data.icon,
      color: data.color,
    };

    return NextResponse.json({ assistant });
  } catch (error: any) {
    console.error('[Assistant GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistant', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update assistant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;
    const body = await request.json();
    const { userId } = body; // For ownership verification

    // Get existing assistant
    const assistantRef = doc(db, 'assistants', assistantId);
    const assistantSnap = await getDoc(assistantRef);

    if (!assistantSnap.exists()) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    const existingData = assistantSnap.data();

    // Verify ownership (only creator can update)
    if (existingData.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the creator can update this assistant' },
        { status: 403 }
      );
    }

    // Build update object (only update provided fields)
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.modelId !== undefined) updateData.modelId = body.modelId;
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.attachedDocumentIds !== undefined) updateData.attachedDocumentIds = body.attachedDocumentIds;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;

    await updateDoc(assistantRef, updateData);

    console.log(`[Assistant PUT] Updated assistant: ${assistantId}`);

    return NextResponse.json({
      success: true,
      message: 'Assistent uppdaterad!',
    });
  } catch (error: any) {
    console.error('[Assistant PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update assistant', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete assistant
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get existing assistant
    const assistantRef = doc(db, 'assistants', assistantId);
    const assistantSnap = await getDoc(assistantRef);

    if (!assistantSnap.exists()) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    const existingData = assistantSnap.data();

    // Verify ownership (only creator can delete)
    if (existingData.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the creator can delete this assistant' },
        { status: 403 }
      );
    }

    await deleteDoc(assistantRef);

    console.log(`[Assistant DELETE] Deleted assistant: ${assistantId}`);

    return NextResponse.json({
      success: true,
      message: 'Assistent raderad!',
    });
  } catch (error: any) {
    console.error('[Assistant DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete assistant', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Increment use count (when assistant is used)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;

    const assistantRef = doc(db, 'assistants', assistantId);
    const assistantSnap = await getDoc(assistantRef);

    if (!assistantSnap.exists()) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // Increment use count
    await updateDoc(assistantRef, {
      useCount: increment(1),
    });

    return NextResponse.json({
      success: true,
      message: 'Use count incremented',
    });
  } catch (error: any) {
    console.error('[Assistant PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update use count', message: error.message },
      { status: 500 }
    );
  }
}
