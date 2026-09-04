import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

const DEFAULT_BANKS_IDS = ['itau', 'banco_do_brasil', 'tribanco', 'stone', 'bradesco', 'caixa', 'santander'];

// We need to access memory fallback as well for this to work without Firestore, but for a real app we rely on DB.
// Note: Next.js API route scope might reset memoryCustomBanks.

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminToken = req.headers.get('Authorization');
  if (adminToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (DEFAULT_BANKS_IDS.includes(id)) {
    return NextResponse.json({ error: 'Não é permitido editar bancos padrão' }, { status: 403 });
  }

  const data = await req.json();

  if (db) {
    await db.collection('custom_banks').doc(id).update(data);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminToken = req.headers.get('Authorization');
  if (adminToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (DEFAULT_BANKS_IDS.includes(id)) {
    return NextResponse.json({ error: 'Não é permitido excluir bancos padrão' }, { status: 403 });
  }

  if (db) {
    await db.collection('custom_banks').doc(id).delete();
  }

  return NextResponse.json({ success: true });
}
