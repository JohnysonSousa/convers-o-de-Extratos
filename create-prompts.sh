mkdir -p server/prompts

cat << 'PROMPT' > server/prompts/itau.ts
export const itauPrompt = `ITAU
Converta o PDF de extrato bancrio para Excel seguindo obrigatoriamente estas regras:

1. Criar somente estas quatro colunas:

Data | Descrio | Entradas | Sadas

2. Cada movimentao bancria deve ocupar uma nica linha na planilha.

3. A coluna Data deve ser preenchida em todas as linhas.

4. Quando a data aparecer somente na primeira movimentao de um grupo, repetir essa mesma data em todas as movimentaes seguintes at que uma nova data aparea.

Exemplo no PDF:

02/01 Sispag Fornecedores 984,19-
Sispag Fornecedores 1.237,00-
Rede ELO DB0038957299 1.978,61
Rede ELO CD0038957299 630,12
Rede MAST DB0038957299 5.379,36

05/01 Sispag Fornecedores 20.000,00-

Resultado esperado:

02/01/2026 | Sispag Fornecedores | | 984,19
02/01/2026 | Sispag Fornecedores | | 1.237,00
02/01/2026 | Rede ELO DB0038957299 | 1.978,61 |
02/01/2026 | Rede ELO CD0038957299 | 630,12 |
02/01/2026 | Rede MAST DB0038957299 | 5.379,36 |
05/01/2026 | Sispag Fornecedores | | 20.000,00

5. Completar todas as datas com o ano de 2026.

Exemplos:

02/01 deve virar 02/01/2026.
05/01 deve virar 05/01/2026.
30/01 deve virar 30/01/2026.

6. Caso a data esteja vazia, utilizar a ltima data vlida apresentada anteriormente no extrato.

7. Continuar repetindo a ltima data vlida at encontrar uma nova data.

8. Separar corretamente os valores conforme as colunas originais do PDF:

- Valores apresentados na coluna "entradas R$ (crditos)" devem ser colocados somente na coluna Entradas.
- Valores apresentados na coluna "sadas R$ (dbitos)" devem ser colocados somente na coluna Sadas.

9. No colocar o mesmo valor simultaneamente nas colunas Entradas e Sadas.

10. Preservar os valores exatamente como esto no extrato, mantendo:

- Pontos de milhar.
- Vrgulas decimais.
- Zeros.
- Casas decimais.

Exemplos:

1.978,61
20.000,00
630,12
15.907,08

11. Quando um valor de sada aparecer com sinal de menos aps o nmero, remover apenas o sinal de menos.

Exemplo:

984,19- deve virar 984,19 na coluna Sadas.
15.907,08- deve virar 15.907,08 na coluna Sadas.

12. No transformar os valores em negativos.

13. Manter toda a descrio da movimentao em uma nica clula.

14. No separar nomes, cdigos, nmeros de documentos ou identificadores presentes na descrio.

Exemplos de descries completas:

Sispag Fornecedores
Rede ELO DB0038957299
Rede MAST CD0038957299
Rede VISA DB0038957299
Apl Aplic Aut Mais
Seguro Itauempresa 07/11

15. Quando uma descrio estiver dividida em mais de uma linha no PDF, juntar as partes na mesma clula da coluna Descrio.

16. Ignorar cabealhos repetidos nas mudanas de pgina, incluindo:

- extrato mensal
- data
- descrio
- entradas R$
- sadas R$
- saldo R$
- crditos
- dbitos
- nmero da pgina
- agncia
- conta
- nome do cliente

17. Processar somente a seo:

Conta Corrente | Movimentao

18. No incluir as seguintes sees:

- Resumo do extrato.
- Aplicaes Automticas.
- Movimentao de aplicaes.
- Dbitos automticos efetuados apresentados novamente em sees de resumo.
- Cheque Especial.
- Notas explicativas.
- Totalizadores.
- Informaes comerciais ou publicitrias.

19. No incluir linhas de saldo, tais como:

- Saldo anterior.
- SALDO APLIC AUT MAIS.
- Saldo em C/C.
- Saldo final.
- Saldo do dia.

20. A movimentao "Apl Aplic Aut Mais" deve ser mantida, pois representa uma movimentao bancria. O valor deve ser colocado na coluna Sadas quando estiver apresentado na coluna de dbitos.

21. No criar totais.

22. No criar resumos.

23. No criar frmulas.

24. No criar linhas em branco entre as movimentaes.

25. No criar abas adicionais.

26. Gerar somente uma planilha Excel.

27. O arquivo deve possuir apenas uma aba chamada:

Extrato

28. Todas as datas, descries e valores devem ser mantidos como texto para evitar alteraes automticas do Excel.

29. No converter valores para o formato de moeda.

30. No converter as datas para nmeros internos do Excel.

31. Antes de entregar, verificar obrigatoriamente:

- Se todas as linhas possuem uma data.
- Se todas as datas esto no formato DD/MM/2026.
- Se as datas vazias foram preenchidas com a data imediatamente anterior.
- Se cada movimentao ocupa somente uma linha.
- Se nenhum valor foi colocado simultaneamente em Entradas e Sadas.
- Se no existem linhas de saldo.
- Se no existem cabealhos misturados com as movimentaes.
- Se nenhuma movimentao foi resumida ou agrupada.

Formato final obrigatrio:

Data | Descrio | Entradas | Sadas

Entregar apenas o arquivo Excel final.`;
PROMPT

