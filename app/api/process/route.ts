import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as xlsx from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { BANK_PROMPTS } from '@/server/prompts';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({ apiKey });
}

// Columns definition for each default bank
const BANK_COLUMNS: Record<string, string[]> = {
  itau: ['Data', 'Descrição', 'Entradas', 'Saídas'],
  banco_do_brasil: ['Dia', 'Lote', 'Documento', 'Historico', 'Valor'],
  tribanco: ['DATA DE LANÇAMENTO', 'HISTÓRICO', 'VALOR'],
  stone: ['DATA', 'DESCRIÇÃO', 'VALOR'],
  bradesco: ['Data', 'Historico', 'Valor'],
  caixa: ['Data', 'Historico', 'Valor'],
  santander: ['DATA', 'DESCRIÇÃO', 'CRÉDITOS', 'DÉBITOS'],
  bnb: ['Data', 'Historico', 'Valor']
};

const BANK_COLUMN_DESCRIPTIONS: Record<string, Record<string, string>> = {
  itau: {
    Data: 'Data no formato DD/MM/AAAA (ex: DD/MM/2026). Se a data estiver em branco em lançamentos de um grupo, repita obrigatoriamente a última data válida até encontrar nova data.',
    'Descrição': 'Descrição completa da movimentação em uma única linha, sem quebras de linha e sem separar nomes, códigos ou identificadores.',
    Entradas: 'Valor numérico das entradas/créditos no padrão brasileiro (ex: 1.978,61). Deixe texto vazio ("") se a movimentação for uma saída.',
    'Saídas': 'Valor numérico das saídas/débitos no padrão brasileiro obrigatoriamente com sinal de menos (-) no início (ex: -984,19). Deixe texto vazio ("") se a movimentação for uma entrada.'
  },
  banco_do_brasil: {
    Dia: 'Data completa da transação no formato DD/MM/AAAA',
    Lote: 'Número do lote ou texto vazio quando ausente',
    Documento: 'Número do documento ou texto vazio quando ausente',
    Historico: 'Histórico completo e reconstruído da transação',
    Valor: 'Valor no padrão brasileiro acompanhado de (+) ou (-)'
  },
  bradesco: {
    Data: 'Data no formato DD/MM/AAAA. Se o extrato estiver com a data em branco em uma linha, repita a última data válida até encontrar uma nova data no extrato. NUNCA deixe a data em branco.',
    Historico: 'Descrição completa da movimentação, unindo linhas de texto quebradas da mesma movimentação e preservando complementos (REM, DES, favorecido, etc.).',
    Valor: 'Valor no padrão brasileiro acompanhado de C (crédito) ou D (débito).'
  },
  caixa: {
    Data: 'Data no formato DD/MM/AAAA. Se a data estiver em branco em lançamentos seguintes do mesmo dia, repita obrigatoriamente a última data válida até encontrar nova data. Nunca deixe a data em branco.',
    Historico: 'Histórico completo da movimentação unificado em uma única linha, sem as letras C ou D, sem Nr. Doc. e preservando favorecido/pagador.',
    Valor: 'Valor no padrão brasileiro com duas casas decimais seguido obrigatoriamente de espaço e da letra C para crédito ou D para débito (ex: 167,53 C ou 2.500,00 D). Sem sinal negativo (-) e sem símbolo R$.'
  },
  santander: {
    DATA: 'Data no formato DD/MM/AAAA identificando o ano no extrato. Se a data estiver em branco em lançamentos do mesmo dia, repita a última data válida até encontrar nova data. Nunca deixe a data em branco.',
    'DESCRIÇÃO': 'Descrição completa da movimentação unida em uma única célula, com remetente, favorecido, período ou final de cartão.',
    'CRÉDITOS': 'Valor dos créditos/entradas com duas casas decimais no padrão brasileiro (ex: 20.000,00). Deixe texto vazio ("") se for débito.',
    'DÉBITOS': 'Valor dos débitos/saídas com duas casas decimais no padrão brasileiro sem sinal de menos (ex: 30.000,00). Deixe texto vazio ("") se for crédito.'
  },
  stone: {
    DATA: 'Data da movimentação no formato DD/MM/AAAA. Se a data estiver em branco em lançamentos de um grupo, repita a última data válida até encontrar nova data.',
    'DESCRIÇÃO': 'Descrição completa da movimentação concatenando a contraparte ao final com " | " sempre que houver (ex: Recebimento vendas | Antecipação | Crédito | STONE INSTITUIÇÃO DE PAGAMENTO S.A.).',
    VALOR: 'Valor no padrão brasileiro (ex: 5.430,80 para créditos e -1.250,00 com sinal de menos no início para débitos/saídas).'
  },
  tribanco: {
    'DATA DE LANÇAMENTO': 'Data no formato DD/MM/AAAA. Se a data estiver em branco em lançamentos seguintes, repita a última data válida até encontrar nova data.',
    'HISTÓRICO': 'Texto integral do histórico da movimentação unificado em uma única linha, sem o número do documento e sem linhas de saldo anterior ou saldo c/c.',
    VALOR: 'Valor com duas casas decimais preservando rigorosamente o sinal apresentado no extrato (positivo ou com sinal de menos -).'
  }
};

