import 'dotenv/config';
import { sb } from './storage.js';

async function testImageFlow() {
  console.log('Testing complete image flow...');
  
  try {
    // 1. Check if we have any documents with images
    console.log('\n1. Checking for documents with images...');
    const { data: assets, error: assetsError } = await sb
      .from('document_assets')
      .select('id, doc_id, kind, image_index, page_index, url, content_type')
      .in('kind', ['docx_image', 'pdf_image'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (assetsError) {
      console.error('❌ Error fetching assets:', assetsError);
      return;
    }
    
    if (!assets || assets.length === 0) {
      console.log('❌ No images found in database');
      console.log('Please upload a DOCX file with images first');
      return;
    }
    
    console.log(`✅ Found ${assets.length} images in database`);
    
    // Group by document
    const docsWithImages = {};
    assets.forEach(asset => {
      if (!docsWithImages[asset.doc_id]) {
        docsWithImages[asset.doc_id] = [];
      }
      docsWithImages[asset.doc_id].push(asset);
    });
    
    console.log(`\n2. Documents with images:`);
    Object.entries(docsWithImages).forEach(([docId, images]) => {
      console.log(`  - Document ${docId}: ${images.length} images`);
      images.forEach(img => {
        console.log(`    * ${img.kind}: ${img.url}`);
      });
    });
    
    // 3. Test image URLs
    console.log('\n3. Testing image URLs...');
    for (const asset of assets.slice(0, 3)) { // Test first 3 images
      try {
        console.log(`Testing image: ${asset.url}`);
        const response = await fetch(asset.url);
        if (response.ok) {
          console.log(`  ✅ Image accessible (${response.status})`);
        } else {
          console.log(`  ❌ Image not accessible (${response.status})`);
        }
      } catch (error) {
        console.log(`  ❌ Error accessing image: ${error.message}`);
      }
    }
    
    // 4. Simulate chat response
    console.log('\n4. Simulating chat response...');
    const sampleResponse = {
      ok: true,
      answer: 'This is a sample response about your document.',
      sources: [],
      images: assets.slice(0, 3) // First 3 images
    };
    
    console.log('Response structure:', {
      answer: sampleResponse.answer,
      imagesCount: sampleResponse.images.length,
      imageDetails: sampleResponse.images.map(img => ({
        id: img.id,
        kind: img.kind,
        url: img.url
      }))
    });
    
    console.log('\n✅ Image flow test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Upload a DOCX file with images');
    console.log('2. Ask a question about the document');
    console.log('3. Check browser console for image rendering logs');
    console.log('4. Images should appear below the chatbot response');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testImageFlow();
