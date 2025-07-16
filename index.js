// index.js (ou main.js, app.js)
import 'dotenv/config'; 
import { chromium } from 'playwright';
import { saveAuthData, loadAuthData } from './utils/authUtils.js'; // Adicione .js
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';



(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: null, // Para usar o tamanho da janela
    screen: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Instanciando os Page Objects
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  // Dados de login
  const loginUser = process.env.EMAIL;
  const loginPass = process.env.SENHA;
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    console.error('Erro: Variável de ambiente BASE_URL não definida. Verifique seu arquivo .env');
    await browser.close();
    return;
  }

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


  console.log('Processo concluído!');
  // await browser.close(); // Descomente para fechar o navegador automaticamente
  await page.pause(); // Mantém o navegador aberto para inspeção
})();