// Helper to safely extract and repair JSON from model outputs
function extractAndParseJSON(rawText: string): { transactions?: Record<string, string>[]; transacoes?: Record<string, string>[]; totalCount?: number; notes?: string } {
  if (!rawText) throw new Error('O modelo não retornou conteúdo.');

  let cleaned = rawText.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Try direct parse first
  try {
    const result = JSON.parse(cleaned);
    if (result && typeof result === 'object') {
      if (Array.isArray(result)) {
        return { transactions: result };
      }
      return result;
    }
  } catch {
    // Continue with recovery strategies
  }

  // Find boundaries of JSON Object or Array
  const firstCurly = cleaned.indexOf('{');
  const lastCurly = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  // Check if it's an object
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    const candidateObj = cleaned.slice(firstCurly, lastCurly + 1);
    try {
      return JSON.parse(candidateObj);
    } catch {
      // Try fixing trailing commas before closing braces/brackets
      const fixedTrailingCommas = candidateObj.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(fixedTrailingCommas);
      } catch {
        // Fallback to extraction of transactions list
      }
    }
  }

  // Check if it's an array directly
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidateArr = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      const arr = JSON.parse(candidateArr);
      if (Array.isArray(arr)) {
        return { transactions: arr };
      }
    } catch {
      const fixedArr = candidateArr.replace(/,\s*([}\]])/g, '$1');
      try {
        const arr = JSON.parse(fixedArr);
        if (Array.isArray(arr)) {
          return { transactions: arr };
        }
      } catch {
        // Fallback to regex extraction
      }
    }
  }

  // Resilient regex-based recovery of individual transaction objects
  const objectRegex = /\{[^{}]*?"(?:Dia|Data|Historico|DATA|Documento|Valor|VALOR|Descrição)"[^{}]*?\}/gi;
  const matches = cleaned.match(objectRegex);
  if (matches && matches.length > 0) {
    const recovered: Record<string, string>[] = [];
    for (const match of matches) {
      try {
        const item = JSON.parse(match);
        if (item && typeof item === 'object') {
          recovered.push(item);
        }
      } catch {
        try {
          const item = JSON.parse(match.replace(/,\s*}/g, '}'));
          if (item && typeof item === 'object') {
            recovered.push(item);
          }
        } catch {
          // ignore individual item parse failure
        }
      }
    }
    if (recovered.length > 0) {
      return { transactions: recovered, notes: 'Recuperado por parser resiliente de fragmentos' };
    }
  }

  throw new Error('Falha ao interpretar a resposta estruturada da IA. Formato JSON inválido.');
}

