import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export interface VerificationResult {
  score:          number;
  matched:        number;
  expectedText:   string;
  actualText:     string;
  downloadedFile: string;
}

export class VerificationUtil {
  static async verifyDownloadedFile(
    expectedFilePath: string,
    downloadsDir:     string,
    threshold:        number = 45
  ): Promise<VerificationResult> {
    const files = fs.readdirSync(downloadsDir)
      .map(fileName => ({
        fileName,
        time: fs.statSync(path.join(downloadsDir, fileName)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      throw new Error(`No files found in downloads directory: ${downloadsDir}`);
    }

    const latestFile = path.join(downloadsDir, files[0].fileName);
    const expectedText = fs.existsSync(expectedFilePath)
      ? await VerificationUtil.extractText(expectedFilePath)
      : '';
    const actualText = await VerificationUtil.extractText(latestFile);

    const expectedWords = new Set(VerificationUtil.normalizeWords(expectedText));
    const matched = expectedText
      ? VerificationUtil.calculateMatchedWords(expectedText, actualText)
      : 0;

    const score = expectedText
      ? Math.min(Math.round((matched / expectedWords.size) * 100), 100)
      : actualText.trim().length > 0 ? 100 : 0;

    console.log(`[VerificationUtil] Downloaded file: ${latestFile}`);
    console.log(`[VerificationUtil] Score: ${score}`);
    console.log(`[VerificationUtil] Matched word count: ${matched}`);
    console.log(`[VerificationUtil] Actual text preview:\n${actualText.slice(0, 300)}`);

    return {
      score,
      matched,
      expectedText,
      actualText,
      downloadedFile: latestFile,
    };
  }

  private static async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }

    if (ext === '.txt' || ext === '.md') {
      return fs.readFileSync(filePath, 'utf8').trim();
    }

    try {
      return fs.readFileSync(filePath, 'utf8').trim();
    } catch {
      throw new Error(`Cannot extract text from unsupported file type: ${ext}`);
    }
  }

  private static normalizeWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  private static calculateMatchedWords(expected: string, actual: string): number {
    const expectedWords = new Set(VerificationUtil.normalizeWords(expected));
    const actualWords = VerificationUtil.normalizeWords(actual);
    return actualWords.filter(word => expectedWords.has(word)).length;
  }
}