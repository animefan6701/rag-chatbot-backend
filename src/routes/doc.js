import { Router } from 'express';
import { sb } from '../storage.js';


const router = Router();


router.get('/:doc_id/assets', async (req, res) => {
    const { doc_id } = req.params;
    const { data, error } = await sb
        .from('document_assets')
        .select('id, kind, page_index, image_index, url, content_type')
        .eq('doc_id', doc_id)
        .order('image_index', { ascending: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, assets: data });
});


export default router;