"use client";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Check, 
  Cpu, 
  Table, 
  FileJson, 
  Rocket, 
  ScanText, 
  Building2, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  X,
  Download,
  Info,
  RotateCcw,
  Trash2
} from 'lucide-react';
import Footer from '@/components/Footer';
import { useAppStore, Bank } from '@/lib/store';

type ProcessingState = 'idle' | 'processing' | 'done' | 'error';

interface QueuedFile {
  id: string;
  file: File;
  status: ProcessingState;
  progress: number;
  statusDetails?: string;
  transactionsCount?: string | number;
  downloadUrl?: string;
  downloadFilename?: string;
  errorMessage?: string;
}

interface AuditReport {
  fileName: string;
  bankName: string;
  transactionsCount: string;
  status: 'success' | 'error';
  message: string;
}

export default function ConverterPDF() {
  const { banks, setBanks } = useAppStore();
  const activeBanks = banks.filter(b => !b.status || b.status === 'Ativo' || b.status === 'Em Manutenção');
  
  const [selectedBankId, setSelectedBankId] = useState<string>('itau');
  const [outputFormat, setOutputFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [filesQueue, setFilesQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBank = banks.find(b => b.id === selectedBankId) || activeBanks[0];

  useEffect(() => {
    fetch('/api/banks')
      .then(async res => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBanks(data);
          if (!selectedBankId) {
            setSelectedBankId(data[0].id);
          }
        }
      })
      .catch(err => console.warn("Notice: Using cached banks:", err));
  }, [setBanks, selectedBankId]);

  const handleFilesAdded = (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const newFiles: QueuedFile[] = pdfFiles.map((file, idx) => ({
      id: `${file.name}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: 'idle',
      progress: 0
    }));

    setFilesQueue(prev => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFilesQueue(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (filesQueue.length === 0 || !selectedBank) return;
    setIsProcessing(true);
    setAuditReports([]);

    const updatedQueue = [...filesQueue];
    const newReports: AuditReport[] = [];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status === 'done') continue;
      
      updatedQueue[i].status = 'processing';
      updatedQueue[i].progress = 10;
      updatedQueue[i].statusDetails = 'Iniciando leitura e particionamento do PDF...';
      updatedQueue[i].errorMessage = undefined;
      setFilesQueue([...updatedQueue]);

      let attempts = 0;
      const maxClientAttempts = 2;
      let success = false;

      while (attempts < maxClientAttempts && !success) {
        attempts++;
        try {
          const formData = new FormData();
          formData.append('bank', selectedBank.id);
          formData.append('output_format', outputFormat);
          formData.append('pdf', updatedQueue[i].file);
          formData.append('stream', 'true');

          const response = await fetch('/api/process', {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/x-ndjson, text/event-stream, */*'
            }
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            const isTemporarySpike = response.status === 503 || 
              (typeof errData.error === 'string' && (
                errData.error.includes('alta demanda') || 
                errData.error.includes('503') || 
                errData.error.includes('UNAVAILABLE')
              ));

            if (isTemporarySpike && attempts < maxClientAttempts) {
              updatedQueue[i].statusDetails = 'Aguardando liberação de cota do motor de IA...';
              setFilesQueue([...updatedQueue]);
              await new Promise(r => setTimeout(r, 2500));
              continue;
            }
            throw new Error(errData.error || 'Erro no processamento do extrato');
          }

          const contentType = response.headers.get('content-type') || '';

          // Streamed NDJSON response handling
          if (contentType.includes('application/x-ndjson') || contentType.includes('text/event-stream')) {
            const reader = response.body?.getReader();
            if (!reader) throw new Error('Não foi possível inicializar stream de leitura do servidor.');

            const decoder = new TextDecoder('utf-8');
            let bufferStr = '';
            let finalResult: any = null;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              bufferStr += decoder.decode(value, { stream: true });
              const lines = bufferStr.split('\n');
              bufferStr = lines.pop() || ''; // Keep remainder

              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;

                try {
                  const event = JSON.parse(cleanLine);
                  if (event.type === 'start') {
                    updatedQueue[i].progress = 12;
                    updatedQueue[i].statusDetails = `PDF com ${event.totalPages} páginas dividido em ${event.totalChunks} lotes...`;
                    setFilesQueue([...updatedQueue]);
                  } else if (event.type === 'chunk_progress') {
                    updatedQueue[i].progress = event.progress;
                    updatedQueue[i].statusDetails = `Lote ${event.chunkNumber}/${event.totalChunks}: Páginas ${event.startPage}-${event.endPage} (${event.totalExtractedSoFar} movimentações extraídas)`;
                    setFilesQueue([...updatedQueue]);
                  } else if (event.type === 'done') {
                    finalResult = event;
                  } else if (event.type === 'error') {
                    throw new Error(event.error || 'Erro durante o processamento do lote.');
                  }
                } catch (parseErr: any) {
                  if (parseErr.message && !parseErr.message.includes('JSON')) {
                    throw parseErr;
                  }
                }
              }
            }

            if (!finalResult) {
              throw new Error('O servidor encerrou a transmissão sem gerar o arquivo final.');
            }

            // Convert base64 to binary Blob and download
            const cleanB64 = (finalResult.base64 || '').replace(/[\r\n\s]/g, '');
            const byteChars = atob(cleanB64);
            const byteArray = new Uint8Array(byteChars.length);
            for (let b = 0; b < byteChars.length; b++) {
              byteArray[b] = byteChars.charCodeAt(b);
            }
            const blob = new Blob([byteArray], { 
              type: finalResult.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const filename = finalResult.filename;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            updatedQueue[i].status = 'done';
            updatedQueue[i].progress = 100;
            updatedQueue[i].statusDetails = `Concluído (${finalResult.totalPages} páginas, ${finalResult.totalCount} movimentações)`;
            updatedQueue[i].transactionsCount = finalResult.totalCount;
            updatedQueue[i].downloadFilename = filename;
            updatedQueue[i].downloadUrl = url;

            newReports.push({
              fileName: updatedQueue[i].file.name,
              bankName: selectedBank.name,
              transactionsCount: String(finalResult.totalCount),
              status: 'success',
              message: `Extração integral em lotes concluída com sucesso. ${finalResult.totalCount} movimentações identificadas de todas as ${finalResult.totalPages} páginas e estruturadas em .${outputFormat.toUpperCase()}.`
            });
            success = true;

          } else {
            // Direct file download fallback
            updatedQueue[i].progress = 85;
            setFilesQueue([...updatedQueue]);

            const count = response.headers.get('X-Transactions-Count') || '0';
            const pagesProcessed = response.headers.get('X-Pages-Processed') || '';
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition');
            
            const fileTime = updatedQueue[i].file.lastModified || i;
            let filename = `extrato_${selectedBank.id}_${fileTime}.${outputFormat}`;
            if (disposition && disposition.indexOf('filename=') !== -1) {
              const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
              if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
              }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            updatedQueue[i].status = 'done';
            updatedQueue[i].progress = 100;
            updatedQueue[i].transactionsCount = count;
            updatedQueue[i].downloadFilename = filename;
            updatedQueue[i].downloadUrl = url;

            const pagesText = pagesProcessed ? ` de todas as ${pagesProcessed} páginas` : '';
            newReports.push({
              fileName: updatedQueue[i].file.name,
              bankName: selectedBank.name,
              transactionsCount: count,
              status: 'success',
              message: `Extração integral concluída com sucesso. ${count} movimentações identificadas${pagesText} e estruturadas em .${outputFormat.toUpperCase()}.`
            });
            success = true;
          }

        } catch (error: any) {
          if (attempts >= maxClientAttempts) {
            console.error("Erro no processamento:", error);
            
            let cleanMessage = error?.message || 'Erro ao processar o arquivo';
            if (cleanMessage.toLowerCase().includes('failed to fetch')) {
              cleanMessage = 'Conexão com o servidor interrompida. Por favor, tente processar novamente.';
            }
            try {
              if (cleanMessage.startsWith('{')) {
                const parsed = JSON.parse(cleanMessage);
                if (parsed?.error?.message) {
                  cleanMessage = parsed.error.message;
                } else if (parsed?.error) {
                  cleanMessage = String(parsed.error);
                }
              }
            } catch {
              // Keep cleanMessage
            }

            updatedQueue[i].status = 'error';
            updatedQueue[i].errorMessage = cleanMessage;

            newReports.push({
              fileName: updatedQueue[i].file.name,
              bankName: selectedBank.name,
              transactionsCount: '0',
              status: 'error',
              message: cleanMessage
            });
          }
        }
      }

      setFilesQueue([...updatedQueue]);
      setAuditReports([...newReports]);
    }

    setIsProcessing(false);
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-background">
      <div className="p-6 pb-6 flex-1 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-[24px] font-bold text-text-primary mb-1">Conversão de Extratos Bancários</h2>
            <p className="font-body-md text-text-muted">Extração nativa via IA para Excel (.xlsx) e CSV com reconstrução automática entre páginas.</p>
          </div>
          <div className="flex items-center gap-2 bg-[#0B1628] border border-border-subtle px-3 py-1.5 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="font-label-md text-[11px] font-semibold text-text-muted uppercase tracking-widest">Motor OCR & Reconstrução Ativo</span>
          </div>
        </div>

        {auditReports.length > 0 && (
          <div className="mb-6 space-y-3">
            {auditReports.map((report, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded border flex items-start gap-3 transition-all ${
                  report.status === 'success' 
                    ? 'bg-[#0B1E19] border-emerald-500/40 text-emerald-300' 
                    : 'bg-[#240F14] border-red-500/40 text-red-300'
                }`}
              >
                {report.status === 'success' ? (
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{report.fileName}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-black/30 font-data-mono">
                      {report.bankName} • {report.transactionsCount} lançamentos
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-200">{report.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* 1. SELEÇÃO DO BANCO */}
            <div className="bg-surface-elevated border border-border-subtle rounded flex flex-col">
              <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center bg-[#0B1628]">
                <h3 className="font-label-md text-[11px] font-semibold text-text-primary uppercase tracking-wider">1. Seleção de Origem Institucional</h3>
                <Building2 size={16} className="text-text-muted" />
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {activeBanks.map(bank => {
                    const isSelected = selectedBankId === bank.id;
                    const altText = bank.name === 'Stone' || bank.name === 'Caixa' 
                      ? `Logotipo da ${bank.name}` 
                      : `Logotipo do ${bank.name}`;
                      
                    return (
                      <button 
                        key={bank.id}
                        id={`bank-btn-${bank.id}`}
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`flex flex-col items-center justify-center p-3 border rounded transition-all relative overflow-hidden group text-center ${
                          isSelected 
                            ? 'border-[#3B82F6] bg-[#1A2B47] ring-1 ring-[#3B82F6]' 
                            : 'border-border-subtle bg-[#0D1829] hover:bg-[#16253E] hover:border-[#3B82F6]/60 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-[#3B82F6] rounded-bl-xl z-10 flex items-start justify-end p-1">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                        <div className="w-full h-[52px] max-w-[120px] mb-2.5 flex items-center justify-center">
                          {(bank.logo || bank.logoUrl) ? (
                            <div className="relative w-full h-full bg-white rounded-md flex items-center justify-center p-1.5 border border-slate-700/40 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]">
                              <Image 
                                src={bank.logo || bank.logoUrl || ''} 
                                fill 
                                referrerPolicy='no-referrer' 
                                alt={altText} 
                                className="object-contain p-1" 
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded flex items-center justify-center text-[13px] font-bold text-white shadow-sm" style={{backgroundColor: bank.color || '#2563EB'}}>
                              {bank.initials || bank.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className={`font-label-md text-[12px] font-semibold tracking-wide ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {bank.name}
                        </span>
                        {isSelected && <span className="sr-only">Banco selecionado: {bank.name}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. UPLOAD DE PDF COM DRAG AND DROP */}
            <div className="bg-surface-elevated border border-border-subtle rounded flex flex-col flex-1 min-h-[280px]">
              <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center bg-[#0B1628]">
                <h3 className="font-label-md text-[11px] font-semibold text-text-primary uppercase tracking-wider">2. Ingestão de Extrato Bancário (PDF)</h3>
                <FileText size={16} className="text-text-muted" />
              </div>
              <div className="p-6 flex-1 flex flex-col relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept=".pdf,application/pdf" 
                  className="hidden" 
                  id="pdf-file-input"
                />
                <div 
                  id="pdf-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 border-2 border-dashed rounded flex flex-col items-center justify-center p-8 transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-[#3B82F6] bg-[#162B4D]' 
                      : 'border-outline-variant hover:border-[#3B82F6] bg-[#08111F]'
                  }`}
                >
                  <ScanText size={40} className="text-outline-variant mb-4" />
                  <p className="font-body-md text-[14px] text-text-primary font-medium mb-1">
                    Arraste e solte o extrato bancário em PDF aqui
                  </p>
                  <p className="font-body-sm text-[12px] text-text-muted mb-4">
                    ou clique para procurar no seu dispositivo
                  </p>
                  <button 
                    type="button"
                    className="bg-[#1A2B47] text-white border border-[#263650] px-5 py-2.5 rounded font-label-md text-[12px] font-semibold hover:bg-[#22385C] hover:border-[#3B82F6] transition-colors shadow-sm"
                  >
                    Selecionar Arquivos PDF
                  </button>
                  <p className="font-body-sm text-[11px] text-text-muted mt-4 opacity-80 text-center max-w-md">
                    Processamento com inteligência artificial para reconstrução entre páginas, tabelas contínuas e sem perda de zeros à esquerda.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* INFORMAÇÕES DO BANCO SELECIONADO */}
            {selectedBank && (
              <div className="bg-surface-elevated border border-border-subtle rounded flex flex-col">
                <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center bg-[#0B1628]">
                  <div className="flex items-center gap-2.5">
                    {(selectedBank.logo || selectedBank.logoUrl) ? (
                      <div className="relative w-6 h-6 rounded bg-white overflow-hidden shrink-0 flex items-center justify-center p-0.5 border border-slate-700/50 shadow-sm">
                        <Image 
                          src={selectedBank.logo || selectedBank.logoUrl || ''} 
                          fill 
                          referrerPolicy="no-referrer" 
                          alt={selectedBank.name} 
                          className="object-contain p-0.5" 
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{backgroundColor: selectedBank.color || '#2563EB'}}>
                        {selectedBank.initials || selectedBank.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <h3 className="font-label-md text-[11px] font-semibold text-text-primary uppercase tracking-wider">{selectedBank.name}</h3>
                  </div>
                  <Cpu size={16} className="text-text-muted" />
                </div>
                <div className="p-0">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-border-subtle hover:bg-[#1A2B47]">
                        <td className="py-2.5 px-4 font-body-sm text-[12px] text-text-muted">Prompt Especializado</td>
                        <td className="py-2.5 px-4 font-data-mono text-[12px] text-text-primary text-right font-medium">
                          {selectedBank.id.toUpperCase()}
                        </td>
                      </tr>
                      <tr className="border-b border-border-subtle hover:bg-[#1A2B47]">
                        <td className="py-2.5 px-4 font-body-sm text-[12px] text-text-muted">Versão do Prompt</td>
                        <td className="py-2.5 px-4 font-data-mono text-[12px] text-text-primary text-right">{selectedBank.version || 'v2.0'}</td>
                      </tr>
                      <tr className="hover:bg-[#1A2B47]">
                        <td className="py-2.5 px-4 font-body-sm text-[12px] text-text-muted">Reconstrução Multilinha</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 bg-[#3B82F6]/20 text-[#3B82F6] rounded text-[10px] font-bold uppercase tracking-wider">Ativado</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FILA DE ARQUIVOS */}
            <div className="bg-surface-elevated border border-border-subtle rounded flex flex-col flex-1">
              <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center bg-[#0B1628]">
                <h3 className="font-label-md text-[11px] font-semibold text-text-primary uppercase tracking-wider">Fila de Processamento</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted font-data-mono">{filesQueue.length} {filesQueue.length === 1 ? 'Arquivo' : 'Arquivos'}</span>
                  {filesQueue.length > 0 && !isProcessing && (
                    <button
                      id="btn-clear-queue"
                      type="button"
                      onClick={() => {
                        setFilesQueue([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                      title="Limpar todos os arquivos da fila"
                    >
                      <Trash2 size={12} />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-0 flex-1 overflow-y-auto max-h-[260px]">
                {filesQueue.length === 0 ? (
                  <div className="h-full min-h-[120px] flex items-center justify-center p-6 opacity-60">
                    <p className="font-body-sm text-[12px] text-text-muted text-center">Nenhum arquivo na fila de conversão.</p>
                  </div>
                ) : (
                  filesQueue.map(file => (
                    <div key={file.id} className="p-3 border-b border-border-subtle flex items-start gap-3 hover:bg-[#1A2B47] transition-colors relative group">
                      {file.status === 'done' ? (
                        <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : file.status === 'processing' ? (
                        <RefreshCw size={18} className="text-[#3B82F6] mt-0.5 shrink-0 animate-spin" />
                      ) : file.status === 'error' ? (
                        <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                      ) : (
                        <FileText size={18} className="text-text-muted mt-0.5 shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-data-mono text-[13px] text-text-primary truncate">{file.file.name}</p>
                        {file.status === 'processing' ? (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex justify-between items-center text-[11px] text-[#3B82F6]">
                              <span className="truncate pr-2">{file.statusDetails || 'Processando em lotes com IA...'}</span>
                              <span className="font-data-mono shrink-0 font-medium">{file.progress}%</span>
                            </div>
                            <div className="w-full bg-[#0D1829] h-1.5 rounded overflow-hidden">
                              <div className="bg-[#3B82F6] h-full transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                            </div>
                          </div>
                        ) : file.status === 'done' ? (
                          <p className="font-body-sm text-[11px] text-emerald-400 mt-0.5">
                            Extraído ({file.transactionsCount} lançamentos)
                          </p>
                        ) : file.status === 'error' ? (
                          <p className="font-body-sm text-[11px] text-red-400 mt-0.5 truncate">
                            {file.errorMessage}
                          </p>
                        ) : (
                          <p className="font-body-sm text-[12px] text-text-muted mt-0.5">{(file.file.size / 1024).toFixed(1)} KB</p>
                        )}
                      </div>
                      
                      {file.status === 'done' && (
                        <div className="flex items-center gap-1 shrink-0">
                          {file.downloadUrl && (
                            <a 
                              href={file.downloadUrl}
                              download={file.downloadFilename || `extrato_${file.file.name.replace(/\.pdf$/i, '')}.${outputFormat}`}
                              className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors flex items-center gap-1 text-[11px] font-semibold"
                              title="Baixar arquivo novamente"
                            >
                              <Download size={14} />
                              <span className="hidden sm:inline">Baixar</span>
                            </a>
                          )}
                          <button 
                            type="button"
                            onClick={() => removeFile(file.id)} 
                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remover este extrato da lista"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {file.status === 'error' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={async () => {
                              setFilesQueue(prev => prev.map(f => f.id === file.id ? { ...f, status: 'idle', errorMessage: undefined } : f));
                              setTimeout(() => {
                                processFiles();
                              }, 50);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                            title="Tentar processar novamente"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeFile(file.id)} 
                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remover arquivo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {file.status === 'idle' && (
                        <div className="flex items-center shrink-0">
                          <button 
                            type="button"
                            onClick={() => removeFile(file.id)} 
                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remover este extrato da fila"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SELEÇÃO DO FORMATO E BOTÃO PROCESSAR */}
            <div className="bg-surface-elevated border border-border-subtle rounded flex flex-col p-4">
              <div className="mb-4">
                <label className="font-label-md text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
                  Formato de Saída
                </label>
                <div className="flex gap-2">
                  <button 
                    id="btn-format-xlsx"
                    type="button"
                    onClick={() => setOutputFormat('xlsx')}
                    className={`flex-1 py-2 border ${
                      outputFormat === 'xlsx' 
                        ? 'border-[#3B82F6] bg-[#1A2B47] text-white ring-1 ring-[#3B82F6]/50 font-bold' 
                        : 'border-border-subtle bg-[#0B1422] text-slate-300 hover:text-white hover:bg-[#15233A]'
                    } font-label-md text-[11px] rounded flex items-center justify-center gap-2 transition-colors`}
                  >
                    <Table size={14} /> .XLSX (Excel)
                  </button>
                  <button 
                    id="btn-format-csv"
                    type="button"
                    onClick={() => setOutputFormat('csv')}
                    className={`flex-1 py-2 border ${
                      outputFormat === 'csv' 
                        ? 'border-[#3B82F6] bg-[#1A2B47] text-white ring-1 ring-[#3B82F6]/50 font-bold' 
                        : 'border-border-subtle bg-[#0B1422] text-slate-300 hover:text-white hover:bg-[#15233A]'
                    } font-label-md text-[11px] rounded flex items-center justify-center gap-2 transition-colors`}
                  >
                    <FileJson size={14} /> .CSV (UTF-8 BOM)
                  </button>
                </div>
              </div>

              <button 
                id="btn-process-download"
                onClick={processFiles}
                disabled={filesQueue.length === 0 || isProcessing}
                className={`w-full font-label-md text-[11px] font-semibold tracking-wider py-3.5 rounded flex items-center justify-center gap-2 transition-all shadow-md ${
                  filesQueue.length === 0 || isProcessing 
                    ? 'bg-[#1E293B] text-slate-400 border border-[#334155] cursor-not-allowed' 
                    : 'bg-[#2563EB] hover:bg-[#3B82F6] active:bg-[#1D4ED8] text-white ring-1 ring-blue-400/30'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-white" /> 
                    PROCESSANDO COM IA...
                  </>
                ) : (
                  <>
                    <Rocket size={16} className="text-white" /> 
                    PROCESSAR E BAIXAR
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
