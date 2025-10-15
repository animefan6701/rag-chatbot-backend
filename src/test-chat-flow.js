import 'dotenv/config';
import { sb } from './storage.js';
import { embedBatch } from './embeddings.js';

async function testChatFlow() {
  console.log('=== TESTING COMPLETE CHAT FLOW ===');
  
  try {
    // 1. Check if we have any documents with images
    console.log('\n1. Checking for documents with images...');
    const { data: assets, error: assetsError } = await sb
      .from('document_assets')
      .select('*')
      .limit(5);
    
    if (assetsError) {
      console.error('❌ Error fetching assets:', assetsError);
      return;
    }
    
    if (!assets || assets.length === 0) {
      console.log('❌ No assets found in database');
      console.log('Please upload a DOCX file with images first');
      return;
    }
    
    console.log(`✅ Found ${assets.length} assets in database`);
    
    // 2. Get the first document ID that has images
    const docId = assets[0].doc_id;
    console.log(`\n2. Testing with document ID: ${docId}`);
    
    // 3. Simulate the exact chat endpoint logic
    console.log('\n3. Simulating chat endpoint logic...');
    
    // Simulate prompt and embedding
    const prompt = "Tell me about this document";
    console.log(`Prompt: "${prompt}"`);
    
    const [embedding] = await embedBatch([prompt]);
    console.log(`✅ Embedding generated, length: ${embedding.length}`);
    
    // 4. Simulate the exact image fetch query from chat endpoint
    console.log('\n4. Simulating image fetch query...');
    const { data: docImages, error: fetchError } = await sb
      .from('document_assets')
      .select('id, kind, image_index, page_index, url, content_type')
      .eq('doc_id', docId)
      .in('kind', ['docx_image', 'pdf_image'])
      .order('page_index', { ascending: true })
      .order('image_index', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching document images:', fetchError);
      console.error('Error details:', fetchError.message);
      return;
    }
    
    console.log(`✅ Found ${docImages?.length || 0} images for document ${docId}`);
    
    if (docImages && docImages.length > 0) {
      console.log('\nImage details:');
      docImages.forEach((img, index) => {
        console.log(`  ${index + 1}. ID: ${img.id}, Kind: ${img.kind}, URL: ${img.url}`);
        console.log(`     Content-Type: ${img.content_type}`);
        if (img.page_index !== null) console.log(`     Page: ${img.page_index}`);
        if (img.image_index !== null) console.log(`     Image Index: ${img.image_index}`);
      });
      
      // 5. Test image URL accessibility
      console.log('\n5. Testing image URL accessibility...');
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
      
      // 6. Simulate the final response structure
      console.log('\n6. Simulating final response structure...');
      const response = {
        ok: true,
        answer: 'This is a simulated response about your document.',
        sources: [],
        images: docImages
      };
      
      console.log('Response structure:', {
        ok: response.ok,
        answerLength: response.answer?.length || 0,
        sourcesCount: response.sources?.length || 0,
        imagesCount: response.images?.length || 0
      });
      
      console.log('\n✅ Chat flow test completed successfully!');
      console.log('\nIf you see images above, the backend is working correctly.');
      console.log('If images still don\'t appear in the frontend, check:');
      console.log('1. Browser console for JavaScript errors');
      console.log('2. Network tab for failed image requests');
      console.log('3. Frontend state management');
      
    } else {
      console.log('❌ No images found for this document');
      console.log('This suggests the issue is in the upload/extraction process');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testChatFlow();
