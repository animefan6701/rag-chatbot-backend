import 'dotenv/config';
import { sb, uploadBuffer } from './storage.js';

async function testAssets() {
  console.log('Testing Supabase assets setup...');
  
  try {
    // Test 1: Check if assets bucket exists
    console.log('1. Checking assets bucket...');
    const { data: buckets } = await sb.storage.listBuckets();
    const assetsBucket = buckets.find(b => b.name === 'assets');
    if (assetsBucket) {
      console.log('✅ Assets bucket exists');
    } else {
      console.log('❌ Assets bucket does not exist. Creating...');
      const { error } = await sb.storage.createBucket('assets', {
        public: true
      });
      if (error) {
        console.error('Failed to create assets bucket:', error);
      } else {
        console.log('✅ Assets bucket created');
      }
    }
    
    // Test 2: Check document_assets table
    console.log('2. Checking document_assets table...');
    const { data: tableInfo, error: tableError } = await sb
      .from('document_assets')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error accessing document_assets table:', tableError);
    } else {
      console.log('✅ document_assets table accessible');
    }
    
    // Test 3: Try to insert a test record
    console.log('3. Testing insert into document_assets...');
    const testDocId = '00000000-0000-0000-0000-000000000000';
    const { error: insertError } = await sb
      .from('document_assets')
      .insert({
        doc_id: testDocId,
        kind: 'test',
        image_index: 0,
        url: 'https://example.com/test.jpg',
        content_type: 'image/jpeg'
      });
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError);
    } else {
      console.log('✅ Test insert successful');
      
      // Clean up test record
      await sb
        .from('document_assets')
        .delete()
        .eq('doc_id', testDocId);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAssets();
