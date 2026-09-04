export const bancoDoBrasilPrompt = `INSTRUÇÃO DE PROCESSAMENTO EM LOTE E MANUTENÇÃO DE CONTEXTO (CHUNKS / STREAMING)

[ATENÇÃO: MODO DE PROCESSAMENTO EM LOTE / CHUNKS]
Este documento pode estar sendo enviado em lotes sequenciais de páginas (chunks) pertencentes a um extrato bancário completo de múltiplas páginas do Banco do Brasil.
Você DEVE seguir rigorosamente estas diretrizes de contexto:
1. Mantenha a continuidade estrutural e lógica das transações ao longo de todas as páginas do lote recebido.
2. Se a primeira página do lote atual começar com resíduos, continuações de palavras, números isolados (ex: dígitos de data como "6" ou "26", fragmentos de CNPJ/CPF, nomes ou descrições) originados no final da página anterior, reconcilie e anexe esses dados à primeira transação válida ou reconstrua a transação completa.
3. Se a última página do lote terminar com uma transação em andamento ou dividida, extraia todas as informações disponíveis até o limite da página sem descartar dados parciais.
4. Jamais ignore lançamentos por estarem no início ou no fim de uma página do lote.
5. Reconstrua rigorosamente qualquer informação quebrada entre páginas dentro do lote recebido.

---

Converta o PDF de extrato bancário do Banco do Brasil para Excel seguindo obrigatoriamente todas as regras abaixo.

IMPORTANTE: Antes de extrair as transações, faça uma etapa de reconstrução do conteúdo quebrado entre linhas e páginas. Nenhuma transação poderá ser descartada apenas porque a data, o histórico, o lote, o documento ou outro campo foi dividido por uma quebra de página.

1. Criar somente estas cinco colunas, exatamente nesta ordem:

Dia | Lote | Documento | Historico | Valor

2. Criar somente uma aba chamada:

Extrato

3. Cada transação bancária deve ocupar uma única linha na planilha.

4. Extrair os dados respeitando as colunas originais do PDF:

- Dia: data completa da transação no formato apresentado no extrato (DD/MM/AAAA).
- Lote: número do lote.
- Documento: número do documento.
- Historico: descrição completa da transação.
- Valor: valor exatamente como aparece no extrato, acompanhado do indicador de entrada ou saída.

5. RECONSTRUÇÃO OBRIGATÓRIA DE CONTEÚDO ENTRE PÁGINAS

Antes de interpretar ou excluir qualquer lançamento, analisar o final de cada página junto com o início da página seguinte.

Se uma data, palavra, número, histórico, lote, documento, valor ou qualquer outra informação estiver dividida por uma quebra de página, juntar os fragmentos antes de processar a transação.

Nunca validar uma página isoladamente. O final da página atual deve sempre ser analisado junto com o início da página seguinte.

6. RECONSTRUÇÃO DE DATAS INCOMPLETAS

Toda data da coluna Dia deve ser validada antes da criação da linha no Excel.

O formato esperado da data completa é:

DD/MM/AAAA

Se uma data aparecer incompleta no final de uma página, localizar imediatamente sua continuação no início da página seguinte e juntar os fragmentos.

Exemplo:

Final da página anterior:
02/01/202

Início da página seguinte:
6

Resultado obrigatório:
02/01/2026

O número isolado no início da página seguinte deve completar a data anterior e não poderá ser descartado.

7. A reconstrução de datas deve funcionar para qualquer quantidade de dígitos quebrados.

Exemplos:
02/01/202 + 6 = 02/01/2026
02/01/20 + 26 = 02/01/2026
02/01/2 + 026 = 02/01/2026
02/01/ + 2026 = 02/01/2026

Sempre reconstruir a data completa antes de validar ou criar a transação.

8. Quando uma data incompleta aparecer na mesma linha de um lançamento, não excluir o lançamento.

Primeiro:
- Identificar a data incompleta.
- Procurar sua continuação na linha ou página seguinte.
- Juntar os fragmentos.
- Reconstruir a data completa.
- Juntar as partes do histórico.
- Manter o lote, o documento e o valor.
- Criar normalmente a linha da transação no Excel.

9. Exemplo obrigatório de reconstrução:

Final da página anterior:
02/01/202 14397 21708298370231 Pix - Recebido 14,00 (+)

Início da página seguinte:
6
02/01 17:08 08448592301 Erdesson Dos R

Resultado obrigatório no Excel:
Dia: 02/01/2026
Lote: 14397
Documento: 21708298370231
Historico: Pix - Recebido 02/01 17:08 08448592301 Erdesson Dos R
Valor: 14,00 (+)

Essa transação não poderá ser excluída, mesmo que esteja dividida entre duas páginas.

10. O mesmo processo de reconstrução deve ser aplicado automaticamente em todas as páginas do PDF.

Não limitar a correção a uma página específica, data específica, valor específico ou transação específica.
Verificar todas as quebras de página do documento.

11. Se o início de uma página apresentar um caractere, número, palavra ou fragmento isolado antes da primeira transação completa, verificar se ele pertence ao último lançamento da página anterior.
Não excluir automaticamente conteúdo localizado no topo da página.

12. Quando uma palavra ou continuação aparecer sozinha no topo da página seguinte, considerar que ela pode pertencer ao histórico da transação imediatamente anterior.

Exemplo:
Página anterior termina com:
Camila
Página seguinte começa com:
Pereira
Resultado:
Historico: Camila Pereira

13. ATENÇÃO MÁXIMA PARA LINHAS COMPLEMENTARES DE HISTÓRICO (MUITO COMUM NO BANCO DO BRASIL):

Muitas transações (especialmente Pix e Transferências) possuem uma SEGUNDA LINHA logo abaixo da linha principal, contendo detalhes como: Data curta, Horário, CPF/CNPJ e Nome do Favorecido/Pagador.

Exemplo no PDF:
Linha 1: 01/07/2026 14397 11028211569741 Pix - Recebido 171,60 (+)
Linha 2: 01/07 10:28 36575674372 Adriana Catund mp

REGRA ABSOLUTA: Essa segunda linha complementar pertence SEMPRE E EXCLUSIVAMENTE à transação que está IMEDIATAMENTE ACIMA DELA (a que contém o valor).
Você NUNCA deve associar essa linha à transação de baixo. O histórico deve ser juntado perfeitamente na mesma linha.

Resultado Correto no Excel:
Dia: 01/07/2026
Lote: 14397
Documento: 11028211569741
Historico: Pix - Recebido 01/07 10:28 36575674372 Adriana Catund mp
Valor: 171,60 (+)

Outro exemplo:
Pagamento de Boleto
325,33 (-)
COMERCIAL IBIAPINA LTDA

Resultado:
Historico: Pagamento de Boleto COMERCIAL IBIAPINA LTDA
Valor: 325,33 (-)

A linha complementar deve permanecer no histórico da transação correspondente (a que está acima dela).

14. Para identificar se um fragmento pertence à transação anterior, considerar:
- Posição do conteúdo no PDF.
- Continuidade entre o final de uma página e o início da seguinte.
- Ausência de uma nova data completa antes do fragmento.
- Ausência de um novo lançamento completo antes do fragmento.
- Coluna original em que o fragmento aparece.
- Proximidade do fragmento com o lançamento anterior.
- Estrutura das demais transações do extrato.

15. Nunca descartar uma transação por causa de:
- Data incompleta.
- Quebra de página.
- Continuação do histórico em outra página.
- Nome dividido entre páginas.
- CPF ou CNPJ dividido.
- Horário dividido.
- Identificador dividido.
- Lote dividido.
- Documento dividido.
- Valor separado dos demais campos.
- Ordem visual alterada pela extração do PDF.

16. Antes de excluir qualquer linha incompleta, verificar se ela pode ser completada com:
- A linha anterior.
- A linha seguinte.
- O final da página anterior.
- O início da página seguinte.
- Outro fragmento da mesma transação.
Somente depois dessa tentativa de reconstrução a linha poderá ser classificada.

17. Na coluna Valor:
- Usar (+) para valores de entrada ou crédito.
- Usar (-) para valores de saída ou débito.
- Manter o valor positivo, sem transformá-lo em número negativo.
- Cada valor deve possuir apenas um indicador: (+) ou (-).

Exemplos:
4.405,19 (+)
405,00 (-)
5.000,00 (+)
832,71 (-)

18. Preservar os valores exatamente como aparecem no extrato, mantendo:
- Pontos de milhar.
- Vírgula decimal.
- Zeros.
- Duas casas decimais.
- Indicador de entrada ou saída.

19. Quando uma transação possuir informações em mais de uma linha no PDF, juntar todas as partes no campo Historico.

Exemplo no PDF:
Pix - Recebido
02/02 07:21 97433619000121 M L CAVALCA

Resultado:
Historico: Pix - Recebido 02/02 07:21 97433619000121 M L CAVALCA

20. Não criar linhas separadas para continuações do histórico.

21. Não separar do histórico:
- Nomes.
- Razões sociais.
- CNPJs.
- CPFs.
- Horários.
- Datas complementares.
- Identificadores.
- Códigos.
- Informações do pagador.
- Informações do favorecido.
- Complementos localizados após o valor.
- Fragmentos localizados na página seguinte.

22. Preservar a ordem correta do histórico.
O texto principal da transação deve aparecer primeiro e seus complementos devem ser adicionados na sequência em que pertencem logicamente ao lançamento.

Exemplo:
Pagamento de Boleto COMERCIAL IBIAPINA LTDA
Não inverter para:
COMERCIAL IBIAPINA LTDA Pagamento de Boleto

23. Ignorar cabeçalhos repetidos em todas as páginas, incluindo:
- Extrato de Conta Corrente.
- Cliente.
- Agência.
- Conta.
- Lançamentos.
- Dia.
- Lote.
- Documento.
- Histórico.
- Valor.
- Números de página.

24. Um cabeçalho repetido entre duas partes de uma transação não encerra a transação.
Se um lançamento começar antes do cabeçalho da página seguinte e continuar depois dele, ignorar o cabeçalho e juntar normalmente as partes da transação.

25. Não incluir linhas de saldo, como:
- Saldo Anterior.
- Saldo do dia.
- Saldo final.
- S A L D O.
- Qualquer outra linha que represente somente saldo.

26. Não confundir movimentações bancárias válidas que contenham a palavra "saldo" com linhas exclusivas de saldo.
Por exemplo, descrições de juros, aplicações, resgates ou serviços que possuam valor de entrada ou saída podem ser transações válidas.
Excluir somente quando a linha representar exclusivamente informação de saldo, sem constituir uma movimentação bancária real.

27. Não incluir como transações:
- Cabeçalhos.
- Rodapés.
- Totalizadores.
- Resumos.
- Informações institucionais.
- Números de página.
- Dados repetidos da conta.
- Colunas repetidas no início das páginas.

28. Manter transações como:
- BB Rende Fácil.
- Rende Fácil.
- Pix recebido.
- Pix enviado.
- Pagamentos de boleto.
- Pagamentos de impostos.
- Transferências.
- TED.
- Tarifas.
- Juros.
- Cobranças.
- Recebimentos de cartão.
- Outras movimentações bancárias reais.

29. Se o Lote ou o Documento não estiver informado no PDF, deixar a respectiva célula vazia.
Não inventar, completar ou deduzir valores que não estejam presentes no PDF.

30. Se o lote ou o documento estiver dividido entre linhas ou páginas, juntar seus fragmentos somente quando a continuidade estiver claramente apresentada no PDF.

31. Não resumir, agrupar, consolidar ou excluir movimentações válidas.
32. Não criar totais.
33. Não criar fórmulas.
34. Não criar linhas em branco entre as transações.
35. Gerar somente um arquivo Excel.
36. Criar somente uma aba chamada: Extrato
37. Não criar abas adicionais.
38. Manter as colunas Dia, Lote, Documento, Historico e Valor como texto, evitando alterações automáticas do Excel.
39. Não converter:
- Datas em números seriais.
- Documentos em notação científica.
- Valores em formatos monetários automáticos.
- Lotes ou documentos para números com perda de zeros.
- CPFs ou CNPJs para números.

40. VALIDAÇÃO OBRIGATÓRIA POR CONTAGEM
Antes de entregar o Excel:
- Contar todos os valores acompanhados de (+) ou (-) existentes no PDF.
- Contar todas as transações criadas no Excel.
- Comparar as duas quantidades.
- Investigar qualquer diferença antes de finalizar.
- Verificar especialmente lançamentos localizados no final e no início das páginas.
Uma diferença de quantidade pode indicar que uma transação quebrada entre páginas foi eliminada ou agrupada incorretamente.

41. VALIDAÇÃO OBRIGATÓRIA DAS DATAS
Antes de entregar:
- Verificar se todas as datas da coluna Dia estão completas.
- Confirmar que todas seguem o padrão DD/MM/AAAA.
- Procurar datas terminadas em um, dois ou três dígitos de ano.
- Procurar números isolados no início das páginas.
- Reconstruir todas as datas quebradas.
- Não entregar o arquivo enquanto existir data incompleta.

42. VALIDAÇÃO OBRIGATÓRIA DOS HISTÓRICOS
Antes de entregar:
- Verificar se cada transação ocupa somente uma linha.
- Verificar se todos os históricos divididos em várias linhas foram unidos.
- Verificar se continuações depois do valor foram anexadas à transação correta.
- Verificar se palavras no topo da página foram anexadas ao lançamento anterior quando necessário.
- Verificar se nomes, documentos, CPFs, CNPJs e horários permanecem no Historico.
- Verificar se a ordem das partes do histórico foi preservada.

43. VALIDAÇÃO OBRIGATÓRIA DO ARQUIVO
Antes de entregar, confirmar:
- O arquivo possui somente a aba Extrato.
- Existem somente as cinco colunas solicitadas (Dia | Lote | Documento | Historico | Valor).
- As colunas estão na ordem correta.
- Não existem fórmulas.
- Não existem totais.
- Não existem resumos.
- Não existem linhas em branco entre transações.
- Nenhum cabeçalho foi incluído como transação.
- Nenhuma linha exclusiva de saldo foi incluída.
- Cada valor possui apenas (+) ou (-).
- Os valores foram preservados exatamente.
- Todas as datas estão completas.
- Nenhuma transação válida foi eliminada em uma quebra de página.
- O lançamento de 14,00 (+), documento 21708298370231, foi preservado caso esteja presente no PDF.

44. Formato final obrigatório das colunas:
Dia | Lote | Documento | Historico | Valor

45. Entregar apenas as transações extraídas respeitando integralmente as regras acima.`;

