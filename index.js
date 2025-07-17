// index.js (ou main.js, app.js)
import 'dotenv/config';
import { chromium } from 'playwright';
import { saveAuthData, loadAuthData } from './utils/authUtils.js'; // Adicione .js
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import AlunosPage from './pages/AlunosPage.js';
import { readCsvFile } from './utils/readCsvFile.js';



(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: null, // Para usar o tamanho da janela
    screen: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Dados de login
  const loginUser = process.env.EMAIL;
  const loginPass = process.env.SENHA;
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    console.error('Erro: Variável de ambiente BASE_URL não definida. Verifique seu arquivo .env');
    await browser.close();
    return;
  }

  // Instanciando os Page Objects
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const alunosPage = new AlunosPage(page, baseUrl);



  // --- Lógica de Autenticação Reutilizável ---
  let loggedIn = false;
  let authData = await loadAuthData();


  if (authData && authData.authCookie) {
    console.log('Tentando restaurar sessão com cookie existente...');
    await context.addCookies([authData.authCookie]);

    // Tenta navegar DIRETAMENTE para a URL da dashboard
    // Use o URL_DO_DASHBOARD_APOS_LOGIN ou construa-o com baseUrl
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });

    // Verifica se o dashboard carregou com sucesso (indicando sessão válida)
    loggedIn = await dashboardPage.isDashboardLoaded();

    if (loggedIn) {
      console.log('Sessão restaurada com sucesso! Já estamos no dashboard.');
    } else {
      console.warn('Sessão expirada ou cookie inválido. Realizando login completo...');
      // Remove o cookie salvo se a sessão não for válida para evitar tentar novamente com um cookie ruim
      await saveAuthData({ login: loginUser, senha: loginPass, authCookie: null });
    }
  }

  if (!loggedIn) {
    console.log('Iniciando processo de login completo...');
    await loginPage.performLogin(loginUser, loginPass);

    // Após login, verifique se o dashboard carregou.
    // Isso garante que o performLogin levou ao estado esperado.
    loggedIn = await dashboardPage.isDashboardLoaded();
    if (!loggedIn) {
      console.error('Erro: Login completo realizado, mas o dashboard não foi carregado. Verifique credenciais ou fluxo de login.');
      await browser.close();
      return; // Sai se o login completo falhou
    }

    // Se o login completo foi bem-sucedido, salve o novo cookie.
    const currentCookies = await context.cookies();
    // Ajuste o nome do cookie de autenticação se ele for diferente de 'laravel' ou 'session'
    const newAuthCookie = currentCookies.find(c => c.name.toLowerCase().includes('laravel') || c.name.toLowerCase().includes('session'));
    await saveAuthData({ login: loginUser, senha: loginPass, authCookie: newAuthCookie || null });
  }

  // --- A partir daqui, você tem certeza que está logado e no dashboard ---
  console.log('Executando operações de gerenciamento de alunos...');

  const alunosData = await readCsvFile('./alunos.csv');

  // --- NOVA LISTA PARA ARMAZENAR ALUNOS NÃO ENCONTRADOS ---
  const alunosNaoEncontrados = [];
  const alunosProcessadosComSucesso = [];
  const errosGeraisNoProcessamento = []; // Para erros que não são de "aluno não encontrado"

  try {

    const totalAlunos = alunosData.length;
    console.log(`Total de alunos a processar: ${totalAlunos}`);
    console.log(`Nomes carregados: ${alunosData.map(r => r.NomeDoAluno).join(', ')}`);

    // --- LOOP PRINCIPAL DE PROCESSAMENTO DE ALUNOS ---
    for (let i = 0; i < totalAlunos; i++) {
      const record = alunosData[i];
      const nomeAluno = record.NomeDoAluno;
      const cpfAluno = record.CPF;

      console.log(`\n[${i + 1}/${totalAlunos}] Processando aluno: ${nomeAluno}, CPF: ${cpfAluno}`);


      try {
        // Navega para a página de alunos e tenta buscar
        await alunosPage.navigateToAlunosPage();
        await alunosPage.searchAluno(nomeAluno);

        const found = await alunosPage.isAlunoNameVisible(nomeAluno); // Retorna true/false

        if (!found) {
          // Se o aluno NÃO for encontrado, adiciona à lista e PULA para o próximo.
          console.warn(`⚠️ Aluno "${nomeAluno}" NÃO encontrado na lista após busca. Pulando para o próximo.`);
          alunosNaoEncontrados.push(nomeAluno);
          continue; // <-- Continua para a próxima iteração do loop
        }

        // Se o aluno foi encontrado, continue com o fluxo normal de edição
        console.log(`Aluno "${nomeAluno}" encontrado. Prosseguindo com a edição.`);
        await alunosPage.clickAlunoActionDropdown(nomeAluno);
        await alunosPage.clickAlterarCadastro();

        // --- AQUI VOCÊ USARÁ A NOVA FUNÇÃO PARA PREENCHER O CPF ---
        if (cpfAluno) {
          await alunosPage.fillInputByName('CPF', cpfAluno);
        } else {
          console.log(`CPF não fornecido no CSV para o aluno ${nomeAluno}. Pulando o preenchimento do CPF.`);
        }

        // --- E DEPOIS O CLIQUE NO BOTÃO SALVAR ---
        await alunosPage.clickSubmitButtonByText('Salvar'); // Salva todas as alterações feitas na página
        console.log(`Alterações salvas para o aluno: ${nomeAluno}`);

        // Opcional: Adicionar à lista de sucesso se todo o fluxo de edição foi bem
        alunosProcessadosComSucesso.push(nomeAluno);



      } catch (innerError) {
        // Este catch pega erros DENTRO do processamento de um aluno específico,
        // que não sejam apenas "aluno não encontrado" (como um clique que falhou após encontrar o aluno).
        console.error(`❌ Erro ao processar aluno "${nomeAluno}":`, innerError.message);
        errosGeraisNoProcessamento.push({ aluno: nomeAluno, erro: innerError.message });
        // Ainda assim, continuamos para o próximo aluno, a menos que o erro seja irrecuperável.
      }
    }

  } catch (outerError) {
    // Este catch pega erros na leitura do CSV ou na inicialização do loop.
    console.error('❌ Erro na automação geral (leitura do CSV ou loop principal):', outerError);

  } finally {
    // --- RESULTADOS FINAIS ---
    console.log('\n--- Resumo do Processamento ---');
    console.log(`Total de alunos no CSV: ${alunosData.length}`);
    console.log(`Alunos processados com sucesso: ${alunosProcessadosComSucesso.length}`);
    console.log(`Alunos não encontrados na lista: ${alunosNaoEncontrados.length}`);

    // --- SALVAR ALUNOS NÃO ENCONTRADOS EM ARQUIVO ---
    if (alunosNaoEncontrados.length > 0) {
      const naoEncontradosContent = `Alunos NÃO encontrados na lista:\n\n${alunosNaoEncontrados.join('\n')}\n`;
      const naoEncontradosFilePath = 'alunos_nao_encontrados.txt';
      try {
        await fs.writeFile(naoEncontradosFilePath, naoEncontradosContent);
        console.log(`Nomes dos alunos NÃO encontrados salvos em: ${naoEncontradosFilePath}`);
      } catch (writeErr) {
        console.error(`❌ Erro ao salvar arquivo de alunos não encontrados: ${writeErr.message}`);
      }
    } else {
      console.log('Todos os alunos do CSV foram encontrados na lista.');
    }

    // --- SALVAR ERROS GERAIS NO PROCESSAMENTO EM ARQUIVO ---
    if (errosGeraisNoProcessamento.length > 0) {
      const errosContent = 'Erros detalhados no processamento de alunos:\n\n' +
        errosGeraisNoProcessamento.map(err => `Aluno: ${err.aluno}, Erro: ${err.erro}`).join('\n') + '\n';
      const errosFilePath = 'alunos_erros_processamento.txt';
      try {
        await fs.writeFile(errosFilePath, errosContent);
        console.log(`Detalhes dos erros de processamento salvos em: ${errosFilePath}`);
      } catch (writeErr) {
        console.error(`❌ Erro ao salvar arquivo de erros de processamento: ${writeErr.message}`);
      }
    } else {
      console.log('Nenhum erro de processamento específico de aluno foi registrado.');
    }

    console.log('------------------------------');
    console.log('Processo concluído!');
    // await browser.close();
    await page.pause();
  }







})();

