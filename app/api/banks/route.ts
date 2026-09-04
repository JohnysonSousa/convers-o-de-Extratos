import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

interface BankDefinition {
  id: string;
  name: string;
  promptKey: string;
  logo?: string;
  logoUrl?: string;
  color?: string;
  initials?: string;
  version?: string;
  status?: string;
  protected?: boolean;
  prompt?: string;
  columns?: string[];
  description?: string;
}

// Os 7 bancos padrão obrigatórios
const DEFAULT_BANKS: BankDefinition[] = [
  {
    id: "itau",
    name: "Itaú",
    promptKey: "itau",
    logo: "/banks/itau.svg",
    color: "#EC7000",
    initials: "IT",
    version: "v3.1.0",
    status: "Ativo",
    protected: true,
    columns: ["Data", "Descrição", "Entradas", "Saídas"],
    description: "Layout oficial Itaú com 4 colunas (Data, Descrição, Entradas, Saídas negativas), preenchimento contínuo de datas e remoção de saldos."
  },
  {
    id: "banco_do_brasil",
    name: "Banco do Brasil",
    promptKey: "banco_do_brasil",
    logo: "/banks/banco-do-brasil.svg",
    color: "#FCED1B",
    initials: "BB",
    version: "v3.0.0",
    status: "Ativo",
    protected: true,
    columns: ["Dia", "Lote", "Documento", "Historico", "Valor"],
    description: "Layout oficial Banco do Brasil com Dia, Lote, Documento, Historico e Valor (+/-), reconstrução inter-páginas e junção de linhas Pix."
  },
  {
    id: "tribanco",
    name: "Tribanco",
    promptKey: "tribanco",
    logo: "/banks/tribanco.svg",
    color: "#00C48C",
    initials: "TR",
    version: "v3.0.0",
    status: "Ativo",
    protected: true,
    columns: ["DATA DE LANÇAMENTO", "HISTÓRICO", "VALOR"],
    description: "Layout oficial Tribanco com DATA DE LANÇAMENTO;HISTÓRICO;VALOR, união multilinha, remoção de doc e preservação fiel de sinais (+/-)."
  },
  {
    id: "stone",
    name: "Stone",
    promptKey: "stone",
    logo: "/banks/stone.svg",
    color: "#00A868",
    initials: "ST",
    version: "v3.0.0",
    status: "Ativo",
    protected: true,
    columns: ["DATA", "DESCRIÇÃO", "VALOR"],
    description: "Layout oficial Stone com DATA;DESCRIÇÃO;VALOR, concatenação automática da CONTRAPARTE na descrição e saídas negativas (-)."
  },
  {
    id: "bradesco",
    name: "Bradesco",
    promptKey: "bradesco",
    logo: "/banks/bradesco.svg",
    color: "#CC092F",
    initials: "BD",
    version: "v2.0.0",
    status: "Ativo",
    protected: true,
    columns: ["Data", "Historico", "Valor"],
    description: "Separação rigorosa de valores com preenchimento contínuo de datas."
  },
  {
    id: "caixa",
    name: "Caixa",
    promptKey: "caixa",
    logo: "/banks/caixa.svg",
    color: "#005CA9",
    initials: "CX",
    version: "v1.7.0",
    status: "Ativo",
    protected: true,
    columns: ["Data", "Historico", "Valor"],
    description: "Extração otimizada para .xlsx com colunas Data, Historico e Valor (sufixos C e D)."
  },
  {
    id: "santander",
    name: "Santander",
    promptKey: "santander",
    logo: "/banks/santander.svg",
    color: "#CC0000",
    initials: "ST",
    version: "v3.0.0",
    status: "Ativo",
    protected: true,
    columns: ["DATA", "DESCRIÇÃO", "CRÉDITOS", "DÉBITOS"],
    description: "Layout oficial Santander com DATA;DESCRIÇÃO;CRÉDITOS;DÉBITOS, detecção do ano no extrato e preenchimento contínuo de datas."
  },
  {
    id: "bnb",
    name: "Banco do Nordeste",
    promptKey: "bnb",
    logo: "/banks/bnb.svg",
    color: "#9D1535",
    initials: "BNB",
    version: "v1.0.0",
    status: "Ativo",
    protected: true,
    columns: ["Data", "Historico", "Valor"],
    description: "Banco do Nordeste (BNB) - Extratos de Conta Corrente."
  }
];

