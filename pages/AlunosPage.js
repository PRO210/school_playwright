// pages/AlunosPage.js
import { log } from 'console';
import BasePage from './BasePage.js';


export default class AlunosPage extends BasePage {
    constructor(page, baseURL) {
        super(page, baseURL); // baseURL é passada para o construtor da BasePage
        // Seletor para o campo de busca de alunos
        this.searchInput = page.locator('input[type="search"][class*="form-control"]');

        // Seletor para o span que exibe o nome do aluno na tabela
        this.getAlunoNameSpan = (alunoNome) => page.locator(`span.whitespace-normal:has-text("${alunoNome}")`);

        // Seletor para o botão dropdown (ícone de engrenagem)
        this.actionDropdownButton = page.locator('button.btn-outline-success.inline.p-1[data-toggle="dropdown"] svg.bi-gear-fill').first();

        // Seletor para o link "Alterar o Cadastro" dentro do dropdown
        this.alterarCadastroLink = page.locator('a.dropdown-item:has-text("Alterar o Cadastro")');
    }

    /**
     * Navega para a página de gerenciamento de alunos (tabela de alunos).
     * Utiliza this.baseURL definida no construtor.
     */
    async navigateToAlunosPage() {

        const alunosPath = '/dashboard/turmas/alunos';
        const alunosUrl = `${this.baseURL}${alunosPath}`; // Usa this.baseURL

        console.log(`Navegando para a página de alunos: ${alunosUrl}`);
        await this.goto(alunosPath, { waitUntil: 'domcontentloaded' }); // Usa o método goto da BasePage, que já constrói a URL completa
        await this.searchInput.waitFor({ state: 'visible' });
        console.log('Página de alunos carregada.');
    }

    /**
     * Busca um aluno pelo nome no campo de busca.
     * @param {string} alunoNome - O nome do aluno a ser buscado.
     */
    async searchAluno(alunoNome) {
        console.log(`Buscando aluno: "${alunoNome}"...`);
        await this.searchInput.fill(alunoNome);
        await this.waitForTimeout(2000);
        console.log('Busca por aluno realizada.');
    }

    /**
     * Verifica se o nome do aluno buscado está visível na lista.
     * @param {string} alunoNome - O nome do aluno a ser verificado.
     * @returns {Promise<boolean>} True se o nome do aluno estiver visível, false caso contrário.
     */
    async isAlunoNameVisible(alunoNome) {
        console.log(`Verificando se o nome "${alunoNome}" está visível...`);
        const locator = this.getAlunoNameSpan(alunoNome);
        try {
            await locator.waitFor({ state: 'visible', timeout: 5000 });
            console.log(`Nome do aluno "${alunoNome}" encontrado na lista.`);
            return true;
        } catch (error) {
            console.log(`Nome do aluno "${alunoNome}" NÃO encontrado na lista.`);
            return false;
        }
    }

    /**
     * Clica no botão dropdown (engrenagem) de ações para um aluno específico.
     * @param {string} alunoNome - O nome do aluno cuja linha tem o botão de dropdown.
     */
    async clickAlunoActionDropdown(alunoNome) {
        console.log(`Clicando no botão de ações para o aluno "${alunoNome}"...`);
        const alunoRowLocator = this.getAlunoNameSpan(alunoNome).locator('xpath=./ancestor::tr');
        const dropdownButton = alunoRowLocator.locator('button.btn-outline-success.inline.p-1[data-toggle="dropdown"]');

        await dropdownButton.click();
        await this.alterarCadastroLink.waitFor({ state: 'visible' });
        console.log('Dropdown de ações clicado e opções visíveis.');
    }

    /**
     * Clica no link "Alterar o Cadastro" dentro do dropdown de ações.
     */
    async clickAlterarCadastro() {
        console.log('Clicando no link "Alterar o Cadastro"...');
        await this.alterarCadastroLink.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.waitForTimeout(3000);
        console.log('Redirecionado para a página de edição do aluno.');
    }

    /**
       * Preenche um campo de input ou textarea pelo atributo 'name'.    
       * @param {string} nameAttribute - O valor do atributo 'name' do input/textarea.
       * @param {string} value - O valor a ser preenchido no campo.
       */
    async fillInputByName(nameAttribute, value) {

        let processedValue = value;

        if (nameAttribute === 'CPF') {
            // 🔹 Limpeza: apenas números
            let processedValue = value.replace(/\D/g, '').slice(0, 11);

            // 🔸 Validação: CPF deve ter exatamente 11 dígitos
            if (!/^\d{11}$/.test(processedValue)) {
                console.warn(`⚠️ "${nameAttribute}" inválido para campo "${nameAttribute}": "${value}" → "${processedValue}".`);
                return;
            }
        } 

        if (nameAttribute === 'INEP') {
            // 🔹 Limpeza: apenas números
            let processedValue = value.replace(/\D/g, '').slice(0, 11);

            // 🔸 Validação: INEP deve ter exatamente 11 dígitos
            if (!/^\d{11}$/.test(processedValue)) {
                console.warn(`⚠️ "${nameAttribute}" inválido para campo "${nameAttribute}": "${value}" → "${processedValue}".`);
                return;
            }
        } 

        if (nameAttribute === 'NIS') {
            // 🔹 Limpeza: apenas números
            let processedValue = value.replace(/\D/g, '').slice(0, 11);

            // 🔸 Validação: NIS deve ter exatamente 11 dígitos
            if (!/^\d{11}$/.test(processedValue)) {
                console.warn(`⚠️ "${nameAttribute}" inválido para campo "${nameAttribute}": "${value}" → "${processedValue}".`);
                return;
            }
        } 

        const locator = this.page.locator(`input[name="${nameAttribute}"], textarea[name="${nameAttribute}"]`);

        console.log(`🔍 Procurando o campo "${nameAttribute}"...`);
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        await locator.scrollIntoViewIfNeeded();
        // await locator.waitFor({ state: 'editable', timeout: 15000 });

        // 🖱️ Clica no campo para garantir foco
        await locator.click();

        // 🧹 Limpa qualquer conteúdo anterior
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');

        // ⌨️ Digita caractere por caractere (respeitando eventos JS como máscara ou validador)
        console.log(`⌨️ Digitando no campo "${nameAttribute}": ${processedValue}`);
        await this.page.keyboard.type(processedValue, { delay: 100 }); // delay ajuda com máscaras

        // (opcional) dispara blur
        // await locator.evaluate(el => el.blur());
    }




    /**
     * Realiza o fluxo completo de busca e acesso à edição de um aluno.
     * @param {string} alunoNome - O nome do aluno a ser encontrado e editado.
     * // REMOVIDO: baseURL como parâmetro, pois já está em this.baseURL
     */
    async performSearchAndEditAluno(alunoNome) {
        await this.navigateToAlunosPage();
        await this.searchAluno(alunoNome);
        const found = await this.isAlunoNameVisible(alunoNome);
        if (!found) {
            throw new Error(`Aluno "${alunoNome}" não foi encontrado após a busca.`);
        }
        await this.clickAlunoActionDropdown(alunoNome);
        await this.clickAlterarCadastro();
        console.log(`Fluxo de busca e acesso à edição para "${alunoNome}" concluído.`);
    }
}