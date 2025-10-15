import { Router } from 'express';
import { db } from '../db.js';
import { sb } from '../storage.js';

const router = Router();

// GET /documents - List all uploaded documents
router.get('/', async (req, res) => {
  try {
    console.log('=== GET DOCUMENTS REQUEST ===');
    
    // Get all documents from the database
    const d = db();
    
    // For Supabase, we need to query the documents table
    if (process.env.DB_PROVIDER === 'supabase') {
      const { data: documents, error } = await sb
        .from('documents')
        .select('doc_id, metadata, id')
        .order('id', { ascending: false });
      
      if (error) {
        console.error('Error fetching documents:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
      
      // Group by doc_id and get unique documents
      const uniqueDocs = {};
      documents.forEach(doc => {
        if (!uniqueDocs[doc.doc_id]) {
          uniqueDocs[doc.doc_id] = {
            doc_id: doc.doc_id,
            filename: doc.metadata?.filename || 'Unknown',
            file_url: doc.metadata?.file_url || null,
            upload_date: new Date().toISOString(), // Use current time as fallback
            chunk_count: 0
          };
        }
        uniqueDocs[doc.doc_id].chunk_count++;
      });
      
      const documentList = Object.values(uniqueDocs);
      console.log(`Found ${documentList.length} unique documents`);
      
      // Get image counts for each document
      for (const doc of documentList) {
        const { data: assets, error: assetsError } = await sb
          .from('document_assets')
          .select('id')
          .eq('doc_id', doc.doc_id);
        
        if (!assetsError) {
          doc.image_count = assets?.length || 0;
        }
      }
      
      res.json({
        ok: true,
        documents: documentList,
        total: documentList.length
      });
      
    } else {
      // For Postgres provider
      const pool = d._pool || (await d.initPostgres()).pool;
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT doc_id, metadata, COUNT(*) as chunk_count, MIN(id) as first_id
          FROM documents 
          GROUP BY doc_id, metadata
          ORDER BY first_id DESC
        `;
        
        const { rows } = await client.query(query);
        
        const documentList = rows.map(row => ({
          doc_id: row.doc_id,
          filename: row.metadata?.filename || 'Unknown',
          file_url: row.metadata?.file_url || null,
          upload_date: new Date().toISOString(), // Use current time as fallback
          chunk_count: parseInt(row.chunk_count)
        }));
        
        console.log(`Found ${documentList.length} documents`);
        
        res.json({
          ok: true,
          documents: documentList,
          total: documentList.length
        });
        
      } finally {
        client.release();
      }
    }
    
  } catch (error) {
    console.error('Error in GET /documents:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /documents/:id - Delete a specific document
router.delete('/:id', async (req, res) => {
  try {
    const { id: docId } = req.params;
    console.log(`=== DELETE DOCUMENT REQUEST ===`);
    console.log(`Document ID: ${docId}`);
    
    if (!docId) {
      return res.status(400).json({ ok: false, error: 'Document ID is required' });
    }
    
    // 1. Get document info before deletion
    let documentInfo = null;
    if (process.env.DB_PROVIDER === 'supabase') {
      const { data: docs, error: fetchError } = await sb
        .from('documents')
        .select('metadata')
        .eq('doc_id', docId)
        .limit(1);
      
      if (!fetchError && docs && docs.length > 0) {
        documentInfo = docs[0];
      }
    }
    
    // 2. Delete from documents table
    console.log('Deleting document chunks...');
    if (process.env.DB_PROVIDER === 'supabase') {
      const { error: deleteError } = await sb
        .from('documents')
        .delete()
        .eq('doc_id', docId);
      
      if (deleteError) {
        console.error('Error deleting document chunks:', deleteError);
        return res.status(500).json({ ok: false, error: deleteError.message });
      }
    } else {
      const d = db();
      const pool = d._pool || (await d.initPostgres()).pool;
      const client = await pool.connect();
      
      try {
        await client.query('DELETE FROM documents WHERE doc_id = $1', [docId]);
      } finally {
        client.release();
      }
    }
    
    // 3. Delete associated images/assets
    console.log('Deleting document assets...');
    const { data: assets, error: assetsError } = await sb
      .from('document_assets')
      .select('url')
      .eq('doc_id', docId);
    
    if (!assetsError && assets && assets.length > 0) {
      // Delete files from storage
      for (const asset of assets) {
        try {
          const fileName = asset.url.split('/').pop();
          const { error: storageError } = await sb.storage
            .from('assets')
            .remove([fileName]);
          
          if (storageError) {
            console.error(`Error deleting asset ${fileName}:`, storageError);
          } else {
            console.log(`Deleted asset: ${fileName}`);
          }
        } catch (error) {
          console.error('Error processing asset deletion:', error);
        }
      }
      
      // Delete asset records from database
      const { error: deleteAssetsError } = await sb
        .from('document_assets')
        .delete()
        .eq('doc_id', docId);
      
      if (deleteAssetsError) {
        console.error('Error deleting asset records:', deleteAssetsError);
      } else {
        console.log(`Deleted ${assets.length} asset records`);
      }
    }
    
    // 4. Delete original file from storage (if exists)
    if (documentInfo?.metadata?.file_url) {
      try {
        const filePath = documentInfo.metadata.file_url.split('/storage/v1/object/public/')[1];
        if (filePath) {
          const { error: originalFileError } = await sb.storage
            .from('documents')
            .remove([filePath]);
          
          if (originalFileError) {
            console.error('Error deleting original file:', originalFileError);
          } else {
            console.log('Deleted original file from storage');
          }
        }
      } catch (error) {
        console.error('Error processing original file deletion:', error);
      }
    }
    
    console.log(`✅ Successfully deleted document ${docId}`);
    
    res.json({
      ok: true,
      message: `Document ${docId} deleted successfully`,
      deleted_doc_id: docId
    });
    
  } catch (error) {
    console.error('Error in DELETE /documents:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /documents/:id - Get specific document details
router.get('/:id', async (req, res) => {
  try {
    const { id: docId } = req.params;
    console.log(`=== GET DOCUMENT DETAILS ===`);
    console.log(`Document ID: ${docId}`);
    
    if (!docId) {
      return res.status(400).json({ ok: false, error: 'Document ID is required' });
    }
    
    // Get document chunks
    let chunks = [];
    if (process.env.DB_PROVIDER === 'supabase') {
      const { data: docs, error } = await sb
        .from('documents')
        .select('*')
        .eq('doc_id', docId)
        .order('chunk_index', { ascending: true });
      
      if (error) {
        console.error('Error fetching document chunks:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
      
      chunks = docs || [];
    } else {
      const d = db();
      const pool = d._pool || (await d.initPostgres()).pool;
      const client = await pool.connect();
      
      try {
        const { rows } = await client.query(
          'SELECT * FROM documents WHERE doc_id = $1 ORDER BY chunk_index ASC',
          [docId]
        );
        chunks = rows;
      } finally {
        client.release();
      }
    }
    
    if (chunks.length === 0) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }
    
    // Get document assets/images
    const { data: assets, error: assetsError } = await sb
      .from('document_assets')
      .select('*')
      .eq('doc_id', docId)
      .order('page_index', { ascending: true })
      .order('image_index', { ascending: true });
    
    const documentInfo = {
      doc_id: docId,
      filename: chunks[0]?.metadata?.filename || 'Unknown',
      file_url: chunks[0]?.metadata?.file_url || null,
      upload_date: new Date().toISOString(), // Use current time as fallback
      chunk_count: chunks.length,
      image_count: assets?.length || 0,
      chunks: chunks.map(chunk => ({
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        metadata: chunk.metadata
      })),
      assets: assets || []
    };
    
    console.log(`Document details: ${chunks.length} chunks, ${assets?.length || 0} assets`);
    
    res.json({
      ok: true,
      document: documentInfo
    });
    
  } catch (error) {
    console.error('Error in GET /documents/:id:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
