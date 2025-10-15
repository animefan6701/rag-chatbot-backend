import 'dotenv/config';
import { sb } from './storage.js';

async function debugChat() {
  console.log('Debugging chat endpoint...');
  
  try {
    // First, check if we have any documents with images
    const { data: assets, error: assetsError } = await sb
      .from('document_assets')
      .select('*')
      .limit(5);
    
    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      return;
    }
    
    console.log('All assets in database:', assets);
    
    if (!assets || assets.length === 0) {
      console.log('No assets found. Please upload a DOCX file with images first.');
      return;
    }
    
    // Get the first document ID that has images
    const docId = assets[0].doc_id;
    console.log(`\nTesting chat for document: ${docId}`);
    
    // Simulate what the chat endpoint does
    const { data: docImages, error: fetchError } = await sb
      .from('document_assets')
      .select('id, kind, image_index, page_index, url, content_type')
      .eq('doc_id', docId)
      .in('kind', ['docx_image', 'pdf_image'])
      .order('page_index', { ascending: true })
      .order('image_index', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching document images:', fetchError);
      return;
    }
    
    console.log(`\nImages found for document ${docId}:`, docImages);
    console.log(`Image count: ${docImages?.length || 0}`);
    
    if (docImages && docImages.length > 0) {
      console.log('\nImage details:');
      docImages.forEach((img, index) => {
        console.log(`  ${index + 1}. ID: ${img.id}, Kind: ${img.kind}, URL: ${img.url}`);
        console.log(`     Content-Type: ${img.content_type}`);
        if (img.page_index !== null) console.log(`     Page: ${img.page_index}`);
        if (img.image_index !== null) console.log(`     Image Index: ${img.image_index}`);
      });
      
      // Test if the URLs are accessible
      console.log('\nTesting image URL accessibility...');
      for (const img of docImages.slice(0, 2)) {
        try {
          console.log(`Testing: ${img.url}`);
          const response = await fetch(img.url);
          console.log(`  Status: ${response.status} ${response.statusText}`);
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log(`  Content-Type: ${contentType}`);
            console.log(`  ✅ Image accessible`);
          } else {
            console.log(`  ❌ Image not accessible`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
    } else {
      console.log('No images found for this document');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugChat();
