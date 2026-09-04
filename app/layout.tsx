import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

export const metadata: Metadata = {
  title: 'Extrato Inteligente - Conversor de PDF',
  description: 'Conversão nativa de extratos bancários em PDF para Excel e CSV com reconstrução automática via IA.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${firaCode.variable}`}>
      <body className="bg-background text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary selection:text-on-primary">
        <Header />
        <div className="flex-1 flex flex-col w-full relative">
          {children}
        </div>
      </body>
    </html>
  );
}

