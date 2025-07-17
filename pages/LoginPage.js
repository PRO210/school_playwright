// pages/LoginPage.js
import BasePage from './BasePage.js';

export default class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        // Seletor para o botão/link que aparece na página inicial de login
        // Confirme se o texto exato é "Acessar o Sistema" e se é um link ou botão
        this.initialAccessButton = page.locator('text="Acessar o Sistema"');

        // Seletores para os campos de email e password que aparecem DEPOIS do clique
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');

        // Seletor para o botão de submissão do formulário de login
        // Confirme se o texto exato é "ENTRAR" e se é um botão de submit
        this.submitButton = page.locator('button[type="submit"]', { hasText: 'ENTRAR' });

        // Opcional: Seletor para mensagens de erro/sucesso após o login, se houver
        this.errorMessage = page.locator('li:has-text("Essas credenciais não foram encontradas em nossos registros.")');
    }

    /**
     * Navega para a URL base do sistema e aguarda o link "Acessar o Sistema".
     */
    async navigateToLoginPortal() {

        // Acessa a URL base do processo.env
        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            throw new Error('BASE_URL não definida no arquivo .env. Por favor, adicione-a.');
        }

        console.log(`Acessando a página inicial: ${baseUrl}`);
        // AQUI: Usamos a variável baseUrl.
        await this.goto(baseUrl, { waitUntil: 'domcontentloaded' });


        console.log('Aguardando o botão "Acessar o Sistema" ficar visível...');
        await this.initialAccessButton.waitFor({ state: 'visible' });
        console.log('Botão "Acessar o Sistema" encontrado.');
    }

    /**
     * Clica no botão/link "Acessar o Sistema" para revelar o formulário de login.
     */
    async clickAccessSystem() {
        console.log('Clicando em "Acessar o Sistema"...');
        await this.initialAccessButton.click();
        // Após clicar, espere que o campo de email (e password) apareça.
        await this.emailInput.waitFor({ state: 'visible' });
        await this.passwordInput.waitFor({ state: 'visible' });
        console.log('Campos de e-mail e senha visíveis.');
    }

    /**
     * Preenche o campo de e-mail.
     * @param {string} email - O e-mail a ser preenchido.
     */
    async fillEmail(email) {
        console.log(`Preenchendo e-mail: ${email}`);
        await this.emailInput.fill(email);
    }

    /**
     * Preenche o campo de senha.
     * @param {string} password - A senha a ser preenchida.
     */
    async fillPassword(password) {
        console.log('Preenchendo senha...');
        await this.passwordInput.fill(password);
    }

    /**
     * Clica no botão de submissão "ENTRAR".
     */
    async submitLogin() {
        console.log('Clicando no botão "ENTRAR" para submeter o login...');
        await this.waitForTimeout(3000);
        await this.submitButton.click();
        // Após o clique, aguarde a navegação ou um elemento da próxima página para confirmar o login.
        // Exemplo: espera que a URL mude para algo como '/dashboard' ou '/home'
        // await this.page.waitForURL(/dashboard|home/, { timeout: 10000 });
        // Ou espera por um elemento específico que só aparece após o login:
        // await this.page.waitForSelector('#main-dashboard-content', { state: 'visible' });
        // Mantenho um waitForTimeout por enquanto, mas recomendo substituí-lo por uma espera real.
        await this.waitForTimeout(2000);
    }

    /**
     * Realiza o processo completo de login.
     * @param {string} email - O e-mail do usuário.
     * @param {string} password - A senha do usuário.
     */
    async performLogin(email, password) {
        await this.navigateToLoginPortal();
        await this.clickAccessSystem();
        await this.fillEmail(email);
        await this.fillPassword(password);
        await this.submitLogin();
        console.log('Processo de login concluído.');
        // Opcional: Adicione uma verificação final se o login foi bem-sucedido
        // try {
        //     await this.page.waitForURL(/dashboard|home/, { timeout: 5000 });
        //     console.log('Login bem-sucedido! Redirecionado para a dashboard.');
        // } catch (error) {
        //     const errorMsg = await this.errorMessage.textContent();
        //     console.error(`Falha no login: ${errorMsg || 'Mensagem de erro não encontrada.'}`);
        //     throw new Error('Falha no login.');
        // }
    }
}