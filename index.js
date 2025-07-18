// index.js (ou main.js, app.js)
import 'dotenv/config';
import { chromium } from 'playwright';
import { saveAuthData, loadAuthData } from './utils/authUtils.js'; // Adicione .js
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import AlunosPage from './pages/AlunosPage.js';
import { readCsvFile } from './utils/readCsvFile.js';
import { writeFile } from 'fs/promises';


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

  const alunosNaoEncontrados = [];
  const alunosProcessadosComSucesso = [];
  const errosGeraisNoProcessamento = [];

  // Função para tentar processar um aluno específico
  async function processarAluno(page, alunosPage, aluno) {
    const { NomeDoAluno, NIS, CPF, INEP } = aluno;
    try {
      await alunosPage.navigateToAlunosPage();
      await page.waitForTimeout(2000);

      await alunosPage.searchAluno(NomeDoAluno);
      await page.waitForTimeout(2000);

      const found = await alunosPage.isAlunoNameVisible(NomeDoAluno);

      if (!found) {
        console.warn(`⚠️ Aluno "${NomeDoAluno}" NÃO encontrado. Pulando para o próximo.`);
        alunosNaoEncontrados.push(NomeDoAluno);
        return false;
      }

      console.log(`Aluno "${NomeDoAluno}" encontrado. Prosseguindo com a edição.`);
      await alunosPage.clickAlunoActionDropdown(NomeDoAluno);
      await page.waitForTimeout(2000);

      await alunosPage.clickAlterarCadastro();
      await page.waitForTimeout(2000);

      await preencherCampoIfExists(alunosPage, 'CPF', CPF, NomeDoAluno);
      await preencherCampoIfExists(alunosPage, 'INEP', INEP, NomeDoAluno);
      await preencherCampoIfExists(alunosPage, 'NIS', NIS, NomeDoAluno);

      await alunosPage.clickSubmitButtonByText('Salvar');
      alunosProcessadosComSucesso.push(NomeDoAluno);

      await alunosPage.confirmAlert();
      console.log(`Alterações salvas e alert confirmado para: ${NomeDoAluno}`);

      return true;
    } catch (err) {
      console.error(`❌ Erro ao processar "${NomeDoAluno}":`, err.message);
      errosGeraisNoProcessamento.push({ aluno: NomeDoAluno, erro: err.message });
      return false;
    }
  }

  async function preencherCampoIfExists(alunosPage, campo, valor, nomeAluno) {
    if (valor?.trim()) {
      await alunosPage.fillInputByName(campo, valor);
    } else {
      console.log(`${campo} não fornecido no CSV para o aluno ${nomeAluno}. Pulando o preenchimento.`);
    }
  }

  async function salvarResultadosEmArquivo(nomeArquivo, conteudo) {
    try {
      await writeFile(nomeArquivo, conteudo);
      console.log(`Arquivo salvo: ${nomeArquivo}`);
    } catch (err) {
      console.error(`❌ Erro ao salvar ${nomeArquivo}: ${err.message}`);
    }
  }

  async function processarTodosAlunos(page, alunosPage, alunosData) {
    console.log(`Total de alunos a processar: ${alunosData.length}`);
    console.log(`Nomes carregados: ${alunosData.map(r => r.NomeDoAluno).join(', ')}`);

    for (const aluno of alunosData) {
      await processarAluno(page, alunosPage, aluno);
      await page.waitForTimeout(3000);
    }
  }

  async function resumoFinal(alunosData) {
    console.log('\n--- Resumo do Processamento ---');
    console.log(`Total de alunos no CSV: ${alunosData.length}`);
    console.log(`Alunos processados com sucesso: ${alunosProcessadosComSucesso.length}`);
    console.log(`Alunos não encontrados na lista: ${alunosNaoEncontrados.length}`);

    if (alunosNaoEncontrados.length > 0) {
      await salvarResultadosEmArquivo(
        'alunos_nao_encontrados.txt',
        `Alunos NÃO encontrados na lista:\n\n${alunosNaoEncontrados.join('\n')}\n`
      );
    } else {
      console.log('Todos os alunos do CSV foram encontrados na lista.');
    }

    if (errosGeraisNoProcessamento.length > 0) {
      await salvarResultadosEmArquivo(
        'alunos_erros_processamento.txt',
        'Erros detalhados:\n\n' +
        errosGeraisNoProcessamento.map(
          err => `Aluno: ${err.aluno}, Erro: ${err.erro}`
        ).join('\n') + '\n'
      );
    } else {
      console.log('Nenhum erro de processamento específico de aluno foi registrado.');
    }
  }

  // USO PRINCIPAL
  async function editarAlunosCsv(page, alunosPage, alunosData) {
    try {
      await processarTodosAlunos(page, alunosPage, alunosData);
    } catch (outerError) {
      console.error('❌ Erro na automação geral:', outerError);
    } finally {
      await resumoFinal(alunosData);
    }
  }

  editarAlunosCsv(page, alunosPage, alunosData);



})();

