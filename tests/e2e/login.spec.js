// tests/e2e/login.spec.js

// 1. Importações Essenciais do Playwright Test e das Page Objects
import { test, expect } from '@playwright/test';
import LoginPage from '../../pages/LoginPage.js';
import DashboardPage from '../../pages/DashboardPage.js';

// 2. Definição das Credenciais de Login (do .env)
const LOGIN_USER = process.env.EMAIL;
const LOGIN_PASS = process.env.SENHA;
const BASE_URL = process.env.BASE_URL; // Embora o baseURL do config.js já o use, é bom ter aqui para verificações diretas se necessário.

// 3. Bloco de Descrição do Teste (test.describe)
test.describe('Fluxo de Login no Sistema Escolar', () => {

  // 4. Configuração Antes de Cada Teste (test.beforeEach)
  // Este bloco é executado ANTES de CADA teste (test) dentro deste 'describe'.
  // Garante que cada teste comece em um estado limpo e consistente.
  test.beforeEach(async ({ page }) => {
    // Instancia as Page Objects para cada teste.
    // 'page' é injetado automaticamente pelo Playwright Test Runner.
    // Não precisamos mais de 'browser.launch()' ou 'context.newPage()' aqui.
    test.loginPage = new LoginPage(page);
    test.dashboardPage = new DashboardPage(page);

    // Verificação de segurança: Garante que as variáveis de ambiente estão definidas.
    // Se não estiverem, o teste falha imediatamente com uma mensagem clara.
    if (!LOGIN_USER || !LOGIN_PASS || !BASE_URL) {
      throw new Error('Variáveis de ambiente LOGIN, SENHA ou BASE_URL não definidas. Verifique seu arquivo .env');
    }
  });

  // 5. O Teste Principal: Login Bem-Sucedido (test)
  // Define um caso de teste específico. O nome deve ser descritivo.
  test('deve permitir que um usuário faça login com sucesso', async ({ page }) => {
    console.log('Iniciando teste de login bem-sucedido...');

    // Ação Principal: Chama o método 'performLogin' da LoginPage.
    // Este método encapsula toda a sequência de navegação, clique no botão "Acessar o Sistema",
    // preenchimento de campos e submissão do formulário.
    await test.loginPage.performLogin(LOGIN_USER, LOGIN_PASS);

    // Asserção Crítica: Verifica se o login levou ao dashboard.
    // Chama o método 'isDashboardLoaded' da DashboardPage.
    // Este método verifica a presença de um elemento exclusivo do dashboard.
    const isDashboardLoaded = await test.dashboardPage.isDashboardLoaded();

    // 'expect' é a função de asserção do Playwright.
    // Aqui, esperamos que 'isDashboardLoaded' seja 'true'.
    // Se for 'false', o teste falha, indicando que o login não foi bem-sucedido.
    expect(isDashboardLoaded).toBe(true);

    // Opcional, mas recomendado: Asserção na URL final.
    // Verifica se a URL atual da página contém '/dashboard' (ou a rota real do seu dashboard).
    // Isso adiciona uma camada extra de confiança.
    expect(page.url()).toContain('/dashboard');

    console.log('Teste de login bem-sucedido concluído.');
    // await page.pause(); // Descomente esta linha para pausar o navegador para inspeção manual durante a execução.
  });

  // 6. Teste Opcional: Login com Credenciais Inválidas
  // É uma boa prática incluir testes para cenários de falha.
  test('não deve permitir que um usuário faça login com credenciais inválidas', async ({ page }) => {
    console.log('Iniciando teste de login com credenciais inválidas...');

    // Tenta fazer login com credenciais que você sabe que são inválidas.
    await test.loginPage.performLogin('usuario_invalido@teste.com', 'senha_errada');

    // Asserções para o cenário de falha:
    // 1. Espera que a mensagem de erro de login seja visível.
    //    Você precisa ter um seletor para essa mensagem de erro na sua LoginPage.
    await expect(test.loginPage.errorMessage).toBeVisible();

    // 2. Garante que o dashboard NÃO foi carregado.
    expect(await test.dashboardPage.isDashboardLoaded()).toBe(false);

    // 3. Opcional: Verifica se a URL permaneceu na página de login ou em uma página de erro.
    expect(page.url()).toContain('/login'); // Ou a URL da página de erro, se houver.

    console.log('Teste de login com credenciais inválidas concluído.');
  });

});