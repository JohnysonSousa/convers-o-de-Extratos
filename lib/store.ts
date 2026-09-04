import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bank {
  id: string;
  name: string;
  code?: string;
  status?: 'Ativo' | 'Inativo' | 'Em Teste' | 'Em Manutenção';
  version?: string;
  prompt?: string;
  promptKey?: string;
  logoUrl?: string;
  logo?: string;
  protected?: boolean;
  color?: string;
  initials?: string;
}

interface AppState {
  banks: Bank[];
  addBank: (bank: Omit<Bank, 'id' | 'version'>) => void;
  updateBank: (id: string, data: Partial<Bank>) => void;
  deleteBank: (id: string) => void;
  setBanks: (banks: Bank[]) => void;
}

export const DEFAULT_BANKS: Bank[] = [
  {
    id: "itau",
    name: "Itaú",
    promptKey: "itau",
    logo: "/banks/itau.svg",
    color: "#EC7000",
    initials: "IT",
    version: "v2.1.0",
    status: "Ativo",
    protected: true,
  },
  {
    id: "banco_do_brasil",
    name: "Banco do Brasil",
    promptKey: "banco_do_brasil",
    logo: "/banks/banco-do-brasil.svg",
    color: "#FCED1B",
    initials: "BB",
    version: "v2.4.0",
    status: "Ativo",
    protected: true,
  },
  {
    id: "tribanco",
    name: "Tribanco",
    promptKey: "tribanco",
    logo: "/banks/tribanco.svg",
    color: "#00C48C",
    initials: "TR",
    version: "v1.9.0",
    status: "Ativo",
    protected: true,
  },
  {
    id: "stone",
    name: "Stone",
    promptKey: "stone",
    logo: "/banks/stone.svg",
    color: "#00A868",
    initials: "ST",
    version: "v1.8.0",
    status: "Ativo",
    protected: true,
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
  },
  {
    id: "santander",
    name: "Santander",
    promptKey: "santander",
    logo: "/banks/santander.svg",
    color: "#CC0000",
    initials: "ST",
    version: "v2.2.0",
    status: "Ativo",
    protected: true,
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
  }
];

export const defaultBanks = DEFAULT_BANKS;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      banks: DEFAULT_BANKS,
      setBanks: (banks) => set({ banks }),
      addBank: (bankData) => set((state) => ({
        banks: [
          ...state.banks,
          {
            ...bankData,
            id: `bank_${Date.now()}`,
            version: 'v1.0.0'
          }
        ]
      })),
      updateBank: (id, data) => set((state) => ({
        banks: state.banks.map(b => b.id === id ? { ...b, ...data } : b)
      })),
      deleteBank: (id) => set((state) => ({
        banks: state.banks.filter(b => b.id !== id)
      }))
    }),
    {
      name: 'extrato-inteligente-storage',
      merge: (persistedState: any, currentState: AppState) => {
        const persistedBanks = persistedState?.banks || [];
        const defaultIds = new Set(DEFAULT_BANKS.map(b => b.id));
        const mergedDefaults = DEFAULT_BANKS.map(def => {
          const existing = persistedBanks.find((b: Bank) => b.id === def.id);
          return existing ? { ...def, ...existing, logo: def.logo } : def;
        });
        const customOnly = persistedBanks.filter((b: Bank) => !defaultIds.has(b.id));
        return {
          ...currentState,
          ...(persistedState || {}),
          banks: [...mergedDefaults, ...customOnly]
        };
      }
    }
  )
);
