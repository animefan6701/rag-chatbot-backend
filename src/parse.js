import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';


export async function extractText(filePath, mime, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    if (mime === 'application/pdf' || ext === '.pdf') {
        const buf = await fs.readFile(filePath);
        const data = await pdf(buf);
        return data.text || '';
    }
    if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
    ) {
        const buf = await fs.readFile(filePath);
        const { value } = await mammoth.extractRawText({ buffer: buf });
        return value || '';
    }
    // Fallback: treat as utf8 text
    return await fs.readFile(filePath, 'utf8');
}