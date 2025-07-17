// pages/BasePage.js

export default class BasePage {
    constructor(page, baseURL) {
        this.page = page;
        this.baseURL = baseURL;
    }

    /**
      * Navega para a URL base + o caminho especificado.
      * @param {string} path - O caminho a ser adicionado à URL base.
      */
    async goto(path = '/') {
        // Se o 'path' já for uma URL completa, use-o.
        // Caso contrário, construa a URL completa com this.baseURL.
        const fullUrl = path.startsWith('http://') || path.startsWith('https://')
            ? path
            : `${this.baseURL}${path}`; // Use this.baseURL aqui

        console.log(`Navegando para: ${fullUrl}`); // Log para acompanhar
        await this.page.goto(fullUrl);
    }
   
    /**
     * Clica em um elemento pelo texto.
     * @param {string} text - O texto do elemento.
     */
    async clickByText(text) {
        await this.page.click(`text="${text}"`);
    }

    /**
     * Preenche um campo de input.
     * @param {string} selector - O seletor do campo de input.
     * @param {string} value - O valor a ser preenchido.
     */
    async fill(selector, value) {
        await this.page.fill(selector, value);
    }

    /**
     * Espera por um determinado seletor.
     * @param {string} selector - O seletor a ser esperado.
     * @param {object} [options] - Opções para waitForSelector.
     */
    async waitForSelector(selector, options) {
        await this.page.waitForSelector(selector, options);
    }

    /**
     * Espera por um determinado tempo em milissegundos (usar com moderação).
     * @param {number} ms - O tempo em milissegundos.
     */
    async waitForTimeout(ms) {
        await this.page.waitForTimeout(ms); // Evitar sempre que possível, preferir awaits por elementos
    }

    /**
     * Clica em um botão de envio (submit) com um texto específico.
     * Rola a página até o botão antes de clicar.
     * @param {string} buttonText - O texto visível do botão.
     */
    async clickSubmitButtonByText(buttonText) {
        // Seletor para um botão <button type="submit"> que contém o texto especificado
        const locator = this.page.locator(`button[type="submit"]:has-text("${buttonText}")`);
        
        // Espera o botão ficar visível
        await locator.waitFor({ state: 'visible', timeout: 10000 }); 
        
        // --- ADICIONADO: Rola a página até o botão se necessário ---
        console.log(`Rolando a página até o botão "${buttonText}"...`);
        await locator.scrollIntoViewIfNeeded();
        // --- FIM DA ADIÇÃO ---

        console.log(`Clicando no botão de envio: "${buttonText}"`);
        await locator.click();
        
        // Opcional: Esperar a navegação ou um indicador de sucesso/falha
        await this.page.waitForLoadState('domcontentloaded'); // Espera a página carregar após o envio
        await this.waitForTimeout(1000); // Pequena espera para renderização
    }

}