cat << 'PROMPT' > server/prompts/banco-do-brasil.ts
export const bancoDoBrasilPrompt = `BANCO DO BRASIL
Converta o PDF de extrato bancrio do Banco do Brasil para Excel seguindo obrigatoriamente todas as regras abaixo.

IMPORTANTE: Antes de extrair as transaes, faa uma etapa de reconstruo do contedo quebrado entre linhas e pginas. Nenhuma transao poder ser descartada apenas porque a data, o histrico, o lote, o documento ou outro campo foi dividido por uma quebra de pgina.

1. Criar somente estas cinco colunas, exatamente nesta ordem:

Dia | Lote | Documento | Historico | Valor

2. Criar somente uma aba chamada:

Extrato

3. Cada transao bancria deve ocupar uma nica linha na planilha.

4. Extrair os dados respeitando as colunas originais do PDF:

- Dia: data completa da transao no formato apresentado no extrato.
- Lote: nmero do lote.
- Documento: nmero do documento.
- Historico: descrio completa da transao.
- Valor: valor exatamente como aparece no extrato, acompanhado do indicador de entrada ou sada.

5. RECONSTRUO OBRIGATRIA DE CONTEDO ENTRE PGINAS

Antes de interpretar ou excluir qualquer lanamento, analisar o final de cada pgina junto com o incio da pgina seguinte.

Se uma data, palavra, nmero, histrico, lote, documento, valor ou qualquer outra informao estiver dividida por uma quebra de pgina, juntar os fragmentos antes de processar a transao.

Nunca validar uma pgina isoladamente. O final da pgina atual deve sempre ser analisado junto com o incio da pgina seguinte.

6. RECONSTRUO DE DATAS INCOMPLETAS

Toda data da coluna Dia deve ser validada antes da criao da linha no Excel.

O formato esperado da data completa :

DD/MM/AAAA

Se uma data aparecer incompleta no final de uma pgina, localizar imediatamente sua continuao no incio da pgina seguinte e juntar os fragmentos.

Exemplo:

Final da pgina anterior:

02/01/202

Incio da pgina seguinte:

6

Resultado obrigatrio:

02/01/2026

O nmero isolado no incio da pgina seguinte deve completar a data anterior e no poder ser descartado.

7. A reconstruo de datas deve funcionar para qualquer quantidade de dgitos quebrados.

Exemplos:

02/01/202 + 6 = 02/01/2026

02/01/20 + 26 = 02/01/2026

02/01/2 + 026 = 02/01/2026

02/01/ + 2026 = 02/01/2026

Sempre reconstruir a data completa antes de validar ou criar a transao.

8. Quando uma data incompleta aparecer na mesma linha de um lanamento, no excluir o lanamento.

Primeiro:

- Identificar a data incompleta.
- Procurar sua continuao na linha ou pgina seguinte.
- Juntar os fragmentos.
- Reconstruir a data completa.
- Juntar as partes do histrico.
- Manter o lote, o documento e o valor.
- Criar normalmente a linha da transao no Excel.

9. Exemplo obrigatrio de reconstruo:

Final da pgina anterior:

02/01/202 14397 21708298370231 Pix - Recebido 14,00 (+)

Incio da pgina seguinte:

02/01 17:08 08448592301 Erdesson Dos R

Resultado obrigatrio no Excel:

Dia: 02/01/2026
Lote: 14397
Documento: 21708298370231
Historico: Pix - Recebido 02/01 17:08 08448592301 Erdesson Dos R
Valor: 14,00 (+)

Essa transao no poder ser excluda, mesmo que esteja dividida entre duas pginas.

10. O mesmo processo de reconstruo deve ser aplicado automaticamente em todas as pginas do PDF.

No limitar a correo a uma pgina especfica, data especfica, valor especfico ou transao especfica.

Verificar todas as quebras de pgina do documento.

11. Se o incio de uma pgina apresentar um caractere, nmero, palavra ou fragmento isolado antes da primeira transao completa, verificar se ele pertence ao ltimo lanamento da pgina anterior.

No excluir automaticamente contedo localizado no topo da pgina.

12. Quando uma palavra ou continuao aparecer sozinha no topo da pgina seguinte, considerar que ela pode pertencer ao histrico da transao imediatamente anterior.

Exemplo:

Pgina anterior termina com:

Camila

Pgina seguinte comea com:

Pereira

Resultado:

Historico: Camila Pereira

13. Tambm juntar continuaes do histrico que apaream depois do valor da transao ou antes da prxima transao.

Exemplo no PDF:

Pagamento de Boleto
325,33 (-)
COMERCIAL IBIAPINA LTDA

Resultado:

Historico: Pagamento de Boleto COMERCIAL IBIAPINA LTDA
Valor: 325,33 (-)

A linha complementar deve permanecer no histrico da transao correspondente.

14. Para identificar se um fragmento pertence  transao anterior, considerar:

- Posio do contedo no PDF.
- Continuidade entre o final de uma pgina e o incio da seguinte.
- Ausncia de uma nova data completa antes do fragmento.
- Ausncia de um novo lanamento completo antes do fragmento.
- Coluna original em que o fragmento aparece.
- Proximidade do fragmento com o lanamento anterior.
- Estrutura das demais transaes do extrato.

15. Nunca descartar uma transao por causa de:

- Data incompleta.
- Quebra de pgina.
- Continuao do histrico em outra pgina.
- Nome dividido entre pginas.
- CPF ou CNPJ dividido.
- Horrio dividido.
- Identificador dividido.
- Lote dividido.
- Documento dividido.
- Valor separado dos demais campos.
- Ordem visual alterada pela extrao do PDF.

16. Antes de excluir qualquer linha incompleta, verificar se ela pode ser completada com:

- A linha anterior.
- A linha seguinte.
- O final da pgina anterior.
- O incio da pgina seguinte.
- Outro fragmento da mesma transao.

Somente depois dessa tentativa de reconstruo a linha poder ser classificada.

17. Na coluna Valor:

- Usar (+) para valores de entrada ou crdito.
- Usar (-) para valores de sada ou dbito.
- Manter o valor positivo, sem transform-lo em nmero negativo.
- Cada valor deve possuir apenas um indicador: (+) ou (-).

Exemplos:

4.405,19 (+)
405,00 (-)
5.000,00 (+)
832,71 (-)

18. Preservar os valores exatamente como aparecem no extrato, mantendo:

- Pontos de milhar.
- Vrgula decimal.
- Zeros.
- Duas casas decimais.
- Indicador de entrada ou sada.

19. Quando uma transao possuir informaes em mais de uma linha no PDF, juntar todas as partes no campo Historico.

Exemplo no PDF:

Pix - Recebido
02/02 07:21 97433619000121 M L CAVALCA

Resultado:

Historico: Pix - Recebido 02/02 07:21 97433619000121 M L CAVALCA

20. No criar linhas separadas para continuaes do histrico.

21. No separar do histrico:

- Nomes.
- Razes sociais.
- CNPJs.
- CPFs.
- Horrios.
- Datas complementares.
- Identificadores.
- Cdigos.
- Informaes do pagador.
- Informaes do favorecido.
- Complementos localizados aps o valor.
- Fragmentos localizados na pgina seguinte.

22. Preservar a ordem correta do histrico.

O texto principal da transao deve aparecer primeiro e seus complementos devem ser adicionados na sequncia em que pertencem logicamente ao lanamento.

Exemplo:

Pagamento de Boleto COMERCIAL IBIAPINA LTDA

No inverter para:

COMERCIAL IBIAPINA LTDA Pagamento de Boleto

23. Ignorar cabealhos repetidos em todas as pginas, incluindo:

- Extrato de Conta Corrente.
- Cliente.
- Agncia.
- Conta.
- Lanamentos.
- Dia.
- Lote.
- Documento.
- Histrico.
- Valor.
- Nmeros de pgina.

24. Um cabealho repetido entre duas partes de uma transao no encerra a transao.

Se um lanamento comear antes do cabealho da pgina seguinte e continuar depois dele, ignorar o cabealho e juntar normalmente as partes da transao.

25. No incluir linhas de saldo, como:

- Saldo Anterior.
- Saldo do dia.
- Saldo final.
- S A L D O.
- Qualquer outra linha que represente somente saldo.

26. No confundir movimentaes bancrias vlidas que contenham a palavra "saldo" com linhas exclusivas de saldo.

Por exemplo, descries de juros, aplicaes, resgates ou servios que possuam valor de entrada ou sada podem ser transaes vlidas.

Excluir somente quando a linha representar exclusivamente informao de saldo, sem constituir uma movimentao bancria real.

27. No incluir como transaes:

- Cabealhos.
- Rodaps.
- Totalizadores.
- Resumos.
- Informaes institucionais.
- Nmeros de pgina.
- Dados repetidos da conta.
- Colunas repetidas no incio das pginas.

28. Manter transaes como:

- BB Rende Fcil.
- Rende Fcil.
- Pix recebido.
- Pix enviado.
- Pagamentos de boleto.
- Pagamentos de impostos.
- Transferncias.
- TED.
- Tarifas.
- Juros.
- Cobranas.
- Recebimentos de carto.
- Outras movimentaes bancrias reais.

29. Se o Lote ou o Documento no estiver informado no PDF, deixar a respectiva clula vazia.

No inventar, completar ou deduzir valores que no estejam presentes no PDF.

30. Se o lote ou o documento estiver dividido entre linhas ou pginas, juntar seus fragmentos somente quando a continuidade estiver claramente apresentada no PDF.

31. No resumir, agrupar, consolidar ou excluir movimentaes vlidas.

32. No criar totais.

33. No criar frmulas.

34. No criar linhas em branco entre as transaes.

35. Gerar somente um arquivo Excel.

36. Criar somente uma aba chamada:

Extrato

37. No criar abas adicionais.

38. Manter as colunas Dia, Lote, Documento, Historico e Valor como texto, evitando alteraes automticas do Excel.

39. No converter:

- Datas em nmeros seriais.
- Documentos em notao cientfica.
- Valores em formatos monetrios automticos.
- Lotes ou documentos para nmeros com perda de zeros.
- CPFs ou CNPJs para nmeros.

40. VALIDAO OBRIGATRIA POR CONTAGEM

Antes de entregar o Excel:

- Contar todos os valores acompanhados de (+) ou (-) existentes no PDF.
- Contar todas as transaes criadas no Excel.
- Comparar as duas quantidades.
- Investigar qualquer diferena antes de finalizar.
- Verificar especialmente lanamentos localizados no final e no incio das pginas.

Uma diferena de quantidade pode indicar que uma transao quebrada entre pginas foi eliminada ou agrupada incorretamente.

41. VALIDAO OBRIGATRIA DAS DATAS

Antes de entregar:

- Verificar se todas as datas da coluna Dia esto completas.
- Confirmar que todas seguem o padro DD/MM/AAAA.
- Procurar datas terminadas em um, dois ou trs dgitos de ano.
- Procurar nmeros isolados no incio das pginas.
- Reconstruir todas as datas quebradas.
- No entregar o arquivo enquanto existir data incompleta.

42. VALIDAO OBRIGATRIA DOS HISTRICOS

Antes de entregar:

- Verificar se cada transao ocupa somente uma linha.
- Verificar se todos os histricos divididos em vrias linhas foram unidos.
- Verificar se continuaes depois do valor foram anexadas  transao correta.
- Verificar se palavras no topo da pgina foram anexadas ao lanamento anterior quando necessrio.
- Verificar se nomes, documentos, CPFs, CNPJs e horrios permanecem no Historico.
- Verificar se a ordem das partes do histrico foi preservada.

43. VALIDAO OBRIGATRIA DO ARQUIVO

Antes de entregar, confirmar:

- O arquivo possui somente a aba Extrato.
- Existem somente as cinco colunas solicitadas.
- As colunas esto na ordem correta.
- No existem frmulas.
- No existem totais.
- No existem resumos.
- No existem linhas em branco entre transaes.
- Nenhum cabealho foi includo como transao.
- Nenhuma linha exclusiva de saldo foi includa.
- Cada valor possui apenas (+) ou (-).
- Os valores foram preservados exatamente.
- Todas as datas esto completas.
- Nenhuma transao vlida foi eliminada em uma quebra de pgina.
- O lanamento de 14,00 (+), documento 21708298370231, foi preservado caso esteja presente no PDF.

44. Formato final obrigatrio:

Dia | Lote | Documento | Historico | Valor

45. Entregar apenas o arquivo Excel final, sem explicaes adicionais, sem relatrios e sem arquivos intermedirios.`;
PROMPT