// Fallback in-memory storage for custom banks when Firestore is not connected
let memoryCustomBanks: BankDefinition[] = [];

function checkAuth(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  // If ADMIN_TOKEN is not configured on server, allow creation for development
  if (!adminToken) return true;
  
  const authHeader = req.headers.get('Authorization');
  return authHeader === `Bearer ${adminToken}`;
}

export async function GET() {
  let customBanks: BankDefinition[] = [];
  
  if (db) {
    try {
      const snapshot = await db.collection('custom_banks').get();
      customBanks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDefinition));
    } catch (e) {
      console.warn("Firestore GET fallback to memory:", e);
      customBanks = memoryCustomBanks;
    }
  } else {
    customBanks = memoryCustomBanks;
  }

  // Ensure default banks are always returned first and protected
  return NextResponse.json([...DEFAULT_BANKS, ...customBanks]);
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado. Token de administração inválido.' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { name, prompt, columns, description, color, initials } = data;

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Nome e prompt são obrigatórios para cadastrar um banco.' }, { status: 400 });
    }

    const normalizedName = name.trim().toLowerCase();
    const isConflict = DEFAULT_BANKS.some(b => b.name.toLowerCase() === normalizedName) ||
      memoryCustomBanks.some(b => b.name.toLowerCase() === normalizedName);

    if (isConflict) {
      return NextResponse.json({ error: 'Já existe um banco cadastrado com este nome.' }, { status: 400 });
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBank: BankDefinition = {
      id,
      name: name.trim(),
      promptKey: id,
      prompt: prompt.trim(),
      columns: Array.isArray(columns) && columns.length > 0 ? columns : ['DATA', 'DESCRIÇÃO', 'VALOR'],
      description: description || 'Banco personalizado adicionado pelo usuário.',
      color: color || '#2563EB',
      initials: initials || name.substring(0, 2).toUpperCase(),
      version: 'v1.0.0',
      status: 'Ativo',
      protected: false
    };

    if (db) {
      try {
        await db.collection('custom_banks').doc(id).set(newBank);
      } catch (err) {
        console.warn("Firestore save error, saving to memory:", err);
      }
    }
    
    memoryCustomBanks.push(newBank);

    return NextResponse.json(newBank, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar banco personalizado.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado. Token de administração inválido.' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID do banco é obrigatório.' }, { status: 400 });
    }

    if (DEFAULT_BANKS.some(b => b.id === id)) {
      return NextResponse.json({ error: 'Os 7 bancos padrão são protegidos e não podem ser modificados.' }, { status: 403 });
    }

    if (db) {
      try {
        await db.collection('custom_banks').doc(id).update(updates);
      } catch (err) {
        console.warn("Firestore update error:", err);
      }
    }

    const index = memoryCustomBanks.findIndex(b => b.id === id);
    if (index !== -1) {
      memoryCustomBanks[index] = { ...memoryCustomBanks[index], ...updates };
    }

    return NextResponse.json({ success: true, id, ...updates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar banco.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Não autorizado. Token de administração inválido.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do banco é obrigatório.' }, { status: 400 });
    }

    if (DEFAULT_BANKS.some(b => b.id === id)) {
      return NextResponse.json({ error: 'Os 7 bancos padrão são protegidos e não podem ser excluídos.' }, { status: 403 });
    }

    if (db) {
      try {
        await db.collection('custom_banks').doc(id).delete();
      } catch (err) {
        console.warn("Firestore delete error:", err);
      }
    }

    memoryCustomBanks = memoryCustomBanks.filter(b => b.id !== id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir banco.' }, { status: 500 });
  }
}
