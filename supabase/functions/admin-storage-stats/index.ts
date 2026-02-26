import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📊 Fetching storage stats for all companies...');

    // List all buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      throw bucketsError;
    }

    console.log(`Found ${buckets?.length || 0} buckets`);

    // Get all profiles to map user_id -> company_id
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id');

    const userCompanyMap = new Map<string, string>();
    (profiles || []).forEach(p => {
      if (p.company_id) userCompanyMap.set(p.id, p.company_id);
    });

    // Storage stats per company
    const companyStorage = new Map<string, { totalSize: number; fileCount: number; bucketBreakdown: Record<string, { size: number; count: number }> }>();

    // Global bucket stats
    const globalBuckets: { name: string; totalSize: number; fileCount: number; isPublic: boolean }[] = [];

    for (const bucket of (buckets || [])) {
      let bucketTotalSize = 0;
      let bucketFileCount = 0;

      try {
        // List root folders in bucket
        const { data: rootItems, error: listError } = await supabaseAdmin.storage
          .from(bucket.name)
          .list('', { limit: 1000 });

        if (listError) {
          console.error(`Error listing bucket ${bucket.name}:`, listError);
          globalBuckets.push({ name: bucket.name, totalSize: 0, fileCount: 0, isPublic: bucket.public || false });
          continue;
        }

        // Process files at root level
        for (const item of (rootItems || [])) {
          if (item.metadata?.size) {
            const size = Number(item.metadata.size) || 0;
            bucketTotalSize += size;
            bucketFileCount++;

            // Try to find company for this file via user folders
            // Files might be in user_id/ folders
            // At root level, we can't map to company
          }

          // If it's a folder (no metadata), list its contents
          if (!item.metadata) {
            try {
              const { data: subItems } = await supabaseAdmin.storage
                .from(bucket.name)
                .list(item.name, { limit: 1000 });

              for (const subItem of (subItems || [])) {
                if (subItem.metadata?.size) {
                  const size = Number(subItem.metadata.size) || 0;
                  bucketTotalSize += size;
                  bucketFileCount++;

                  // item.name might be a user_id
                  const companyId = userCompanyMap.get(item.name);
                  if (companyId) {
                    if (!companyStorage.has(companyId)) {
                      companyStorage.set(companyId, { totalSize: 0, fileCount: 0, bucketBreakdown: {} });
                    }
                    const cs = companyStorage.get(companyId)!;
                    cs.totalSize += size;
                    cs.fileCount++;
                    if (!cs.bucketBreakdown[bucket.name]) {
                      cs.bucketBreakdown[bucket.name] = { size: 0, count: 0 };
                    }
                    cs.bucketBreakdown[bucket.name].size += size;
                    cs.bucketBreakdown[bucket.name].count++;
                  }

                  // Also check sub-subfolders (e.g., user_id/subfolder/file)
                  if (!subItem.metadata) {
                    try {
                      const { data: deepItems } = await supabaseAdmin.storage
                        .from(bucket.name)
                        .list(`${item.name}/${subItem.name}`, { limit: 1000 });

                      for (const deepItem of (deepItems || [])) {
                        if (deepItem.metadata?.size) {
                          const deepSize = Number(deepItem.metadata.size) || 0;
                          bucketTotalSize += deepSize;
                          bucketFileCount++;

                          const deepCompanyId = userCompanyMap.get(item.name);
                          if (deepCompanyId) {
                            const dcs = companyStorage.get(deepCompanyId)!;
                            dcs.totalSize += deepSize;
                            dcs.fileCount++;
                            dcs.bucketBreakdown[bucket.name].size += deepSize;
                            dcs.bucketBreakdown[bucket.name].count++;
                          }
                        }
                      }
                    } catch (e) {
                      // Ignore deep listing errors
                    }
                  }
                }
              }
            } catch (e) {
              console.error(`Error listing subfolder ${item.name} in ${bucket.name}:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`Error processing bucket ${bucket.name}:`, e);
      }

      globalBuckets.push({
        name: bucket.name,
        totalSize: bucketTotalSize,
        fileCount: bucketFileCount,
        isPublic: bucket.public || false,
      });
    }

    // Also try to map storage by company_id folders (some buckets use company_id directly)
    // Get all companies
    const { data: companies } = await supabaseAdmin.from('companies').select('id');
    
    for (const bucket of (buckets || [])) {
      for (const company of (companies || [])) {
        try {
          const { data: compFiles } = await supabaseAdmin.storage
            .from(bucket.name)
            .list(company.id, { limit: 1000 });
          
          if (compFiles && compFiles.length > 0) {
            for (const file of compFiles) {
              if (file.metadata?.size) {
                const size = Number(file.metadata.size) || 0;
                if (!companyStorage.has(company.id)) {
                  companyStorage.set(company.id, { totalSize: 0, fileCount: 0, bucketBreakdown: {} });
                }
                const cs = companyStorage.get(company.id)!;
                cs.totalSize += size;
                cs.fileCount++;
                if (!cs.bucketBreakdown[bucket.name]) {
                  cs.bucketBreakdown[bucket.name] = { size: 0, count: 0 };
                }
                cs.bucketBreakdown[bucket.name].size += size;
                cs.bucketBreakdown[bucket.name].count++;
              }
            }
          }
        } catch (e) {
          // Company folder doesn't exist in this bucket, skip
        }
      }
    }

    // Convert to response
    const perCompany: Record<string, { totalSize: number; fileCount: number; bucketBreakdown: Record<string, { size: number; count: number }> }> = {};
    companyStorage.forEach((v, k) => { perCompany[k] = v; });

    const totalStorage = globalBuckets.reduce((acc, b) => acc + b.totalSize, 0);
    const totalFiles = globalBuckets.reduce((acc, b) => acc + b.fileCount, 0);

    console.log(`✅ Storage stats: ${totalFiles} files, ${(totalStorage / 1024 / 1024).toFixed(2)} MB total`);

    return new Response(JSON.stringify({
      globalBuckets,
      totalStorage,
      totalFiles,
      perCompany,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
