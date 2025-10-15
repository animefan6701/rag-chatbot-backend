import 'dotenv/config';
import { sb } from './storage.js';

async function quickTest() {
  console.log('Quick test: Checking database and chat response...');
  
  try {
    // Check if we have any images
    const { data: assets, error } = await sb
      .from('document_assets')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log('Assets in database:', assets);
    
    if (assets && assets.length > 0) {
      console.log(`Found ${assets.length} assets`);
      console.log('First asset:', assets[0]);
      
      // Test if we can fetch images for a specific document
      const docId = assets[0].doc_id;
      console.log(`Testing fetch for document: ${docId}`);
      
      const { data: docImages, error: fetchError } = await sb
        .from('document_assets')
        .select('id, kind, image_index, page_index, url, content_type')
        .eq('doc_id', docId)
        .in('kind', ['docx_image', 'pdf_image']);
      
      if (fetchError) {
        console.error('Fetch error:', fetchError);
      } else {
        console.log(`Found ${docImages?.length || 0} images for document ${docId}`);
        console.log('Images:', docImages);
      }
    } else {
      console.log('No assets found in database');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

quickTest();
