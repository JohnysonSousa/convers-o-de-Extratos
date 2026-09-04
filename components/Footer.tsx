import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto flex flex-col md:flex-row justify-between items-center px-6 py-6 bg-surface-dim border-t border-outline-variant w-full shrink-0">
      <span className="font-body-md text-[13px] text-on-surface-variant opacity-80">
        © 2024 Extrato Inteligente - Processamento de Dados Financeiros de Alta Precisão. Todos os direitos reservados.
      </span>
      <div className="flex gap-4 mt-2 md:mt-0">
        <Link href="#" className="font-label-md text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors opacity-80">Termos de Uso</Link>
        <Link href="#" className="font-label-md text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors opacity-80">Política de Privacidade</Link>
        <Link href="#" className="font-label-md text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors opacity-80">Suporte Técnico</Link>
      </div>
    </footer>
  );
}
