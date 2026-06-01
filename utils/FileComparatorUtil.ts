import mammoth from 'mammoth';
import { FileReaderUtil } from './FileReaderUtil';
import fs from 'fs';

function normalizeText(s: string) {
    return s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^A-Za-z0-9\.\?\!\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const STOPWORDS = new Set([
    'the', 'and', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'by', 'that', 'this', 'it', 'as', 'at', 'from', 'or', 'which', 'but', 'has', 'have', 'i', 'you', 'we', 'they'
]);

function simpleStem(w: string) {
    return w.replace(/(ing|ed|ly|es|s)$/i, '');
}

function tokenizeWithSentences(text: string) {
    const normalized = normalizeText(text);
    const sentences = normalized.split(/(?<=[\.\?\!])\s+/);
    const tokensPerSentence = sentences.map(s => s.split(/\s+/).map(t => simpleStem(t)).filter(t => t && !STOPWORDS.has(t)));
    const tokens = tokensPerSentence.flat();
    return { tokens, sentences };
}

function cosine(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
        const ai = a[i] || 0;
        const bi = b[i] || 0;
        dot += ai * bi;
        na += ai * ai;
        nb += bi * bi;
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function getEmbedding(text: string): Promise<number[] | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
        });
        if (!res.ok) return null;
        const j = await res.json();
        return j.data && j.data[0] && j.data[0].embedding ? j.data[0].embedding as number[] : null;
    } catch (e) {
        return null;
    }
}

export class FileComparatorUtil {

    static async compareFiles(expectedPath: string, actualPath: string, options?: {
        threshold?: number,
        weights?: {
            content?: number,
            semantic?: number,
            structure?: number,
            missing?: number,
            extra?: number
        }
    }) {

        const threshold = options?.threshold ?? 80;

        const expectedRaw = await FileReaderUtil.readFile(expectedPath);
        const actualRaw = await FileReaderUtil.readFile(actualPath);

        const expected = tokenizeWithSentences(expectedRaw);
        const actual = tokenizeWithSentences(actualRaw);

        const expectedTokens = expected.tokens;
        const actualTokens = actual.tokens;

        const terms = Array.from(new Set([...expectedTokens, ...actualTokens]));

        const tf = (tokens: string[]) => {
            const map = new Map<string, number>();
            tokens.forEach(t => map.set(t, (map.get(t) || 0) + 1));
            return terms.map(term => map.get(term) || 0);
        };

        const tfExpected = tf(expectedTokens);
        const tfActual = tf(actualTokens);

        const df = terms.map(term => (expectedTokens.includes(term) ? 1 : 0) + (actualTokens.includes(term) ? 1 : 0));
        const idf = df.map(d => Math.log((2) / (1 + d) + 1e-9));

        const tfidfExpected = tfExpected.map((v, i) => v * idf[i]);
        const tfidfActual = tfActual.map((v, i) => v * idf[i]);

        const tfidfSim = cosine(tfidfExpected, tfidfActual);

        // Keyword overlap (top-k)
        const topK = (arr: string[], k = 30) => {
            const freq = new Map<string, number>();
            arr.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
            return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, k).map(x => x[0]);
        };

        const topExpected = topK(expectedTokens, 30);
        const topActual = topK(actualTokens, 30);
        const keywordOverlap = topExpected.filter(t => topActual.includes(t)).length / Math.max(1, topExpected.length);

        // semantic similarity (optional)
        let semanticSim = 0;
        try {
            const [eEmb, aEmb] = await Promise.all([getEmbedding(expectedRaw), getEmbedding(actualRaw)]);
            if (eEmb && aEmb) semanticSim = cosine(eEmb, aEmb);
        } catch (e) {
            semanticSim = 0;
        }

        // structural checks for docx
        let structScore = 1;
        try {
            const expHtmlRes = await mammoth.convertToHtml({ path: expectedPath });
            const actHtmlRes = await mammoth.convertToHtml({ path: actualPath });
            const expHtml = expHtmlRes.value || '';
            const actHtml = actHtmlRes.value || '';

            const count = (h: string, tag: string) => (h.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;

            const expHeadings = count(expHtml, 'h1') + count(expHtml, 'h2') + count(expHtml, 'h3');
            const actHeadings = count(actHtml, 'h1') + count(actHtml, 'h2') + count(actHtml, 'h3');

            const expTables = count(expHtml, 'table');
            const actTables = count(actHtml, 'table');

            const expImages = count(expHtml, 'img');
            const actImages = count(actHtml, 'img');

            const scoreFor = (e: number, a: number) => {
                if (e === 0 && a === 0) return 1;
                const diff = Math.abs(e - a);
                return Math.max(0, 1 - diff / Math.max(e, a, 1));
            };

            const headingScore = scoreFor(expHeadings, actHeadings);
            const tableScore = scoreFor(expTables, actTables);
            const imageScore = scoreFor(expImages, actImages);

            structScore = (headingScore + tableScore + imageScore) / 3;
        } catch (e) {
            structScore = 1;
        }

        const missingTokens = Array.from(new Set(expectedTokens.filter(t => !actualTokens.includes(t))));
        const extraTokens = Array.from(new Set(actualTokens.filter(t => !expectedTokens.includes(t))));

        const missingFrac = Math.min(1, missingTokens.length / Math.max(1, expectedTokens.length));
        const extraFrac = Math.min(1, extraTokens.length / Math.max(1, actualTokens.length));

        // weights (defaults) and merge with options
        const defaultWeights = { content: 0.5, semantic: 0.2, structure: 0.15, missing: 0.1, extra: 0.05 };
        const weights = Object.assign({}, defaultWeights, options?.weights || {});

        const contentMatch = tfidfSim;
        const semanticMatch = semanticSim;
        const structureMatch = structScore;

        let rawScore = weights.content * contentMatch + weights.semantic * semanticMatch + weights.structure * structureMatch;
        rawScore = rawScore - weights.missing * missingFrac - weights.extra * extraFrac;
        const finalScore = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);

        const report: any = {
            score: finalScore,
            components: {
                contentMatch: Math.round(contentMatch * 100),
                keywordOverlap: Math.round(keywordOverlap * 100),
                semanticMatch: Math.round(semanticMatch * 100),
                structureMatch: Math.round(structureMatch * 100),
                missingContentPercent: Math.round(missingFrac * 100),
                extraContentPercent: Math.round(extraFrac * 100),
                missingCount: missingTokens.length,
                extraCount: extraTokens.length,
                weightsUsed: weights
            },
            missing: missingTokens.slice(0, 200),
            extra: extraTokens.slice(0, 200),
            matched: expectedTokens.length - missingTokens.length,
            total: expectedTokens.length,
            status: finalScore >= threshold ? 'PASS' : 'FAIL'
        };

        try {
            await fs.promises.mkdir('./test-results', { recursive: true });
            const reportPath = `./test-results/verification-report-${Date.now()}.json`;
            await fs.promises.writeFile(reportPath, JSON.stringify({ expectedPath, actualPath, report }, null, 2), 'utf8');
            report.reportPath = reportPath;
        } catch (e) {
            // ignore
        }

        return report;
    }
}