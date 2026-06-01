declare module 'pdf-parse' {
    interface PDFParseResult {
        numpages?: number;
        numrender?: number;
        info?: any;
        metadata?: any;
        version?: string;
        text?: string;
    }

    function pdfParse(buffer: Buffer | Uint8Array | ArrayBuffer | string): Promise<PDFParseResult>;

    export = pdfParse;
}