// Helper to process a single chunk/range of PDF pages with Gemini
async function processPdfChunk({
  ai,
  pdfBuffer,
  bank,
  expectedColumns,
  promptToUse,
  startPage,
  endPage,
  totalPages
}: {
  ai: GoogleGenAI;
  pdfBuffer: Buffer;
  bank: string;
  expectedColumns: string[];
  promptToUse: string;
  startPage: number;
  endPage: number;
  totalPages: number;
}): Promise<Record<string, string>[]> {
  const base64Data = pdfBuffer.toString('base64');
  
  const pageRangeText = totalPages > 1
    ? `Você está processando o lote das páginas ${startPage} até ${endPage} (de um total de ${totalPages} páginas) deste extrato bancário.`
    : `Você está processando este extrato bancário.`;

  const instructionText = promptToUse && promptToUse.trim().length > 0
    ? `${promptToUse}\n\n${pageRangeText} Extraia com precisão cirúrgica TODAS as transações e movimentações contidas estritamente nestas páginas nas colunas solicitadas: ${expectedColumns.join(', ')}.`
    : `${pageRangeText} Extraia com precisão cirúrgica TODAS as transações e movimentações contidas estritamente nestas páginas nas seguintes colunas: ${expectedColumns.join(', ')}.`;

  const contentParts = [
    {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf'
      }
    },
    {
      text: instructionText
    }
  ];

  // Construct extraction schema
  const customColDescs = BANK_COLUMN_DESCRIPTIONS[bank] || {};
  const propertiesSchema: Record<string, { type: Type; description?: string }> = {};
  for (const col of expectedColumns) {
    propertiesSchema[col] = {
      type: Type.STRING,
      description: customColDescs[col] || `Valor exato em texto para a coluna ${col}, preservando zeros à esquerda e pontuação.`
    };
  }

  const systemInstruction = `Você é um extrator de alta precisão especializado em auditoria e conversão de extratos bancários brasileiros para formatos estruturados (Excel e CSV).
Analise rigorosamente as páginas fornecidas (páginas ${startPage} a ${endPage} de ${totalPages}).
Reconstrua movimentações divididas ou quebradas entre linhas e páginas.
Nunca descarte lançamentos repetidos legítimos.
Ignore cabeçalhos repetidos e dados meramente institucionais ou de saldo acumulado.
Siga rigorosamente as instruções e regras específicas do banco abaixo.`;

  // Configure exact structured output schema
  const isBBDocument = bank === 'banco_do_brasil';
  const mainKey = isBBDocument ? 'transacoes' : 'transactions';

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      [mainKey]: {
        type: Type.ARRAY,
        description: isBBDocument 
          ? `Lista completa de todas as transações extraídas das páginas ${startPage} a ${endPage} do Banco do Brasil.`
          : `Lista completa de transações extraídas das páginas ${startPage} a ${endPage}.`,
        items: {
          type: Type.OBJECT,
          properties: propertiesSchema,
          required: expectedColumns
        }
      },
      totalCount: {
        type: Type.INTEGER,
        description: 'Total de movimentações extraídas deste trecho.'
      }
    },
    required: [mainKey]
  };

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite'
  ];

  let response: any = null;
  let lastError: any = null;

  retryLoop: for (let attempt = 0; attempt < 5; attempt++) {
    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contentParts,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 65536,
            temperature: 0.1,
            responseSchema
          }
        });

        if (response && response.text) {
          break retryLoop;
        }
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err);
        
        const isTransientError = 
          errString.includes('503') || 
          errString.includes('demand') || 
          errString.includes('UNAVAILABLE') || 
          errString.includes('429') || 
          errString.includes('RESOURCE_EXHAUSTED') ||
          errString.includes('fetch failed') ||
          errString.includes('ECONNRESET') ||
          errString.includes('ETIMEDOUT') ||
          errString.includes('timeout') ||
          errString.includes('socket hang up') ||
          errString.includes('ENOTFOUND') ||
          errString.includes('EAI_AGAIN') ||
          errString.includes('network');

        if (isTransientError) {
          const jitterMs = 1200 + Math.floor(Math.random() * 800);
          await new Promise(resolve => setTimeout(resolve, jitterMs));
          continue;
        }
      }
    }

    const attemptBackoff = (attempt + 1) * 2000 + Math.floor(Math.random() * 1200);
    await new Promise(resolve => setTimeout(resolve, attemptBackoff));
  }

  if (!response || !response.text) {
    throw new Error(lastError?.message || `Falha ao processar páginas ${startPage}-${endPage}.`);
  }

  const parsedResult = extractAndParseJSON(response.text);

  const transactions: Record<string, string>[] = 
    (parsedResult as any).transacoes || 
    parsedResult.transactions || 
    (parsedResult as any).movimentacoes || 
    (Array.isArray(parsedResult) ? parsedResult : []);

  return transactions;
}

