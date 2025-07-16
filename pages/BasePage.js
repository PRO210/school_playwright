// pages/BasePage.js
export default class BasePage {
    constructor(page) {
        this.page = page;
    }

    /**
     * Navega para a URL base + o caminho especificado.
     * @param {string} path - O caminho a ser adicionado à URL base.
     */
    async goto(path = '/') {
        await this.page.goto(path);
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
     * Lida com o banner de cookies se ele aparecer.
     */
    async handleCookieBanner() {
        console.log('Verificando banner de cookies...');
        const cookieBanner = await this.page.$('text=/cookies|aceitar|autorizar/i');
        if (cookieBanner) {
            console.log('Autorizando cookies...');
            await cookieBanner.click();
            await this.waitForTimeout(1000); // Pequena espera para a ação do clique
            console.log('Cookies autorizados.');
        } else {
            console.log('Nenhum banner de cookies detectado.');
        }
    }
}

