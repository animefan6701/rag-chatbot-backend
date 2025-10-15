// Simple paragraph-aware chunker with overlap.
export function chunkText(text, chunkSize = 1000, overlap = 200) {
    const paras = text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);
    const merged = paras.join('\n\n');
    const chunks = [];
    let i = 0;
    while (i < merged.length) {
        const end = Math.min(i + chunkSize, merged.length);
        const slice = merged.slice(i, end);
        chunks.push(slice);
        if (end === merged.length) break;
        i = end - overlap; // overlap
    }
    return chunks;
}