// Helper to format values with C/D suffix for banks like Caixa, Bradesco, BNB
function formatValueWithCD(val: string): string {
  if (!val) return '';
  let v = String(val).trim();

  // If already ends with C or D (with or without space)
  if (/\s+[Cc]$/.test(v)) return v.slice(0, -1).trim() + ' C';
  if (/\s+[Dd]$/.test(v)) return v.slice(0, -1).trim() + ' D';
  if (/[0-9][Cc]$/.test(v)) return v.slice(0, -1).trim() + ' C';
  if (/[0-9][Dd]$/.test(v)) return v.slice(0, -1).trim() + ' D';

  // If starts with negative sign (-) or has parenthesis (ex: (1.250,00))
  if (v.startsWith('-') || /^\(.*\)$/.test(v)) {
    const cleanNum = v.replace(/[-()]/g, '').trim();
    return cleanNum ? `${cleanNum} D` : '';
  }

  // If starts with positive sign (+)
  if (v.startsWith('+')) {
    const cleanNum = v.replace('+', '').trim();
    return cleanNum ? `${cleanNum} C` : '';
  }

  return v;
}

// Helper to locate value in transaction object with resilient normalization
function findColumnValue(item: Record<string, any>, colName: string, bank?: string): string {
  if (!item || typeof item !== 'object') return '';

  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

  const targetNorm = normalize(colName);

  // 1. Direct key match
  if (item[colName] !== undefined && item[colName] !== null) {
    let val = String(item[colName]).trim();
    if (val !== '') {
      if (targetNorm.includes('val') && (bank === 'caixa' || bank === 'bradesco' || bank === 'bnb')) {
        return formatValueWithCD(val);
      }
      if ((targetNorm === 'saidas' || targetNorm === 'debitos') && bank === 'itau') {
        const clean = val.replace(/[-+()]/g, '').trim();
        return clean ? `-${clean}` : '';
      }
      return val;
    }
  }

  // 2. Normalized key match (case-insensitive, ignores accents & punctuation)
  for (const [key, rawVal] of Object.entries(item)) {
    if (normalize(key) === targetNorm && rawVal !== undefined && rawVal !== null) {
      let val = String(rawVal).trim();
      if (val !== '') {
        if (targetNorm.includes('val') && (bank === 'caixa' || bank === 'bradesco' || bank === 'bnb')) {
          return formatValueWithCD(val);
        }
        if ((targetNorm === 'saidas' || targetNorm === 'debitos') && bank === 'itau') {
          const clean = val.replace(/[-+()]/g, '').trim();
          return clean ? `-${clean}` : '';
        }
        return val;
      }
    }
  }

  // 3. Aliases for 'Data' / 'Dia' / 'Data Mov'
  if (targetNorm.includes('data') || targetNorm === 'dia') {
    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if ((kn.includes('data') || kn === 'dia' || kn.includes('dtmov') || kn.includes('mov')) && rawVal !== undefined && rawVal !== null) {
        const val = String(rawVal).trim();
        if (val !== '') return val;
      }
    }
  }

  // 4. Aliases for 'Historico' / 'Descricao' / 'Lancamento'
  if (targetNorm.includes('hist') || targetNorm.includes('desc') || targetNorm.includes('lanc')) {
    let baseDesc = '';
    let contraparte = '';

    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if ((kn.includes('hist') || kn.includes('desc') || kn.includes('lanc') || kn.includes('trans')) && rawVal !== undefined && rawVal !== null) {
        const val = String(rawVal).trim();
        if (val !== '' && !baseDesc) baseDesc = val;
      }
      if (kn.includes('contraparte') && rawVal !== undefined && rawVal !== null) {
        const cp = String(rawVal).trim();
        if (cp !== '') contraparte = cp;
      }
    }

    if (baseDesc !== '') {
      if (bank === 'stone' && contraparte && !baseDesc.includes(contraparte)) {
        return `${baseDesc} | ${contraparte}`;
      }
      return baseDesc;
    }
  }

  // 5. Aliases for 'Entradas' / 'Créditos'
  if (targetNorm === 'entradas' || targetNorm === 'creditos' || targetNorm === 'credito') {
    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if ((kn === 'entradas' || kn.includes('cred') || kn === 'entrada') && rawVal !== undefined && rawVal !== null) {
        let val = String(rawVal).trim();
        // Remove trailing or leading minus or plus
        val = val.replace(/[-+]/g, '').trim();
        if (val !== '') return val;
      }
    }
  }

  // 6. Aliases for 'Saídas' / 'Débitos'
  if (targetNorm === 'saidas' || targetNorm === 'debitos' || targetNorm === 'debito') {
    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if ((kn === 'saidas' || kn.includes('deb') || kn === 'saida') && rawVal !== undefined && rawVal !== null) {
        let val = String(rawVal).trim();
        const clean = val.replace(/[-+()]/g, '').trim();
        if (clean !== '') {
          return bank === 'itau' ? `-${clean}` : clean;
        }
      }
    }
  }

  // 7. Aliases for 'Valor' / 'Quantia'
  if (targetNorm.includes('val') || targetNorm.includes('quant')) {
    // Check if separate Credito / Debito fields exist in the object
    let credVal = '';
    let debVal = '';
    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if (kn.includes('cred') && rawVal !== undefined && rawVal !== null) credVal = String(rawVal).trim();
      if (kn.includes('deb') && rawVal !== undefined && rawVal !== null) debVal = String(rawVal).trim();
    }
    if (credVal) return credVal.endsWith('C') ? credVal : `${credVal} C`;
    if (debVal) return debVal.endsWith('D') ? debVal : `${debVal} D`;

    // Check generic value keys
    for (const [key, rawVal] of Object.entries(item)) {
      const kn = normalize(key);
      if ((kn.includes('val') || kn.includes('vlr') || kn.includes('quant')) && rawVal !== undefined && rawVal !== null) {
        let val = String(rawVal).trim();
        if (val !== '') {
          // Check if nature column exists (ex: Tipo, Operacao, DC, Natureza)
          for (const [natKey, natRaw] of Object.entries(item)) {
            const nkn = normalize(natKey);
            if (nkn === 'dc' || nkn === 'natureza' || nkn === 'tipo' || nkn === 'operacao') {
              const natVal = String(natRaw || '').trim().toUpperCase();
              if (natVal === 'C' || natVal.includes('CRED')) return `${val} C`;
              if (natVal === 'D' || natVal.includes('DEB')) return `${val} D`;
            }
          }
          if (bank === 'caixa' || bank === 'bradesco' || bank === 'bnb') {
            return formatValueWithCD(val);
          }
          return val;
        }
      }
    }
  }

  return '';
}