cat << 'PROMPT' > server/prompts/tribanco.ts
export const tribancoPrompt = `TRIBANCO
Analise o extrato bancrio do Tribanco anexado e gere um arquivo CSV padronizado com todas as movimentaes.

COLUNAS DO ARQUIVO

1. Extraia exclusivamente estas trs colunas:
   - DATA DE LANAMENTO
   - HISTRICO
   - VALOR

2. O cabealho do CSV deve ser exatamente:

DATA DE LANAMENTO;HISTRICO;VALOR

REGRAS DE EXTRAO

3. Cada movimentao do extrato deve gerar uma linha separada no CSV.

4. Preserve rigorosamente a ordem em que as movimentaes aparecem no extrato.

5. No agrupe, no consolide, no some e no exclua lanamentos repetidos.

6. Extraia todos os perodos encontrados no documento, mesmo quando o extrato incluir mais de um ms ou mais de um ano.

7. Preserve a data no formato:

DD/MM/AAAA

TRATAMENTO DO HISTRICO

8. Extraia o texto integral da coluna HISTRICO.

9. Quando o histrico estiver dividido em duas ou mais linhas, una todas as partes em uma nica linha.

Exemplo original:

CRED CTA CLIENTE RECEB PIX - ALELO
INSTITUICAO DE PAGAMENTO

Resultado:

CRED CTA CLIENTE RECEB PIX - ALELO INSTITUICAO DE PAGAMENTO

10. Preserve as informaes que faam parte do histrico, incluindo:
   - Nome da instituio
   - Tipo de carto
   - Adquirente
   - Remetente
   - Destino da transferncia
   - Referncia do lanamento
   - Nome do produto ou servio

11. No inclua o nmero do documento no HISTRICO.

Exemplo original:

01/10/2025 000000000121 MASTER DEBITO CIELO 384,63

Resultado:

01/10/2025;MASTER DEBITO CIELO;384,63

TRATAMENTO DOS VALORES

12. Preserve os valores positivos exatamente como aparecem no extrato.

13. Preserve o sinal negativo dos valores negativos.

Exemplos:

151,65 deve resultar em 151,65

-5.326,53 deve resultar em -5.326,53

14. No classifique os valores com base nas palavras DEBITO, DBTO, CREDITO, CREDTO ou ANTECIPACAO presentes no histrico.

15. O sinal do valor deve seguir exclusivamente o sinal apresentado na coluna VALOR do extrato.

16. No transforme um valor positivo em negativo somente porque o histrico contm a palavra DEBITO ou DBTO.

17. Preserve o formato monetrio brasileiro:
   - Ponto para milhares
   - Vrgula para centavos
   - Duas casas decimais

18. Quando o extrato apresentar um valor inteiro sem centavos, complete com vrgula e duas casas decimais.

Exemplos:

20 deve resultar em 20,00

-95 deve resultar em -95,00

6362 deve resultar em 6362,00

19. No inclua smbolo de moeda no campo VALOR.

ITENS QUE DEVEM SER IGNORADOS

20. No inclua linhas com os histricos:
   - SALDO ANTERIOR
   - SALDO C/C

21. Tambm no inclua:
   - Coluna Saldo
   - Nmero do documento
   - Banco
   - Agncia
   - Conta
   - Produto
   - Nome, endereo ou documento do cliente
   - Cabealhos e rodaps
   - Nmero da pgina
   - Data de emisso do extrato
   - Posio do dia
   - Saldo atual
   - Saldo disponvel
   - Limite de crdito
   - Encargos
   - IOF
   - Informaes de atendimento
   - Textos de e-mail que acompanhem o extrato
   - Avisos ou mensagens institucionais

PADRO DO CSV

22. Utilize ponto e vrgula como separador:

;

23. Gere o arquivo em UTF-8 com BOM, para abrir corretamente no Excel e preservar os acentos.

24. No crie ndice, numerao de linhas ou colunas adicionais.

25. O CSV final deve conter somente:

DATA DE LANAMENTO;HISTRICO;VALOR

CONTROLE DE QUALIDADE

26. Antes de entregar o arquivo, confira se:
   - Todas as movimentaes foram extradas
   - Cada movimentao ocupa uma linha
   - Todas as datas esto no formato DD/MM/AAAA
   - Os histricos divididos em vrias linhas foram corretamente unidos
   - Os nmeros dos documentos foram removidos
   - Cada histrico est associado ao valor correto
   - Os valores positivos permanecem positivos
   - Os valores negativos mantm o sinal negativo
   - Os valores possuem duas casas decimais
   - As linhas SALDO C/C e SALDO ANTERIOR foram removidas
   - Os lanamentos repetidos foram preservados
   - A ordem original do extrato foi mantida
   - O arquivo possui somente as trs colunas solicitadas

27. Entregue somente o arquivo CSV final, pronto para download.`;
PROMPT

