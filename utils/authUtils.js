// utils/authUtils.js
import fs from 'fs/promises';
import 'dotenv/config'; // Forma mais limpa de carregar dotenv em ES Modules

const AUTH_FILE_PATH = 'authData.json';

/**
 * Salva os dados de autenticação (login, senha, cookie) em um arquivo JSON.
 * @param {object} authData - Os dados de autenticação a serem salvos.
 */
async function saveAuthData(authData) {
  try {
    await fs.writeFile(AUTH_FILE_PATH, JSON.stringify(authData, null, 2));
    console.log('Dados de autenticação salvos em authData.json');
  } catch (error) {
    console.error('Erro ao salvar dados de autenticação:', error);
  }
}

/**
 * Carrega os dados de autenticação de um arquivo JSON.
 * @returns {Promise<object | null>} Os dados de autenticação ou null se não encontrados/erro.
 */
async function loadAuthData() {
  try {
    const data = await fs.readFile(AUTH_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Não foi possível carregar authData.json. Realizando login completo.');
    return null;
  }
}


export { saveAuthData, loadAuthData }; // Mude para export nomeado