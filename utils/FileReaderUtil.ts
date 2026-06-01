import fs from 'fs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

export class FileReaderUtil {

    static async readFile(filePath: string): Promise<string> {

        if (!fs.existsSync(filePath)) {
            throw new Error(`FileReaderUtil: file does not exist: ${filePath}`);
        }

        if (filePath.endsWith('.docx')) {
            try {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            } catch (e) {
                throw new Error(`FileReaderUtil: error reading .docx ${filePath}: ${String(e)}`);
            }
        }

        if (filePath.endsWith('.xlsx')) {
            try {
                const workbook = xlsx.readFile(filePath);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                return JSON.stringify(xlsx.utils.sheet_to_json(sheet));
            } catch (e) {
                throw new Error(`FileReaderUtil: error reading .xlsx ${filePath}: ${String(e)}`);
            }
        }

        if (filePath.endsWith('.csv')) {
            try {
                return fs.readFileSync(filePath, 'utf-8');
            } catch (e) {
                throw new Error(`FileReaderUtil: error reading .csv ${filePath}: ${String(e)}`);
            }
        }

        if (filePath.endsWith('.pdf')) {
            try {
                const buffer = fs.readFileSync(filePath);
                const data = await pdfParse(buffer as any);
                return data.text ?? '';
            } catch (e) {
                throw new Error(`FileReaderUtil: error reading .pdf ${filePath}: ${String(e)}`);
            }
        }

        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
            throw new Error(`FileReaderUtil: error reading file ${filePath}: ${String(e)}`);
        }
    }
}