import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testDocumentsAPI() {
  console.log('=== TESTING DOCUMENTS API ===');
  
  try {
    // Test 1: Get all documents
    console.log('\n1. Testing GET /documents...');
    const listResponse = await fetch(`${API_URL}/documents`);
    
    if (!listResponse.ok) {
      console.error('❌ Failed to fetch documents:', listResponse.status, listResponse.statusText);
      const errorText = await listResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const listData = await listResponse.json();
    console.log('✅ Documents list response:', {
      ok: listData.ok,
      total: listData.total,
      documentsCount: listData.documents?.length || 0
    });
    
    if (listData.documents && listData.documents.length > 0) {
      console.log('\nDocument details:');
      listData.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.filename}`);
        console.log(`     ID: ${doc.doc_id}`);
        console.log(`     Chunks: ${doc.chunk_count}`);
        console.log(`     Images: ${doc.image_count || 0}`);
        console.log(`     Upload Date: ${doc.upload_date}`);
        console.log(`     URL: ${doc.file_url ? 'Yes' : 'No'}`);
      });
      
      // Test 2: Get specific document details
      const firstDoc = listData.documents[0];
      console.log(`\n2. Testing GET /documents/${firstDoc.doc_id}...`);
      
      const detailResponse = await fetch(`${API_URL}/documents/${firstDoc.doc_id}`);
      
      if (!detailResponse.ok) {
        console.error('❌ Failed to fetch document details:', detailResponse.status, detailResponse.statusText);
        const errorText = await detailResponse.text();
        console.error('Error details:', errorText);
      } else {
        const detailData = await detailResponse.json();
        console.log('✅ Document details response:', {
          ok: detailData.ok,
          docId: detailData.document?.doc_id,
          filename: detailData.document?.filename,
          chunkCount: detailData.document?.chunk_count,
          imageCount: detailData.document?.image_count,
          assetsCount: detailData.document?.assets?.length || 0
        });
        
        if (detailData.document?.chunks && detailData.document.chunks.length > 0) {
          console.log('First chunk preview:', detailData.document.chunks[0].content.substring(0, 100) + '...');
        }
      }
      
      // Test 3: Delete document (optional - uncomment to test)
      /*
      console.log(`\n3. Testing DELETE /documents/${firstDoc.doc_id}...`);
      console.log('⚠️ WARNING: This will delete the document! Uncomment this section to test deletion.');
      
      const deleteResponse = await fetch(`${API_URL}/documents/${firstDoc.doc_id}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        console.error('❌ Failed to delete document:', deleteResponse.status, deleteResponse.statusText);
        const errorText = await deleteResponse.text();
        console.error('Error details:', errorText);
      } else {
        const deleteData = await deleteResponse.json();
        console.log('✅ Document deleted:', deleteData);
      }
      */
      
    } else {
      console.log('ℹ️ No documents found. Upload some documents first to test the API.');
    }
    
    console.log('\n✅ Documents API test completed!');
    console.log('\nAvailable endpoints:');
    console.log('- GET /documents - List all documents');
    console.log('- GET /documents/:id - Get document details');
    console.log('- DELETE /documents/:id - Delete document');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testDocumentsAPI();