// Helper to build workbook/buffer from extracted transactions
function generateOutputDocument(
  transactions: Record<string, string>[],
  expectedColumns: string[],
  outputFormat: 'xlsx' | 'csv',
  bank?: string
): { buffer: Buffer; mimeType: string; extension: string } {
  // Map rows with smart column fallback and continuous date forward-fill
  let lastValidDate = '';

  const rows = transactions
    .map(item => {
      const row: Record<string, string> = {};
      for (const col of expectedColumns) {
        row[col] = findColumnValue(item, col, bank);
      }

      // Continuous Date Fill for Caixa, Bradesco, BNB
      const dateCol = expectedColumns.find(c => {
        const norm = c.toLowerCase();
        return norm.includes('data') || norm === 'dia';
      });

      if (dateCol) {
        const currentDate = (row[dateCol] || '').trim();
        if (currentDate !== '') {
          lastValidDate = currentDate;
        } else if (lastValidDate) {
          row[dateCol] = lastValidDate;
        }
      }

      return row;
    })
    .filter(row => {
      // Ensure row has at least one meaningful piece of data besides headers
      return Object.values(row).some(v => v.trim() !== '');
    });

  const worksheet = xlsx.utils.json_to_sheet(rows, { header: expectedColumns });

  // Format clean column widths for Excel
  worksheet['!cols'] = expectedColumns.map(col => {
    const norm = col.toLowerCase();
    if (norm.includes('data') || norm.includes('dia')) return { wch: 14 };
    if (norm.includes('valor') || norm.includes('cred') || norm.includes('deb') || norm.includes('entrada') || norm.includes('saida')) return { wch: 18 };
    if (norm.includes('hist') || norm.includes('desc') || norm.includes('lanc')) return { wch: 55 };
    return { wch: 20 };
  });

  const workbook = xlsx.utils.book_new();
  const sheetName = bank === 'caixa' ? 'Extrato Caixa' : bank === 'bradesco' ? 'Extrato Bradesco' : bank === 'santander' ? 'Extrato Santander' : bank === 'banco_do_brasil' ? 'Extrato BB' : bank === 'stone' ? 'Extrato Stone' : bank === 'tribanco' ? 'Extrato Tribanco' : 'Extrato';
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (outputFormat === 'csv') {
    const csvContent = xlsx.utils.sheet_to_csv(worksheet, { FS: ';' });
    return {
      buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'),
      mimeType: 'text/csv; charset=utf-8',
      extension: 'csv'
    };
  } else {
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx'
    };
  }
}

