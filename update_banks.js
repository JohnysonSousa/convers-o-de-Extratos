const fs = require('fs');
let code = fs.readFileSync('app/api/banks/route.ts', 'utf-8');

const newDefaultBanks = `const DEFAULT_BANKS = [
  {
    id: "itau",
    name: "Itaú",
    promptKey: "itau",
    logo: "/banks/itau.svg",
    protected: true
  },
  {
    id: "banco_do_brasil",
    name: "Banco do Brasil",
    promptKey: "banco_do_brasil",
    logo: "/banks/banco-do-brasil.svg",
    protected: true
  },
  {
    id: "tribanco",
    name: "Tribanco",
    promptKey: "tribanco",
    logo: "/banks/tribanco.svg",
    protected: true
  },
  {
    id: "stone",
    name: "Stone",
    promptKey: "stone",
    logo: "/banks/stone.svg",
    protected: true
  },
  {
    id: "bradesco",
    name: "Bradesco",
    promptKey: "bradesco",
    logo: "/banks/bradesco.svg",
    protected: true
  },
  {
    id: "caixa",
    name: "Caixa",
    promptKey: "caixa",
    logo: "/banks/caixa.svg",
    protected: true
  },
  {
    id: "santander",
    name: "Santander",
    promptKey: "santander",
    logo: "/banks/santander.svg",
    protected: true
  }
];`;

code = code.replace(/const DEFAULT_BANKS = \[[\s\S]*?\];/, newDefaultBanks);

fs.writeFileSync('app/api/banks/route.ts', code);
