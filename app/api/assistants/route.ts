import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Assistant } from '@/types';

export const runtime = 'edge';

/**
 * GET - List assistants for user/organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const includePublic = searchParams.get('includePublic') === 'true';

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'userId and organizationId are required' },
        { status: 400 }
      );
    }

    const assistants: Assistant[] = [];

    // Get user's own assistants
    const ownQuery = query(
      collection(db, 'assistants'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const ownSnapshot = await getDocs(ownQuery);
    ownSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      assistants.push({
        id: doc.id,
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
      });
    });

    // Get organization's public assistants (if different from own)
    const orgQuery = query(
      collection(db, 'assistants'),
      where('organizationId', '==', organizationId),
      where('isPublic', '==', true),
      orderBy('useCount', 'desc')
    );
    const orgSnapshot = await getDocs(orgQuery);
    orgSnapshot.docs.forEach((doc) => {
      // Skip if already added (user's own)
      if (assistants.some((a) => a.id === doc.id)) return;

      const data = doc.data();
      assistants.push({
        id: doc.id,
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
      });
    });

    // Get global public assistants from marketplace (if requested)
    if (includePublic) {
      const publicQuery = query(
        collection(db, 'assistants'),
        where('isPublic', '==', true),
        orderBy('rating', 'desc')
      );
      const publicSnapshot = await getDocs(publicQuery);
      publicSnapshot.docs.forEach((doc) => {
        // Skip if already added
        if (assistants.some((a) => a.id === doc.id)) return;

        const data = doc.data();
        assistants.push({
          id: doc.id,
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
        });
      });
    }

    return NextResponse.json({ assistants });
  } catch (error: any) {
    console.error('[Assistants GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistants', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new assistant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      createdBy,
      organizationId,
      modelId,
      systemPrompt,
      temperature,
      attachedDocumentIds,
      isPublic,
      icon,
      color,
    } = body;

    // Validate required fields
    if (!name || !createdBy || !organizationId || !modelId || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, createdBy, organizationId, modelId, systemPrompt' },
        { status: 400 }
      );
    }

    // Create assistant document
    const assistantData = {
      name,
      description: description || '',
      createdBy,
      organizationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      modelId,
      systemPrompt,
      temperature: temperature ?? 0.7,
      attachedDocumentIds: attachedDocumentIds || [],
      isPublic: isPublic || false,
      useCount: 0,
      icon: icon || '🤖',
      color: color || '#3B82F6',
    };

    const docRef = await addDoc(collection(db, 'assistants'), assistantData);

    console.log(`[Assistants POST] Created assistant: ${docRef.id} - ${name}`);

    return NextResponse.json({
      success: true,
      assistantId: docRef.id,
      message: 'Assistent skapad framgångsrikt!',
    });
  } catch (error: any) {
    console.error('[Assistants POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create assistant', message: error.message },
      { status: 500 }
    );
  }
}
