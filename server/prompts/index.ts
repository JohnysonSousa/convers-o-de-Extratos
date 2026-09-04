import { itauPrompt } from './itau';
import { bancoDoBrasilPrompt } from './banco-do-brasil';
import { tribancoPrompt } from './tribanco';
import { stonePrompt } from './stone';
import { bradescoPrompt } from './bradesco';
import { caixaPrompt } from './caixa';
import { santanderPrompt } from './santander';
import { bnbPrompt } from './bnb';

export {
  itauPrompt,
  bancoDoBrasilPrompt,
  tribancoPrompt,
  stonePrompt,
  bradescoPrompt,
  caixaPrompt,
  santanderPrompt,
  bnbPrompt
};

export const BANK_PROMPTS: Record<string, string> = {
  itau: itauPrompt,
  banco_do_brasil: bancoDoBrasilPrompt,
  tribanco: tribancoPrompt,
  stone: stonePrompt,
  bradesco: bradescoPrompt,
  caixa: caixaPrompt,
  santander: santanderPrompt,
  bnb: bnbPrompt
};

export function getPromptForBank(bankId: string): string | undefined {
  return BANK_PROMPTS[bankId];
}
