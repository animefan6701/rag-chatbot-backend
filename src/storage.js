import { createClient } from '@supabase/supabase-js';


export const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);


export async function uploadBuffer(bucket, path, buffer, contentType) {
    console.log(`=== STORAGE UPLOAD ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Bucket: ${bucket}`);
    console.log(`Path: ${path}`);
    console.log(`Buffer size: ${buffer.length} bytes`);
    console.log(`Content type: ${contentType}`);

    // Check if Supabase client is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error(`❌ Supabase environment variables not set`);
        console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
        console.error(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);
        throw new Error('Supabase configuration missing');
    }

    try {
        const { data, error } = await sb.storage.from(bucket).upload(path, buffer, {
            upsert: true,
            contentType
        });

        if (error) {
            console.error(`❌ Storage upload failed:`, error);
            console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
            throw error;
        }

        console.log(`✅ Storage upload successful:`, data);

        // Public URL; if your bucket is private, generate a signed URL instead
        const publicUrl = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        console.log(`📎 Public URL: ${publicUrl}`);

        return publicUrl;
    } catch (uploadError) {
        console.error(`❌ Storage upload exception:`, uploadError);
        console.error(`❌ Upload error message:`, uploadError.message);
        console.error(`❌ Upload error stack:`, uploadError.stack);
        throw uploadError;
    }
}