cat << 'PROMPT' > server/prompts/stone.ts
export const stonePrompt = `STONE
Analise o extrato bancário da Stone anexado e extraia todas as movimentações encontradas no documento.

1. Extraia DATA, DESCRIÇÃO, VALOR e CONTRAPARTE.
2. Sempre que existir CONTRAPARTE, concatene-a ao final da DESCRIÇÃO, separada por " | ", sem duplicá-la quando já estiver presente.
3. O CSV final deve conter somente: DATA;DESCRIÇÃO;VALOR
4. Cada movimentação deve ocupar uma única linha.
5. Preserve rigorosamente a ordem original e os lançamentos repetidos.
6. Una todas as linhas pertencentes à mesma descrição.
7. Preencha datas vazias com a última data válida anterior quando aplicável e normalize para DD/MM/AAAA quando o ano estiver disponível no documento.
8. Preserve o formato monetário brasileiro, com ponto para milhar, vírgula para centavos e duas casas decimais, sem símbolo de moeda.
9. Crédito ou Entrada deve permanecer positivo. Débito ou Saída deve permanecer negativo, de acordo com a coluna ou estrutura do extrato, não apenas com palavras isoladas na descrição.
10. Ignore saldos, totalizadores, resumos, cabeçalhos, rodapés, páginas, dados da conta, atendimento, publicidade e linhas sem movimentação bancária.
11. Gere CSV com ponto e vírgula, UTF-8 com BOM, sem índice, fórmulas, totais, linhas em branco ou colunas extras.
12. Antes de entregar, valide se todas as movimentações foram extraídas, descrições quebradas foram unidas, contrapartes foram adicionadas uma única vez, valores correspondem às descrições, ordem e repetidos foram preservados.
13. Entregue somente o CSV final pronto para download.`;
PROMPT

