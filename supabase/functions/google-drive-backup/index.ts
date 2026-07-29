import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to refresh token if expired
async function getValidAccessToken(supabase: any, tokenData: any) {
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);

  if (now < expiresAt) {
    return tokenData.access_token;
  }

  console.log('🔄 Token expired, refreshing...');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error}`);
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase
    .from('google_drive_tokens')
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', tokenData.user_id);

  return tokens.access_token;
}

// Create or get folder in Drive
async function getOrCreateFolder(accessToken: string, parentId: string, folderName: string) {
  const safeFolderName = folderName.replace(/'/g, "\\'");
  
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(safeFolderName)}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  const folder = await createResponse.json();
  return folder.id;
}

// Helper to sanitize text for PDF
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/👤/g, '')
    .replace(/💬/g, '')
    .replace(/[^\x00-\x7F\u00C0-\u00FF\u0100-\u017F]/g, '')
    .replace(/[\u2500-\u257F]/g, '-')
    .replace(/[═─]/g, '-');
}

// Generate WhatsApp-style PDF
async function generateConversationPDF(conversation: any, messages: any[], lead: any, tags: any[]) {
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
      return date || 'N/A';
    }
  };

  const formatTime = (date: string) => {
    try {
      return new Date(date).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo' 
      });
    } catch {
      return '';
    }
  };

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;
  
  const addNewPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  };
  
  // Colors
  const primaryColor = rgb(0.075, 0.533, 0.490); // WhatsApp green
  const lightGreen = rgb(0.863, 0.969, 0.816); // Light green for sent messages
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.95, 0.95, 0.95);
  
  // Draw rounded rectangle helper
  const drawRoundedRect = (x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>) => {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color,
      borderWidth: 0,
    });
  };
  
  // ===== HEADER =====
  drawRoundedRect(0, pageHeight - 80, pageWidth, 80, primaryColor);
  
  page.drawText('Next Pro', {
    x: margin,
    y: pageHeight - 35,
    size: 20,
    font: helveticaBold,
    color: white,
  });
  
  page.drawText('Backup de Atendimento', {
    x: margin,
    y: pageHeight - 55,
    size: 12,
    font: helvetica,
    color: rgb(0.9, 1, 0.95),
  });
  
  // Protocol badge on the right
  const protocolText = conversation.protocol_number || 'S/N';
  page.drawText(protocolText, {
    x: pageWidth - margin - 120,
    y: pageHeight - 45,
    size: 14,
    font: helveticaBold,
    color: white,
  });
  
  yPosition = pageHeight - 100;
  
  // ===== INFO CARDS =====
  const cardHeight = 70;
  const cardWidth = (contentWidth - 15) / 2;
  
  // Client card
  drawRoundedRect(margin, yPosition - cardHeight, cardWidth, cardHeight, lightGray);
  page.drawText('CLIENTE', {
    x: margin + 12,
    y: yPosition - 18,
    size: 9,
    font: helveticaBold,
    color: mediumGray,
  });
  
  const clientName = sanitizeText(lead?.name || conversation.user_name || 'N/A');
  page.drawText(clientName.substring(0, 25), {
    x: margin + 12,
    y: yPosition - 35,
    size: 12,
    font: helveticaBold,
    color: darkGray,
  });
  
  page.drawText(lead?.phone || conversation.user_phone || 'N/A', {
    x: margin + 12,
    y: yPosition - 52,
    size: 10,
    font: helvetica,
    color: mediumGray,
  });
  
  // Attendance card
  drawRoundedRect(margin + cardWidth + 15, yPosition - cardHeight, cardWidth, cardHeight, lightGray);
  page.drawText('ATENDIMENTO', {
    x: margin + cardWidth + 27,
    y: yPosition - 18,
    size: 9,
    font: helveticaBold,
    color: mediumGray,
  });
  
  const statusText = conversation.status === 'active' ? 'Em andamento' : 
                     conversation.status === 'closed' ? 'Finalizado' : conversation.status || 'N/A';
  page.drawText(statusText, {
    x: margin + cardWidth + 27,
    y: yPosition - 35,
    size: 12,
    font: helveticaBold,
    color: darkGray,
  });
  
  page.drawText(`Inicio: ${formatDate(conversation.created_at)}`, {
    x: margin + cardWidth + 27,
    y: yPosition - 52,
    size: 9,
    font: helvetica,
    color: mediumGray,
  });
  
  yPosition -= cardHeight + 20;
  
  // ===== TAGS =====
  if (tags.length > 0) {
    let tagX = margin;
    const tagY = yPosition;
    
    for (const tag of tags.slice(0, 5)) {
      const tagName = sanitizeText(tag.name || '');
      const tagWidth = helvetica.widthOfTextAtSize(tagName, 9) + 16;
      
      if (tagX + tagWidth > pageWidth - margin) break;
      
      page.drawRectangle({
        x: tagX,
        y: tagY - 16,
        width: tagWidth,
        height: 18,
        color: primaryColor,
        borderWidth: 0,
      });
      
      page.drawText(tagName, {
        x: tagX + 8,
        y: tagY - 12,
        size: 9,
        font: helvetica,
        color: white,
      });
      
      tagX += tagWidth + 8;
    }
    
    yPosition -= 30;
  }
  
  // ===== MESSAGE SECTION HEADER =====
  yPosition -= 10;
  page.drawText(`HISTORICO DE MENSAGENS (${messages.length})`, {
    x: margin,
    y: yPosition,
    size: 11,
    font: helveticaBold,
    color: darkGray,
  });
  
  yPosition -= 25;
  
  // ===== MESSAGES (WhatsApp Style) =====
  const bubbleMaxWidth = contentWidth * 0.75;
  const bubblePadding = 10;
  const lineHeight = 13;
  
  let lastDate = '';
  
  for (const msg of messages) {
    // Check if we need a new page
    if (yPosition < margin + 100) {
      addNewPage();
      // Draw page header
      drawRoundedRect(0, pageHeight - 40, pageWidth, 40, primaryColor);
      page.drawText(`Next Pro - ${conversation.protocol_number || 'Backup'}`, {
        x: margin,
        y: pageHeight - 27,
        size: 12,
        font: helveticaBold,
        color: white,
      });
      yPosition = pageHeight - 60;
    }
    
    // Date separator
    const msgDate = new Date(msg.criado_em).toLocaleDateString('pt-BR');
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      
      const dateWidth = helvetica.widthOfTextAtSize(msgDate, 10) + 20;
      const dateX = (pageWidth - dateWidth) / 2;
      
      page.drawRectangle({
        x: dateX,
        y: yPosition - 15,
        width: dateWidth,
        height: 20,
        color: rgb(0.9, 0.9, 0.9),
        borderWidth: 0,
      });
      
      page.drawText(msgDate, {
        x: dateX + 10,
        y: yPosition - 10,
        size: 10,
        font: helvetica,
        color: mediumGray,
      });
      
      yPosition -= 30;
    }
    
    const isReceived = msg.recebido;
    const content = sanitizeText(msg.conteudo || '[Sem conteudo]');
    const time = formatTime(msg.criado_em);
    const msgType = msg.tipo !== 'texto' ? `[${msg.tipo.toUpperCase()}] ` : '';
    const fullContent = msgType + content;
    
    // Calculate bubble size
    const words = fullContent.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = helvetica.widthOfTextAtSize(testLine, 10);
      
      if (testWidth > bubbleMaxWidth - (bubblePadding * 2)) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    const bubbleHeight = (lines.length * lineHeight) + bubblePadding + 18;
    const maxLineWidth = Math.max(...lines.map(l => helvetica.widthOfTextAtSize(l, 10)));
    const bubbleWidth = Math.min(maxLineWidth + (bubblePadding * 2) + 45, bubbleMaxWidth);
    
    // Position bubble
    const bubbleX = isReceived ? margin : pageWidth - margin - bubbleWidth;
    const bubbleY = yPosition - bubbleHeight;
    
    // Draw bubble
    const bubbleColor = isReceived ? white : lightGreen;
    page.drawRectangle({
      x: bubbleX,
      y: bubbleY,
      width: bubbleWidth,
      height: bubbleHeight,
      color: bubbleColor,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: isReceived ? 1 : 0,
    });
    
    // Draw sender label
    const senderLabel = isReceived ? 'Cliente' : 'Atendente';
    page.drawText(senderLabel, {
      x: bubbleX + bubblePadding,
      y: yPosition - bubblePadding - 3,
      size: 9,
      font: helveticaBold,
      color: isReceived ? rgb(0.3, 0.5, 0.7) : primaryColor,
    });
    
    // Draw message lines
    let textY = yPosition - bubblePadding - 18;
    for (const line of lines) {
      page.drawText(line, {
        x: bubbleX + bubblePadding,
        y: textY,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      textY -= lineHeight;
    }
    
    // Draw time
    page.drawText(time, {
      x: bubbleX + bubbleWidth - bubblePadding - 35,
      y: bubbleY + 5,
      size: 8,
      font: helvetica,
      color: mediumGray,
    });
    
    yPosition = bubbleY - 8;
  }
  
  // ===== FOOTER =====
  if (yPosition > margin + 60) {
    yPosition = margin + 40;
  } else {
    addNewPage();
    yPosition = pageHeight - 80;
  }
  
  // Closing notes if any
  if (conversation.closing_notes) {
    if (yPosition < margin + 100) {
      addNewPage();
      yPosition = pageHeight - 60;
    }
    
    drawRoundedRect(margin, yPosition - 60, contentWidth, 60, rgb(1, 0.97, 0.88));
    
    page.drawText('NOTAS DE ENCERRAMENTO', {
      x: margin + 12,
      y: yPosition - 18,
      size: 9,
      font: helveticaBold,
      color: rgb(0.7, 0.5, 0.1),
    });
    
    const notesText = sanitizeText(conversation.closing_notes).substring(0, 200);
    page.drawText(notesText, {
      x: margin + 12,
      y: yPosition - 38,
      size: 10,
      font: helvetica,
      color: darkGray,
    });
  }
  
  // Final footer
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  lastPage.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: 35,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  lastPage.drawText(`Backup gerado em ${formatDate(new Date().toISOString())} | Next Pro`, {
    x: margin,
    y: 12,
    size: 9,
    font: helvetica,
    color: mediumGray,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, month, conversationIds, testMode } = await req.json();
    
    console.log('📁 Starting backup for user:', userId, 'month:', month, 'testMode:', testMode);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's Drive tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Google Drive nao conectado');
    }

    const accessToken = await getValidAccessToken(supabase, tokenData);
    const backupMonth = month || new Date().toISOString().slice(0, 7);

    // TEST MODE: Generate a sample PDF to verify Drive connection
    if (testMode) {
      console.log('🧪 Running in TEST MODE - generating sample PDF');
      
      // Get company name for folder structure
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, companies (name)')
        .eq('id', userId)
        .single();
      
      const companyName = sanitizeText((profile?.companies as any)?.name || 'Next Pro');
      
      // Create folder structure
      const companyFolderId = await getOrCreateFolder(accessToken, tokenData.folder_id, companyName);
      const yearFolderId = await getOrCreateFolder(accessToken, companyFolderId, new Date().getFullYear().toString());
      const monthName = new Date().toLocaleString('pt-BR', { month: 'long' });
      const monthFolderId = await getOrCreateFolder(accessToken, yearFolderId, monthName.charAt(0).toUpperCase() + monthName.slice(1));

      // Create test conversation data
      const testConversation = {
        id: 'test-' + Date.now(),
        protocol_number: 'TESTE-' + Date.now().toString().slice(-6),
        status: 'closed',
        created_at: new Date().toISOString(),
        user_name: 'Cliente Teste',
        user_phone: '+55 11 99999-9999',
        closing_notes: 'Este e um backup de teste gerado para verificar a integracao com Google Drive.',
      };

      const testMessages = [
        {
          id: '1',
          criado_em: new Date(Date.now() - 3600000).toISOString(),
          conteudo: 'Ola! Este e um teste do sistema de backup.',
          tipo: 'texto',
          recebido: true,
          remetente: 'cliente',
        },
        {
          id: '2',
          criado_em: new Date(Date.now() - 3500000).toISOString(),
          conteudo: 'Ola! Obrigado por entrar em contato. Como posso ajudar?',
          tipo: 'texto',
          recebido: false,
          remetente: 'atendente',
        },
        {
          id: '3',
          criado_em: new Date(Date.now() - 3400000).toISOString(),
          conteudo: 'Gostaria de testar o backup das conversas no Google Drive.',
          tipo: 'texto',
          recebido: true,
          remetente: 'cliente',
        },
        {
          id: '4',
          criado_em: new Date(Date.now() - 3300000).toISOString(),
          conteudo: 'Claro! O backup foi configurado com sucesso. Suas conversas serao salvas automaticamente.',
          tipo: 'texto',
          recebido: false,
          remetente: 'atendente',
        },
        {
          id: '5',
          criado_em: new Date().toISOString(),
          conteudo: 'Perfeito! Obrigado pelo suporte.',
          tipo: 'texto',
          recebido: true,
          remetente: 'cliente',
        },
      ];

      const testLead = {
        name: 'Cliente Teste',
        phone: '+55 11 99999-9999',
        email: 'teste@exemplo.com',
      };

      const testTags = [
        { name: 'Teste', color: '#22c55e' },
        { name: 'Backup', color: '#3b82f6' },
      ];

      // Generate PDF
      const pdfBytes = await generateConversationPDF(
        testConversation,
        testMessages,
        testLead,
        testTags
      );

      const fileName = `${testConversation.protocol_number}.pdf`;

      const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [monthFolderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }));

      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData,
        }
      );

      const uploadedFile = await uploadResponse.json();

      if (!uploadedFile.id) {
        console.error('❌ Test upload failed:', uploadedFile);
        throw new Error('Failed to upload test file to Drive');
      }

      console.log('✅ Test backup uploaded:', fileName, uploadedFile.webViewLink);

      return new Response(
        JSON.stringify({
          success: true,
          testMode: true,
          backedUp: 1,
          failed: 0,
          results: [{
            fileName,
            driveUrl: uploadedFile.webViewLink,
            success: true,
          }],
          message: 'Backup de teste gerado com sucesso! Verifique seu Google Drive.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NORMAL MODE: Backup real conversations
    // Get conversations for the month
    let query = supabase
      .from('conversations')
      .select(`
        *,
        leads (id, name, phone, email, notes),
        profiles!conversations_assigned_agent_fkey (full_name)
      `)
      .eq('user_id', userId);

    if (conversationIds && conversationIds.length > 0) {
      query = query.in('id', conversationIds);
    } else if (month) {
      const startDate = new Date(`${month}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }

    const { data: conversations, error: convError } = await query;

    if (convError) throw convError;

    console.log(`📝 Found ${conversations?.length || 0} conversations to backup`);

    const results: { conversationId: string; success: boolean; fileName?: string; error?: string }[] = [];

    for (const conv of conversations || []) {
      try {
        // Check if already backed up
        const { data: existingBackup } = await supabase
          .from('conversation_backups')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('backup_month', backupMonth)
          .single();

        if (existingBackup) {
          console.log('⏭️ Already backed up:', conv.id);
          continue;
        }

        // Get messages for conversation
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('id_da_conversa', conv.id)
          .order('criado_em', { ascending: true });

        // Get tags
        const { data: convTags } = await supabase
          .from('conversation_tags')
          .select('tags (id, name, color)')
          .eq('conversation_id', conv.id);

        const tags = convTags?.map((ct: any) => ct.tags) || [];

        // Get company name for folder structure
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, companies (name)')
          .eq('id', userId)
          .single();
        
        const companyName = sanitizeText((profile?.companies as any)?.name || 'Next Pro');
        
        // Create folder structure: Company > Year > Month > Protocol.pdf
        const companyFolderId = await getOrCreateFolder(accessToken, tokenData.folder_id, companyName);
        
        const convDate = new Date(conv.created_at);
        const yearName = convDate.getFullYear().toString();
        const yearFolderId = await getOrCreateFolder(accessToken, companyFolderId, yearName);
        
        const monthName = convDate.toLocaleString('pt-BR', { month: 'long' });
        const monthFolderId = await getOrCreateFolder(accessToken, yearFolderId, monthName.charAt(0).toUpperCase() + monthName.slice(1));

        // Generate PDF content
        const pdfBytes = await generateConversationPDF(
          { ...conv, assigned_agent_name: conv.profiles?.full_name },
          messages || [],
          conv.leads,
          tags
        );

        // Upload to Drive as PDF - use protocol number for filename
        const protocolNumber = conv.protocol_number || `SEM-PROTOCOLO-${conv.id.slice(0, 8)}`;
        const fileName = `${protocolNumber}.pdf`;

        const metadata = {
          name: fileName,
          mimeType: 'application/pdf',
          parents: [monthFolderId],
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }));

        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData,
          }
        );

        const uploadedFile = await uploadResponse.json();

        if (!uploadedFile.id) {
          console.error('❌ Upload failed:', uploadedFile);
          throw new Error('Failed to upload file to Drive');
        }

        // Save backup record
        await supabase.from('conversation_backups').insert({
          user_id: userId,
          conversation_id: conv.id,
          lead_id: conv.lead_id,
          protocol_number: conv.protocol_number,
          backup_month: backupMonth,
          drive_file_id: uploadedFile.id,
          drive_file_url: uploadedFile.webViewLink,
          file_name: fileName,
        });

        results.push({ conversationId: conv.id, success: true, fileName });
        console.log('✅ Backed up:', fileName);

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error backing up conversation:', conv.id, error);
        results.push({ conversationId: conv.id, success: false, error: errMsg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true, 
        backedUp: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Backup error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});