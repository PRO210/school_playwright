import { writeFile } from 'fs/promises';
import readCsvFile from './utils/readCsvFile.js';

/**
 * Classe responsável por automatizar o gerenciamento de alunos com base em dados lidos de um arquivo CSV.
 * 
 * Essa classe realiza a leitura de um CSV contendo dados de alunos (como CPF, INEP e NIS) e utiliza a interface da aplicação web
 * para localizar, editar e salvar as informações de cada aluno via Playwright.
 * 
 * O fluxo principal inclui:
 *  - Leitura e parse do CSV;
 *  - Busca de cada aluno na interface;
 *  - Preenchimento dos campos apenas se houver valor no CSV;
 *  - Salvar os dados e confirmar alertas;
 *  - Registro de erros e geração de arquivos de log (TXT) com os resultados.
 * 
 * A classe depende de uma instância de `page` do Playwright e de um objeto `alunosPage` que segue o padrão Page Object Model (POM),
 * contendo os métodos necessários para interação com a interface da aplicação de alunos.
 * 
 * @example
 * import GerenciadorAlunosCsv from './GerenciadorAlunosCsv.js';
 * import AlunosPage from './pages/AlunosPage.js';
 * 
 * const browser = await chromium.launch();
 * const page = await browser.newPage();
 * const alunosPage = new AlunosPage(page);
 * 
 * const gerenciador = new GerenciadorAlunosCsv(page, alunosPage, './dados/alunos.csv');
 * await gerenciador.executar();
 * 
 * @typedef {object} AlunoCSV
 * @property {string} NomeDoAluno - Nome completo do aluno
 * @property {string} [NIS] - Número do NIS (opcional)
 * @property {string} [CPF] - Número do CPF (opcional)
 * @property {string} [INEP] - Código INEP (opcional)
 */
export default class GerenciadorAlunosCsv {
  /**
   * Cria uma nova instância do Gerenciador de Alunos a partir de um CSV.
   * 
   * @param {import('playwright').Page} page - Instância da página Playwright (controle global)
   * @param {object} alunosPage - Instância da página de alunos seguindo o padrão POM
   * @param {string} [csvPath='./alunos.csv'] - Caminho para o arquivo CSV com os dados dos alunos
   */
  constructor(page, alunosPage, csvPath = './alunos.csv') {
    this.page = page;
    this.alunosPage = alunosPage;
    this.csvPath = csvPath;

    /** @type {AlunoCSV[]} */
    this.alunosData = [];

    /** @type {string[]} */
    this.alunosNaoEncontrados = [];

    /** @type {string[]} */
    this.alunosProcessadosComSucesso = [];

    /** @type {{ aluno: string, erro: string }[]} */
    this.errosGeraisNoProcessamento = [];
  }

  async carregarCSV() {
    this.alunosData = await readCsvFile(this.csvPath);
    console.log(`Total de alunos a processar: ${this.alunosData.length}`);
    console.log(`Nomes carregados: ${this.alunosData.map(r => r.NomeDoAluno).join(', ')}`);
  }

  async preencherCampoIfExists(campo, valor, nomeAluno) {
    if (valor?.trim()) {
      await this.alunosPage.fillInputByName(campo, valor);
    } else {
      console.log(`${campo} não fornecido no CSV para o aluno ${nomeAluno}. Pulando o preenchimento.`);
    }
  }

  async processarAluno(aluno) {
    const { NomeDoAluno, NIS, CPF, INEP } = aluno;

    try {
      await this.alunosPage.navigateToAlunosPage();
      await this.page.waitForTimeout(2000);

      await this.alunosPage.searchAluno(NomeDoAluno);
      await this.page.waitForTimeout(2000);

      const found = await this.alunosPage.isAlunoNameVisible(NomeDoAluno);

      if (!found) {
        console.warn(`⚠️ Aluno "${NomeDoAluno}" NÃO encontrado. Pulando.`);
        this.alunosNaoEncontrados.push(NomeDoAluno);
        return;
      }

      console.log(`Aluno "${NomeDoAluno}" encontrado. Editando...`);
      await this.alunosPage.clickAlunoActionDropdown(NomeDoAluno);
      await this.page.waitForTimeout(2000);

      await this.alunosPage.clickAlterarCadastro();
      await this.page.waitForTimeout(2000);

      const camposParaPreencher = [
        ['CPF', CPF],
        ['INEP', INEP],
        ['NIS', NIS]
      ];

      for (const [campo, valor] of camposParaPreencher) {
        await this.preencherCampoIfExists(campo, valor, NomeDoAluno);
      }

      await this.alunosPage.clickSubmitButtonByText('Salvar');
      this.alunosProcessadosComSucesso.push(NomeDoAluno);

      await this.alunosPage.confirmAlert();
      console.log(`Alterações salvas e alerta confirmado para: ${NomeDoAluno}`);

    } catch (err) {
      console.error(`❌ Erro ao processar "${NomeDoAluno}":`, err.message);
      this.errosGeraisNoProcessamento.push({ aluno: NomeDoAluno, erro: err.message });
    }
  }

  async processarTodosAlunos() {
    for (const aluno of this.alunosData) {
      await this.processarAluno(aluno);
      await this.page.waitForTimeout(3000);
    }
  }

  async salvarResultadosEmArquivo(nomeArquivo, conteudo) {
    try {
      await writeFile(nomeArquivo, conteudo);
      console.log(`Arquivo salvo: ${nomeArquivo}`);
    } catch (err) {
      console.error(`❌ Erro ao salvar ${nomeArquivo}: ${err.message}`);
    }
  }

  async resumoFinal() {
    console.log('\n--- Resumo do Processamento ---');
    console.log(`Total de alunos no CSV: ${this.alunosData.length}`);
    console.log(`Alunos processados com sucesso: ${this.alunosProcessadosComSucesso.length}`);
    console.log(`Alunos não encontrados: ${this.alunosNaoEncontrados.length}`);

    if (this.alunosNaoEncontrados.length > 0) {
      await this.salvarResultadosEmArquivo(
        'alunos_nao_encontrados.txt',
        `Alunos NÃO encontrados:\n\n${this.alunosNaoEncontrados.join('\n')}\n`
      );
    }

    if (this.errosGeraisNoProcessamento.length > 0) {
      const errosTexto = this.errosGeraisNoProcessamento
        .map(e => `Aluno: ${e.aluno}, Erro: ${e.erro}`)
        .join('\n');
      await this.salvarResultadosEmArquivo('alunos_erros_processamento.txt', `Erros:\n\n${errosTexto}\n`);
    }
  }

  async executar() {
    console.log('Executando operações de gerenciamento de alunos...');
    try {
      await this.carregarCSV();
      await this.processarTodosAlunos();
    } catch (e) {
      console.error('❌ Erro geral na automação:', e.message);
    } finally {
      await this.resumoFinal();
    }
  }
}