cat << 'PROMPT' > server/prompts/bradesco.ts
export const bradescoPrompt = `BRADESCO
Analise o extrato bancrio do Bradesco anexado e gere um arquivo CSV padronizado com todos os lanamentos encontrados no documento.

REGRAS DE EXTRAO

1. Extraia exclusivamente estas quatro colunas:
   - DATA
   - LANAMENTOS
   - CRDITO
   - DBITO

2. Cada movimentao do extrato deve ocupar uma linha separada no CSV.

3. No agrupe, no consolide, no some e no exclua lanamentos repetidos.

4. Preserve rigorosamente a ordem em que as movimentaes aparecem no extrato.

5. Extraia todos os lanamentos encontrados no arquivo, sem filtrar por ms ou ano.

PREENCHIMENTO DAS DATAS

6. No extrato do Bradesco, a data pode aparecer somente no primeiro lanamento do dia.

7. Quando a coluna DATA estiver em branco, preencha-a com a ltima data vlida informada acima.

8. Continue repetindo essa data em todas as linhas seguintes at encontrar uma nova data no extrato.

Exemplo:

Data original:
02/01/2025
[em branco]
[em branco]
03/01/2025
[em branco]

Resultado:
02/01/2025
02/01/2025
02/01/2025
03/01/2025
03/01/2025

9. Nenhum lanamento do CSV final pode ficar com a DATA em branco.

TRATAMENTO DOS LANAMENTOS

10. Una em um nico campo todas as linhas de texto que pertenam  mesma movimentao.

Exemplo:

TRANSFERENCIA PIX
REM: Banco VR 03/01

Resultado:

TRANSFERENCIA PIX REM: Banco VR 03/01

11. Preserve no campo LANAMENTOS os complementos da movimentao, como:
   - REM:
   - DES:
   - Nome do favorecido ou remetente
   - Data complementar
   - Informaes adicionais exibidas pelo banco

12. No inclua o nmero do documento na descrio, salvo se ele fizer parte do prprio texto do lanamento.

SEPARAO DE CRDITO E DBITO

13. Quando o valor da movimentao estiver positivo:
   - Preencha a coluna CRDITO.
   - Deixe a coluna DBITO vazia.

14. Quando o valor estiver negativo:
   - Remova o sinal negativo.
   - Preencha a coluna DBITO.
   - Deixe a coluna CRDITO vazia.

Exemplos:

10.389,94 deve resultar em CRDITO = 10.389,94 | DBITO vazio

-2.587,80 deve resultar em CRDITO vazio | DBITO = 2.587,80

15. Nunca preencha CRDITO e DBITO simultaneamente na mesma linha.

16. Preserve o formato monetrio brasileiro:
   - Ponto para milhares.
   - Vrgula para centavos.
   - Sempre duas casas decimais.

ITENS QUE DEVEM SER IGNORADOS

17. No inclua:
   - Saldo anterior
   - Saldo da conta
   - Coluna Saldo
   - Nmero do documento
   - Agncia
   - Conta
   - Nome ou CNPJ do cliente
   - Total disponvel
   - Cabealhos repetidos
   - Rodaps
   - Nmero da pgina
   - Data da operao
   - Nome do usurio
   - Informaes de atendimento do banco

PADRO DO CSV

18. O cabealho deve ser exatamente:
   DATA;LANAMENTOS;CRDITO;DBITO

19. Utilize ponto e vrgula como separador:
   ;

20. Gere o arquivo em UTF-8 com BOM, para abrir corretamente no Excel e preservar os acentos.

21. No crie colunas adicionais.

CONTROLE DE QUALIDADE

22. Antes de entregar o arquivo, confira se:
   - Todos os lanamentos do documento foram extrados.
   - Todas as datas em branco foram preenchidas com a data anterior.
   - A data s muda quando uma nova data aparece no extrato.
   - Cada lanamento est associado ao valor correto.
   - Os crditos esto somente na coluna CRDITO.
   - Os dbitos esto somente na coluna DBITO.
   - O sinal negativo foi removido da coluna DBITO.
   - No existem linhas sem data.
   - No existem linhas com crdito e dbito preenchidos simultaneamente.
   - No foram removidos lanamentos repetidos.
   - A ordem original do extrato foi mantida.
   - Nenhum ms ou ano foi excludo.

23. Entregue somente o arquivo CSV final, pronto para download.`;
PROMPT

