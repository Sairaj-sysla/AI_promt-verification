import fs from 'fs';
import path from 'path';

export class LatestFileUtil {

    static getLatestFile(downloadPath: string): string {

        const entries = fs.readdirSync(downloadPath);

        const files = entries
            .map(file => {
                const filePath = path.join(downloadPath, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        return { file, time: stat.mtime.getTime() };
                    }
                } catch (e) {
                    return null;
                }
                return null;
            })
            .filter(Boolean) as { file: string; time: number }[];

        if (files.length === 0) {
            throw new Error(`No files found in download path: ${downloadPath}`);
        }

        const latestFile = files.sort((a, b) => b.time - a.time)[0];

        return path.join(downloadPath, latestFile.file);
    }
}