export async function POST(req: Request) {
  let ai: GoogleGenAI | null = null;
  
  try {
    ai = getGenAI();
    const formData = await req.formData();
    const bank = formData.get('bank') as string;
    const outputFormat = ((formData.get('output_format') as string)?.toLowerCase() || 'xlsx') as 'xlsx' | 'csv';
    const file = formData.get('pdf') as File;
    const isStreamRequested = 
      formData.get('stream') === 'true' || 
      req.headers.get('accept')?.includes('application/x-ndjson') ||
      req.headers.get('accept')?.includes('text/event-stream');

    if (!bank) {
      return NextResponse.json({ error: 'Parâmetro bank é obrigatório.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'Arquivo PDF não enviado.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Formato inválido. O arquivo deve ser um PDF (.pdf).' }, { status: 400 });
    }
    
    if (file.size === 0) {
      return NextResponse.json({ error: 'O arquivo PDF enviado está vazio.' }, { status: 400 });
    }

    if (outputFormat !== 'xlsx' && outputFormat !== 'csv') {
      return NextResponse.json({ error: 'Formato de saída deve ser xlsx ou csv.' }, { status: 400 });
    }

    // 1. Locate prompt and expected columns
    let promptToUse = BANK_PROMPTS[bank] ?? '';
    let expectedColumns = BANK_COLUMNS[bank];

    // Check Firestore for custom bank if not standard
    if (db && !promptToUse && !expectedColumns) {
      try {
        const doc = await db.collection('custom_banks').doc(bank).get();
        if (doc.exists) {
          const data = doc.data();
          if (data?.prompt) promptToUse = data.prompt;
          if (data?.columns && Array.isArray(data.columns)) {
            expectedColumns = data.columns;
          }
        }
      } catch (err) {
        console.error('Erro ao consultar banco customizado no Firestore:', err);
      }
    }

    if (!expectedColumns || expectedColumns.length === 0) {
      expectedColumns = ['DATA', 'DESCRIÇÃO', 'VALOR'];
    }

    // 2. Load PDF with pdf-lib
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    } catch {
      throw new Error('Não foi possível carregar o arquivo PDF. Verifique se o arquivo não está corrompido ou protegido com senha.');
    }

    const totalPages = pdfDoc.getPageCount();
    if (totalPages === 0) {
      throw new Error('O arquivo PDF não contém páginas legíveis.');
    }

    // 3. Define page chunk size (6-8 pages per chunk ensures 100% extraction without token truncation)
    const PAGES_PER_CHUNK = 8;
    const chunkTasks: { start: number; end: number }[] = [];
    for (let start = 0; start < totalPages; start += PAGES_PER_CHUNK) {
      const end = Math.min(start + PAGES_PER_CHUNK - 1, totalPages - 1);
      chunkTasks.push({ start, end });
    }

    // STREAMING MODE: Memory-efficient streaming of chunk results & progress
    if (isStreamRequested) {
      const encoder = new TextEncoder();

      let isClosed = false;

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: any) => {
            if (isClosed) return;
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
            } catch {
              isClosed = true;
            }
          };

          const safeClose = () => {
            if (!isClosed) {
              isClosed = true;
              try {
                controller.close();
              } catch {
                // Ignore if already closed by runtime
              }
            }
          };

          const allTransactions: Record<string, string>[] = [];
          const CONCURRENCY = 2; // Controlled concurrency to respect rate limits

          try {
            sendEvent({
              type: 'start',
              totalPages,
              totalChunks: chunkTasks.length,
              pageSize: PAGES_PER_CHUNK
            });

            for (let i = 0; i < chunkTasks.length; i += CONCURRENCY) {
              if (isClosed) break;

              const batch = chunkTasks.slice(i, i + CONCURRENCY);
              
              const batchResults = await Promise.all(
                batch.map(async (task, taskIdx) => {
                  if (isClosed) return null;

                  const chunkNumber = i + taskIdx + 1;
                  const pageIndices: number[] = [];
                  for (let p = task.start; p <= task.end; p++) {
                    pageIndices.push(p);
                  }

                  // Build chunk PDF in isolated memory
                  const subDoc = await PDFDocument.create();
                  const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
                  copiedPages.forEach(p => subDoc.addPage(p));
                  const subPdfBytes = await subDoc.save();
                  const subBuffer = Buffer.from(subPdfBytes);

                  const chunkResult = await processPdfChunk({
                    ai: ai!,
                    pdfBuffer: subBuffer,
                    bank,
                    expectedColumns,
                    promptToUse,
                    startPage: task.start + 1,
                    endPage: task.end + 1,
                    totalPages
                  });

                  return {
                    chunkNumber,
                    startPage: task.start + 1,
                    endPage: task.end + 1,
                    transactions: chunkResult
                  };
                })
              );

              if (isClosed) break;

              for (const res of batchResults) {
                if (!res) continue;
                if (Array.isArray(res.transactions)) {
                  allTransactions.push(...res.transactions);
                }
                const progressPct = Math.min(95, Math.round((res.chunkNumber / chunkTasks.length) * 90) + 5);
                
                sendEvent({
                  type: 'chunk_progress',
                  chunkNumber: res.chunkNumber,
                  totalChunks: chunkTasks.length,
                  startPage: res.startPage,
                  endPage: res.endPage,
                  chunkExtracted: res.transactions.length,
                  totalExtractedSoFar: allTransactions.length,
                  progress: progressPct
                });
              }

              // Inter-batch throttling pause for rate limit safety
              if (i + CONCURRENCY < chunkTasks.length && !isClosed) {
                await new Promise(r => setTimeout(r, 600));
              }
            }

            if (isClosed) return;

            // Filter empty or header echo rows
            const cleanedTransactions = allTransactions.filter(item => {
              if (!item || typeof item !== 'object') return false;
              const values = Object.values(item).map(v => String(v || '').trim());
              if (values.every(v => v === '')) return false;
              if (item.Dia === 'Dia' || item.Data === 'Data' || item.DATA === 'DATA') return false;
              return true;
            });

            if (cleanedTransactions.length === 0) {
              sendEvent({
                type: 'error',
                error: `Nenhuma movimentação bancária foi identificada nas ${totalPages} páginas do PDF.`
              });
              safeClose();
              return;
            }

            // Generate output file
            const { buffer: docBuffer, mimeType, extension } = generateOutputDocument(
              cleanedTransactions,
              expectedColumns,
              outputFormat,
              bank
            );

            const downloadFileName = `extrato_${bank}_${Date.now()}.${extension}`;
            const base64Content = docBuffer.toString('base64');

            sendEvent({
              type: 'done',
              status: 'success',
              totalCount: cleanedTransactions.length,
              totalPages,
              filename: downloadFileName,
              format: outputFormat,
              mimeType,
              base64: base64Content
            });

            safeClose();
          } catch (streamErr: any) {
            console.error('Erro no stream de processamento:', streamErr);
            sendEvent({
              type: 'error',
              error: streamErr?.message || 'Erro inesperado no processamento de páginas.'
            });
            safeClose();
          }
        },
        cancel() {
          isClosed = true;
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    // NON-STREAMING DIRECT MODE: Batch processing
    const allTransactions: Record<string, string>[] = [];
    const CONCURRENCY = 2;

    for (let i = 0; i < chunkTasks.length; i += CONCURRENCY) {
      const batch = chunkTasks.slice(i, i + CONCURRENCY);
      
      const batchResults = await Promise.all(
        batch.map(async (task) => {
          const pageIndices: number[] = [];
          for (let p = task.start; p <= task.end; p++) {
            pageIndices.push(p);
          }

          const subDoc = await PDFDocument.create();
          const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(p => subDoc.addPage(p));
          const subPdfBytes = await subDoc.save();
          const subBuffer = Buffer.from(subPdfBytes);

          return processPdfChunk({
            ai: ai!,
            pdfBuffer: subBuffer,
            bank,
            expectedColumns,
            promptToUse,
            startPage: task.start + 1,
            endPage: task.end + 1,
            totalPages
          });
        })
      );

      for (const res of batchResults) {
        if (Array.isArray(res)) {
          allTransactions.push(...res);
        }
      }

      if (i + CONCURRENCY < chunkTasks.length) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // Filter empty or repeat header rows
    const cleanedTransactions = allTransactions.filter(item => {
      if (!item || typeof item !== 'object') return false;
      const values = Object.values(item).map(v => String(v || '').trim());
      if (values.every(v => v === '')) return false;
      if (item.Dia === 'Dia' || item.Data === 'Data' || item.DATA === 'DATA') return false;
      return true;
    });

    if (cleanedTransactions.length === 0) {
      throw new Error(`Nenhuma movimentação bancária foi identificada nas ${totalPages} páginas do PDF. Verifique se o arquivo é um extrato válido.`);
    }

    const { buffer: docBuffer, mimeType, extension } = generateOutputDocument(
      cleanedTransactions,
      expectedColumns,
      outputFormat,
      bank
    );

    const count = cleanedTransactions.length;
    const downloadFileName = `extrato_${bank}_${Date.now()}.${extension}`;

    return new NextResponse(new Uint8Array(docBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'X-Transactions-Count': count.toString(),
        'X-Pages-Processed': totalPages.toString(),
        'X-Bank-Processed': bank,
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Transactions-Count, X-Pages-Processed, X-Bank-Processed'
      }
    });

  } catch (error: any) {
    console.error('Erro no processamento de extrato:', error);
    return NextResponse.json({ 
      error: error.message || 'Ocorreu um erro interno durante o processamento do extrato.' 
    }, { status: 500 });
  }
}