cat << 'PROMPT' > server/prompts/caixa.ts
export const caixaPrompt = `CAIXA
Analise o extrato bancrio da Caixa anexado e gere um arquivo CSV padronizado com todos os lanamentos.

REGRAS DE EXTRAO

1. Extraia exclusivamente estas trs colunas:
   - DATA MOV
   - HISTRICO
   - VALOR

2. Ignore as demais colunas do extrato, incluindo:
   - Nr. Doc.
   - Saldo
   - Agncia
   - Conta
   - Dados do cliente
   - Cabealhos e rodaps das pginas

3. Cada lanamento do extrato deve ocupar uma linha separada no CSV.

4. No agrupe, no consolide, no some e no remova lanamentos repetidos. Se duas movimentaes forem iguais, mantenha as duas linhas.

5. Preserve a ordem exata em que os lanamentos aparecem no extrato.

TRATAMENTO DOS VALORES

6. Utilize a indicao da Caixa:
   - Valor terminado em C representa crdito e deve ficar positivo.
   - Valor terminado em D representa dbito e deve receber sinal negativo.

Exemplos:
   - 167,53 C deve resultar em 167,53
   - 2.500,00 D deve resultar em -2.500,00
   - 0,00 C deve resultar em 0,00

7. Remova as letras C e D da coluna VALOR depois de aplicar o sinal correto.

8. Preserve o formato monetrio brasileiro:
   - Ponto para milhares.
   - Vrgula para centavos.
   - Sempre duas casas decimais.

REGRAS DO CSV

9. O cabealho final deve ser exatamente:
   DATA MOV;HISTRICO;VALOR

10. Utilize ponto e vrgula como separador:
    ;

11. Gere o arquivo em UTF-8 com BOM, para abrir corretamente no Excel e preservar acentos.

12. No inclua no CSV:
    - Nr. Doc.
    - Saldo
    - Texto introdutrio
    - Nome do cliente
    - Nmero da conta
    - Nmero da pgina
    - Data de emisso
    - Avisos ou mensagens do banco

CONTROLE DE QUALIDADE

13. Confira se:
    - Todos os lanamentos com data foram extrados.
    - A primeira e a ltima movimentao do perodo esto presentes.
    - Os dbitos esto negativos.
    - Os crditos esto positivos.
    - Nenhuma linha foi deslocada para outra coluna.
    - O histrico corresponde ao valor da mesma linha.
    - No existem linhas vazias no meio do resultado.

14. Mantenha lanamentos como SALDO DIA, RESG AUT e outros histricos bancrios quando eles aparecerem como movimentaes com uma data vlida.

15. Entregue somente o arquivo CSV final pronto para download, sem criar colunas adicionais.`;
PROMPT

