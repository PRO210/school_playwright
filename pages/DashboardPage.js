// pages/DashboardPage.js
import BasePage from './BasePage.js';

export default class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    // Seletor de um elemento que SÓ existe na sua Dashboard
    // SUBSTITUA este seletor por algo real da sua dashboard, ex: um título, um menu, um painel
    this.dashboardMainElement = page.locator('h5:has-text("Matriculados")');
    // Ou
    // this.dashboardMainElement = page.locator('#main-dashboard-menu');
  }

  /**
   * Verifica se a página atual é a Dashboard.
   * Isso é feito aguardando por um elemento exclusivo da Dashboard.
   * @returns {Promise<boolean>} True se o dashboard estiver visível, false caso contrário.
   */
  async isDashboardLoaded() {
    try {
      console.log('Verificando se o dashboard está carregado...');
      // Espera por um elemento específico que só aparece no dashboard
      await this.dashboardMainElement.waitFor({ state: 'visible', timeout: 10000 }); // Tempo de espera para o elemento da dashboard
      console.log('Dashboard carregado com sucesso!');
      return true;
    } catch (error) {
      console.log('Dashboard não está visível ou não carregou.');
      return false;
    }
  }

  // Outros métodos relacionados ao dashboard, se houver
}