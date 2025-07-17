// utils/csvUtils.js ou helpers/csvReader.js
import fs from 'fs/promises'; // Para ler arquivos
import { parse } from 'csv-parse'; // Para parsear CSV

/**
 * Lê e parseia um arquivo CSV, retornando os dados como um array de objetos.
 * @param {string} filePath - O caminho completo para o arquivo CSV.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para os dados do CSV.
 */
export async function readCsvFile(filePath) {
    console.log(`Lendo arquivo CSV: ${filePath}`);
    const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });

    return new Promise((resolve, reject) => {
        parse(fileContent, {
            columns: true, // Interpreta a primeira linha como nomes das colunas
            skip_empty_lines: true
        }, (err, records) => {
            if (err) {
                console.error(`Erro ao parsear CSV: ${err.message}`);
                return reject(err);
            }
            console.log(`CSV lido com sucesso. Total de ${records.length} registros.`);
            resolve(records);
        });
    });
}