cat << 'PROMPT' > server/prompts/santander.ts
export const santanderPrompt = `SANTANDER
Analise o extrato bancrio do Santander anexado e gere um arquivo CSV padronizado com todos os lanamentos da movimentao da conta corrente.

COLUNAS DO ARQUIVO

1. Extraia exclusivamente estas quatro colunas:
   - DATA
   - DESCRIO
   - CRDITOS
   - DBITOS

2. O cabealho do CSV deve ser exatamente:
   DATA;DESCRIO;CRDITOS;DBITOS

IDENTIFICAO DO ANO

3. Antes de processar as datas, identifique o ano de referncia do extrato.

4. O ano deve ser obtido a partir de informaes presentes no prprio documento, priorizando:
   - Ms e ano indicados no ttulo do extrato.
   - Perodo de referncia.
   - Resumo mensal.
   - Nome do arquivo, quando compatvel com o contedo.
   - Datas completas presentes no documento.

5. No presuma o ano e no utilize o ano atual automaticamente.

6. Quando a data do lanamento estiver no formato DD/MM, acrescente o ano identificado no extrato.

Exemplo:

Extrato referente a dezembro de 2025:

01/12 deve resultar em 01/12/2025
15/12 deve resultar em 15/12/2025
19/12 deve resultar em 19/12/2025

7. A data final deve estar sempre no formato:
   DD/MM/AAAA

PREENCHIMENTO DAS DATAS EM BRANCO

8. No extrato do Santander, a data pode aparecer apenas no primeiro lanamento de cada dia.

9. Quando um lanamento estiver sem data, preencha-o com a ltima data vlida informada acima.

10. Continue repetindo essa data em todos os lanamentos seguintes at aparecer uma nova data no extrato.

Exemplo original:

01/12 PIX RECEBIDO
      IOF IMPOSTO OPERAES FINANCEIRAS
      IOF ADICIONAL - AUTOMTICO
12/12 PIX ENVIADO
15/12 TARIFA MENSALIDADE
      DBITO AUTOMTICO CARTO

Resultado:

01/12/2025;PIX RECEBIDO
01/12/2025;IOF IMPOSTO OPERAES FINANCEIRAS
01/12/2025;IOF ADICIONAL - AUTOMTICO
12/12/2025;PIX ENVIADO
15/12/2025;TARIFA MENSALIDADE
15/12/2025;DBITO AUTOMTICO CARTO

11. Nenhum lanamento do CSV final pode ficar com a DATA vazia.

TRATAMENTO DA DESCRIO

12. Una todas as linhas de texto que pertenam  mesma movimentao.

Exemplo original:

PIX ENVIADO
ANTONIO CARLOS CHAVES DOS

Resultado:

PIX ENVIADO ANTONIO CARLOS CHAVES DOS

13. Preserve na descrio os complementos relevantes, incluindo:
   - Nome do remetente ou favorecido.
   - Perodo de cobrana.
   - Final do carto.
   - Referncia do pagamento.
   - Informaes complementares da movimentao.

14. Exemplo:

IOF IMPOSTO OPERAES FINANCEIRAS
PERODO: 01/11 A 30/11/25

Resultado:

IOF IMPOSTO OPERAES FINANCEIRAS PERODO: 01/11 A 30/11/25

15. No inclua o nmero do documento na descrio, exceto quando ele fizer parte do texto principal da movimentao.

SEPARAO DE CRDITOS E DBITOS

16. Quando a movimentao estiver na coluna de crditos:
   - Preencha a coluna CRDITOS.
   - Deixe a coluna DBITOS vazia.

17. Quando a movimentao estiver na coluna de dbitos ou o valor estiver acompanhado de sinal negativo:
   - Remova o sinal negativo do valor.
   - Preencha a coluna DBITOS.
   - Deixe a coluna CRDITOS vazia.

Exemplos:

20.000,00 deve resultar em CRDITOS = 20.000,00 | DBITOS vazio

30.000,00- deve resultar em CRDITOS vazio | DBITOS = 30.000,00

18. Nunca preencha CRDITOS e DBITOS simultaneamente na mesma linha.

19. Preserve o formato monetrio brasileiro:
   - Ponto para milhares.
   - Vrgula para centavos.
   - Sempre duas casas decimais.

20. No mantenha o sinal negativo dentro da coluna DBITOS.

LANAMENTOS E LINHAS

21. Cada movimentao deve ocupar uma linha separada no CSV.

22. No agrupe, no consolide, no some e no exclua lanamentos repetidos.

23. Preserve a ordem exata em que as movimentaes aparecem no extrato.

24. Extraia somente as movimentaes da seo Conta Corrente - Movimentao.

ITENS QUE DEVEM SER IGNORADOS

25. No inclua:
   - Saldo anterior.
   - SALDO EM data anterior.
   - SALDO EM data final.
   - Coluna Saldo.
   - Nmero do documento.
   - Resumo mensal.
   - Total de crditos.
   - Total de dbitos.
   - Saldo disponvel.
   - Limite da conta.
   - Proviso de encargos.
   - Saldos por perodo.
   - Dbitos automticos apresentados em quadros auxiliares.
   - Crditos contratados.
   - Pacotes de servios.
   - ndices econmicos.
   - Textos publicitrios.
   - Cabealhos e rodaps.
   - Nmero da pgina.
   - Nome, agncia ou conta do cliente.
   - Telefones e informaes de atendimento do banco.

PADRO DO CSV

26. Utilize ponto e vrgula como separador:
   ;

27. Gere o arquivo em UTF-8 com BOM, para abrir corretamente no Excel e preservar os acentos.

28. No crie colunas adicionais.

CONTROLE DE QUALIDADE

29. Antes de entregar o arquivo, confira se:
   - O ano foi identificado no prprio extrato.
   - Todas as datas DD/MM foram convertidas para DD/MM/AAAA.
   - Todas as datas vazias foram preenchidas com a ltima data vlida.
   - A data s muda quando uma nova data aparece no extrato.
   - Nenhuma movimentao ficou sem data.
   - As descries de mltiplas linhas foram corretamente unidas.
   - Cada valor corresponde  descrio da mesma movimentao.
   - Os crditos esto somente na coluna CRDITOS.
   - Os dbitos esto somente na coluna DBITOS.
   - Nenhuma linha possui crdito e dbito simultaneamente.
   - Os sinais negativos foram removidos dos dbitos.
   - Os saldos e quadros auxiliares no foram includos.
   - Os lanamentos repetidos foram preservados.
   - A ordem original foi mantida.

30. Entregue somente o arquivo CSV final pronto para download.`;
PROMPT

cat << 'PROMPT' > server/prompts/index.ts
export * from './itau';
export * from './banco-do-brasil';
export * from './tribanco';
export * from './stone';
export * from './bradesco';
export * from './caixa';
export * from './santander';
PROMPT
