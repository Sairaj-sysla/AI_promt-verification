// utils/DownloadUtil.ts
import { Download } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const DOWNLOADS_DIR = './downloads';

async function convertToDocx(sourcePath: string, baseName: string): Promise<string> {
  const content   = fs.readFileSync(sourcePath, 'utf8');
  const doc       = new Document({
    sections: [{
      properties: {},
      children:   [new Paragraph({ children: [new TextRun(content)] })],
    }],
  });
  const finalPath = path.join(DOWNLOADS_DIR, `${baseName}.docx`);
  fs.writeFileSync(finalPath, await Packer.toBuffer(doc));
  try { fs.unlinkSync(sourcePath); } catch { /* ignore cleanup errors */ }
  return finalPath;
}

export class DownloadUtil {

  /**
   * Saves a Playwright Download to ./downloads/, retrying once on EBUSY.
   * If the file is not already a .docx, converts it and returns the new path.
   *
   * @returns Absolute path of the final (possibly converted) file.
   */
  static async saveAndConvert(download: Download): Promise<string> {
    await fs.promises.mkdir(DOWNLOADS_DIR, { recursive: true });

    const suggested = download.suggestedFilename();
    const ext       = path.extname(suggested).toLowerCase();
    const savePath  = path.join(DOWNLOADS_DIR, `${Date.now()}-${suggested}`);

    // Save with one EBUSY retry
    try {
      await download.saveAs(savePath);
    } catch (err: any) {
      if (err?.code !== 'EBUSY') throw err;
      await new Promise(r => setTimeout(r, 200));
      await download.saveAs(savePath);
    }

    // Already a docx — nothing to convert
    if (ext === '.docx') {
      console.log('✔ File saved:', savePath);
      return savePath;
    }

    // Attempt text → docx conversion; fall back to raw file on error
    try {
      const finalPath = await convertToDocx(savePath, path.basename(suggested, ext));
      console.log('✔ File saved and converted:', finalPath);
      return finalPath;
    } catch {
      console.log('✔ File saved (conversion skipped):', savePath);
      return savePath;
    }
  }
}