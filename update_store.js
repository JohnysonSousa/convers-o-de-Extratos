const fs = require('fs');
let code = fs.readFileSync('lib/store.ts', 'utf-8');

code = code.replace(
  "status: 'Ativo' | 'Inativo' | 'Em Teste' | 'Em Manutenção';",
  "status?: 'Ativo' | 'Inativo' | 'Em Teste' | 'Em Manutenção';"
);
code = code.replace("version: string;", "version?: string;");
code = code.replace("prompt: string;", "prompt?: string;\n  promptKey?: string;");
code = code.replace("code: string;", "code?: string;");
code = code.replace("logoUrl?: string;", "logoUrl?: string;\n  logo?: string;\n  protected?: boolean;");

fs.writeFileSync('lib/store.ts', code);
