import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // ── Helpers ──

  const resolveNextNodeId = (currentNodeId: string, edges: any[], handleId?: string): string | null => {
    if (handleId) {
      const edge = (edges || []).find((e: any) => e?.source === currentNodeId && e?.sourceHandle === handleId);
      if (edge) return edge.target;
    }
    const edge = (edges || []).find((e: any) => e?.source === currentNodeId && (!e?.sourceHandle || e?.sourceHandle === null));
    return edge?.target ?? null;
  };

  const replaceFlowVariables = (template: string, vars: Record<string, string>) => {
    if (!template) return "";
    return template
      .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key) => vars[key] ?? "")
      .replace(/\{\s*([\w.-]+)\s*\}/g, (_m, key) => vars[key] ?? "");
  };

  const buildMetaMessagePayload = (
    nodeData: any, to: string, vars: Record<string, string>
  ): { payload: Record<string, any>; textForStorage: string; messageType: string } | null => {
    const messageType = nodeData?.messageType || "text";
    const content = replaceFlowVariables(nodeData?.content || nodeData?.label || "", vars).trim();

    if (messageType === "replyButtons") {
      const rawButtons = Array.isArray(nodeData?.buttons) ? nodeData.buttons : [];
      const buttons = rawButtons.slice(0, 3).map((btn: any, index: number) => ({
        type: "reply",
        reply: {
          id: String(btn?.value || btn?.id || `option_${index + 1}`),
          title: String(btn?.text || `Opção ${index + 1}`).slice(0, 20),
        },
      }));
      if (buttons.length > 0) {
        const bodyText = content || "Escolha uma opção:";
        return {
          payload: {
            messaging_product: "whatsapp", to, type: "interactive",
            interactive: { type: "button", body: { text: bodyText }, action: { buttons } },
          },
          textForStorage: `${bodyText}\n${buttons.map((b: any, i: number) => `${i + 1}. ${b.reply.title}`).join("\n")}`,
          messageType: "interactive",
        };
      }
    }

    if (messageType === "list") {
      const rawItems = Array.isArray(nodeData?.listItems) ? nodeData.listItems : [];
      const rows = rawItems.slice(0, 10).map((item: any, index: number) => ({
        id: String(item?.value || item?.id || `item_${index + 1}`),
        title: String(item?.title || item?.text || `Opção ${index + 1}`).slice(0, 24),
        description: String(item?.description || "").slice(0, 72),
      }));
      if (rows.length > 0) {
        const bodyText = content || "Selecione uma opção:";
        return {
          payload: {
            messaging_product: "whatsapp", to, type: "interactive",
            interactive: {
              type: "list", body: { text: bodyText },
              action: {
                button: String(nodeData?.listButtonText || "Ver opções").slice(0, 20),
                sections: [{ title: String(nodeData?.listTitle || "Opções").slice(0, 24), rows }],
              },
            },
          },
          textForStorage: `${bodyText}\n${rows.map((r: any, i: number) => `${i + 1}. ${r.title}`).join("\n")}`,
          messageType: "interactive",
        };
      }
    }

    const fallbackText = content || "...";
    return {
      payload: { messaging_product: "whatsapp", to, type: "text", text: { body: fallbackText } },
      textForStorage: fallbackText,
      messageType: "text",
    };
  };

  const buildMenuPayload = (nodeData: any, to: string, vars: Record<string, string>) => {
    const options: any[] = Array.isArray(nodeData?.menuOptions) ? nodeData.menuOptions : [];
    const menuMessage = replaceFlowVariables(nodeData?.menuMessage || "Escolha uma opção:", vars);

    if (options.length <= 3) {
      // Use reply buttons
      const buttons = options.map((opt: any, i: number) => ({
        type: "reply",
        reply: {
          id: String(opt.value || opt.text || `option_${i + 1}`),
          title: String(opt.text || `Opção ${i + 1}`).slice(0, 20),
        },
      }));
      return {
        payload: {
          messaging_product: "whatsapp", to, type: "interactive",
          interactive: { type: "button", body: { text: menuMessage }, action: { buttons } },
        },
        textForStorage: `${menuMessage}\n${options.map((o: any, i: number) => `${i + 1}. ${o.text}`).join("\n")}`,
        messageType: "interactive",
      };
    } else {
      // Use list
      const rows = options.map((opt: any, i: number) => ({
        id: String(opt.value || opt.text || `option_${i + 1}`),
        title: String(opt.text || `Opção ${i + 1}`).slice(0, 24),
      }));
      return {
        payload: {
          messaging_product: "whatsapp", to, type: "interactive",
          interactive: {
            type: "list", body: { text: menuMessage },
            action: { button: "Ver opções", sections: [{ title: "Opções", rows }] },
          },
        },
        textForStorage: `${menuMessage}\n${options.map((o: any, i: number) => `${i + 1}. ${o.text}`).join("\n")}`,
        messageType: "interactive",
      };
    }
  };

  const sendMetaMessage = async (params: {
    whatsappConnection: any; to: string; payload: Record<string, any>;
    textForStorage: string; messageType: string; companyId: string;
    whatsappConnectionId: string; phoneNumberId: string; conversationId: string | null;
  }) => {
    const { whatsappConnection, to, payload, textForStorage, messageType, companyId, whatsappConnectionId, phoneNumberId, conversationId } = params;
    if (!whatsappConnection?.meta_access_token || !whatsappConnection?.meta_phone_number_id) {
      throw new Error("Conexão Meta sem credenciais válidas para envio");
    }
    const graphUrl = `https://graph.facebook.com/v21.0/${whatsappConnection.meta_phone_number_id}/messages`;
    const response = await fetch(graphUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${whatsappConnection.meta_access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    const waMessageId = result?.messages?.[0]?.id || null;

    await supabaseAdmin.from("whatsapp_messages").insert({
      company_id: companyId, connection_id: whatsappConnectionId, provider: "meta",
      direction: "out", wa_message_id: waMessageId, from_number: phoneNumberId,
      to_number: to, phone_number_id: phoneNumberId, message_type: messageType,
      body: textForStorage, status: response.ok ? "sent" : "failed", raw: result,
    });

    if (conversationId) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, sender_type: "agent", content: textForStorage,
        message_type: messageType, status: response.ok ? "sent" : "failed", external_id: waMessageId,
      });
      await supabaseAdmin.from("conversations").update({
        last_message: textForStorage, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
    }

    if (!response.ok) throw new Error(result?.error?.message || "Falha ao enviar mensagem pela Meta");
    return { waMessageId };
  };

  // ── Match menu option ──
  const matchMenuOption = (input: string, options: any[]): { matched: boolean; optionIndex: number } => {
    const normalizedInput = input.trim().toLowerCase();

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      // Match by number
      if (normalizedInput === String(i + 1)) return { matched: true, optionIndex: i };
      // Match by exact text
      if (opt.text && opt.text.toLowerCase().trim() === normalizedInput) return { matched: true, optionIndex: i };
      // Match by value/id
      if (opt.value && opt.value.toLowerCase().trim() === normalizedInput) return { matched: true, optionIndex: i };
      // Match by keywords
      if (opt.keywords) {
        const keywords = opt.keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
        if (keywords.some((kw: string) => normalizedInput.includes(kw))) return { matched: true, optionIndex: i };
      }
    }
    return { matched: false, optionIndex: -1 };
  };

  // ── Stateful flow engine ──
  const executeMetaFlow = async (params: {
    flow: any; inboundMessage: string; contactPhone: string; contactName: string;
    isNewConversation: boolean; conversationId: string | null; companyId: string;
    whatsappConnection: any; whatsappConnectionId: string; phoneNumberId: string;
  }) => {
    const { flow, inboundMessage, contactPhone, contactName, isNewConversation, conversationId, companyId, whatsappConnection, whatsappConnectionId, phoneNumberId } = params;

    if (!conversationId) return { executed: false, reason: "no_conversation" };

    const flowData = (flow?.flow_data || {}) as any;
    const nodes = Array.isArray(flowData?.nodes) ? flowData.nodes : [];
    const edges = Array.isArray(flowData?.edges) ? flowData.edges : [];
    if (!nodes.length) return { executed: false, reason: "invalid_flow_data" };

    const vars: Record<string, string> = { contact_name: contactName, contact_phone: contactPhone, message: inboundMessage };

    const sendCtx = { whatsappConnection, to: contactPhone, companyId, whatsappConnectionId, phoneNumberId, conversationId };

    // Check for existing active session
    const { data: existingSession } = await supabaseAdmin
      .from("flow_sessions")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "waiting_input")
      .maybeSingle();

    if (existingSession) {
      // ── RESUME: user is responding to a menu/input node ──
      const currentNode = nodes.find((n: any) => n.id === existingSession.current_node_id);
      if (!currentNode) {
        await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);
        return { executed: false, reason: "node_not_found" };
      }

      if (currentNode.type === "menu") {
        const options: any[] = Array.isArray(currentNode.data?.menuOptions) ? currentNode.data.menuOptions : [];
        const match = matchMenuOption(inboundMessage, options);

        if (match.matched) {
          // Valid option – follow option edge
          console.log(`✅ Menu option matched: ${match.optionIndex}`);
          await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);

          const selectedOption = options[match.optionIndex] || null;
          if (selectedOption?.routeType === "department" && selectedOption?.departmentId) {
            const deptName = selectedOption?.departmentName || "o departamento selecionado";
            const transferMsg = replaceFlowVariables(
              selectedOption?.transferMessage || `Perfeito! Vou te direcionar para ${deptName}.`,
              vars
            );
            await sendMetaMessage({
              ...sendCtx,
              payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: transferMsg } },
              textForStorage: transferMsg,
              messageType: "text",
            });
            await supabaseAdmin.from("conversations").update({
              attendance_type: "agent",
              department_id: selectedOption.departmentId,
              assigned_to: null,
              updated_at: new Date().toISOString(),
            }).eq("id", conversationId);
            return { executed: true, responses: 1 };
          }

          const nextNodeId = resolveNextNodeId(currentNode.id, edges, `option-${match.optionIndex}`)
            || resolveNextNodeId(currentNode.id, edges);

          if (nextNodeId) {
            return await walkFlow(nextNodeId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
          }
          return { executed: true, responses: 0 };
        } else {
          // Invalid option – increment error count
          const newErrorCount = (existingSession.error_count || 0) + 1;
          const maxErrors = Number(currentNode.data?.maxErrors) || 3;
          const invalidMsg = replaceFlowVariables(
            currentNode.data?.invalidOptionMessage || "❌ Opção inválida. Por favor, escolha uma das opções disponíveis.",
            vars
          );

          console.log(`⚠️ Invalid menu input (${newErrorCount}/${maxErrors}): "${inboundMessage}"`);

          if (newErrorCount >= maxErrors) {
            // Max errors reached – execute error action
            console.log(`🚫 Max errors reached for menu node ${currentNode.id}`);
            await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);

            const errorAction = currentNode.data?.errorAction || "continue";

            if (errorAction === "transfer" || errorAction === "transfer_queue" || errorAction === "transfer_agent") {
              const transferMsg = replaceFlowVariables(
                currentNode.data?.errorFinalMessage || "Você será transferido para um atendente. Aguarde.",
                vars
              );
              await sendMetaMessage({
                ...sendCtx,
                payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: transferMsg } },
                textForStorage: transferMsg, messageType: "text",
              });
              const updateData: any = {
                attendance_type: "agent",
                updated_at: new Date().toISOString(),
              };
              if (errorAction === "transfer_queue" || errorAction === "transfer") {
                updateData.department_id = currentNode.data?.errorDepartmentId || null;
              }
              if (errorAction === "transfer_agent") {
                updateData.assigned_to = currentNode.data?.errorAgentId || null;
              }
              await supabaseAdmin.from("conversations").update(updateData).eq("id", conversationId);
              return { executed: true, responses: 1 };
            }

            if (errorAction === "message") {
              const finalMsg = replaceFlowVariables(
                currentNode.data?.errorFinalMessage || "Não foi possível continuar o atendimento. Tente novamente mais tarde.",
                vars
              );
              await sendMetaMessage({
                ...sendCtx,
                payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: finalMsg } },
                textForStorage: finalMsg, messageType: "text",
              });
              return { executed: true, responses: 1 };
            }

            if (errorAction === "restart") {
              const startNode = nodes.find((n: any) => n.type === "start");
              if (startNode) {
                const nextId = resolveNextNodeId(startNode.id, edges);
                if (nextId) return await walkFlow(nextId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
              }
              return { executed: false, reason: "restart_failed" };
            }

            // "continue" – follow error edge
            const errorNextId = resolveNextNodeId(currentNode.id, edges, "error")
              || resolveNextNodeId(currentNode.id, edges);
            if (errorNextId) {
              return await walkFlow(errorNextId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
            }
            return { executed: true, responses: 0 };
          }

          // Send error message + re-send menu
          await sendMetaMessage({
            ...sendCtx,
            payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: invalidMsg } },
            textForStorage: invalidMsg, messageType: "text",
          });

          const menuBuilt = buildMenuPayload(currentNode.data, contactPhone, vars);
          await sendMetaMessage({ ...sendCtx, ...menuBuilt });

          // Update error count
          await supabaseAdmin.from("flow_sessions").update({ error_count: newErrorCount }).eq("id", existingSession.id);

          return { executed: true, responses: 2 };
        }
      }

      // ── RESUME: message node with interactive content (replyButtons, buttons, list) ──
      if (currentNode.type === "message") {
        const msgType = currentNode.data?.messageType || "text";
        if (["replyButtons", "buttons", "list"].includes(msgType)) {
          // Extract options from buttons or listItems
          let options: any[] = [];
          if (msgType === "buttons" || msgType === "replyButtons") {
            options = Array.isArray(currentNode.data?.buttons) ? currentNode.data.buttons : [];
          } else if (msgType === "list") {
            options = (Array.isArray(currentNode.data?.listItems) ? currentNode.data.listItems : []).map((item: any) => ({
              text: item.title || item.text,
              value: item.value || item.id,
              keywords: item.keywords || "",
              routeType: item.routeType || "flow",
              departmentId: item.departmentId || "",
              departmentName: item.departmentName || "",
              transferMessage: item.transferMessage || "",
            }));
          }

          const match = matchMenuOption(inboundMessage, options);

          if (match.matched) {
            console.log(`✅ Interactive message option matched: ${match.optionIndex}`);
            await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);
            const selectedOption = options[match.optionIndex] || null;
            if (selectedOption?.routeType === "department" && selectedOption?.departmentId) {
              const deptName = selectedOption?.departmentName || "o departamento selecionado";
              const transferMsg = replaceFlowVariables(
                selectedOption?.transferMessage || `Perfeito! Vou te direcionar para ${deptName}.`,
                vars
              );
              await sendMetaMessage({
                ...sendCtx,
                payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: transferMsg } },
                textForStorage: transferMsg,
                messageType: "text",
              });
              await supabaseAdmin.from("conversations").update({
                attendance_type: "agent",
                department_id: selectedOption.departmentId,
                assigned_to: null,
                updated_at: new Date().toISOString(),
              }).eq("id", conversationId);
              return { executed: true, responses: 1 };
            }

            const nextNodeId = resolveNextNodeId(currentNode.id, edges);
            if (nextNodeId) return await walkFlow(nextNodeId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
            return { executed: true, responses: 0 };
          } else {
            // Invalid – apply error rules
            const newErrorCount = (existingSession.error_count || 0) + 1;
            const maxErrors = Number(currentNode.data?.maxErrors) || 3;
            const invalidMsg = replaceFlowVariables(
              currentNode.data?.invalidOptionMessage || "❌ Opção inválida. Por favor, escolha uma das opções disponíveis.",
              vars
            );

            console.log(`⚠️ Invalid interactive input (${newErrorCount}/${maxErrors}): "${inboundMessage}"`);

            if (newErrorCount >= maxErrors) {
              console.log(`🚫 Max errors reached for message node ${currentNode.id}`);
              await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);

              const errorAction = currentNode.data?.errorAction || "transfer_queue";

              if (errorAction === "transfer" || errorAction === "transfer_queue" || errorAction === "transfer_agent") {
                const transferMsg = replaceFlowVariables(
                  currentNode.data?.errorFinalMessage || "Você será transferido para um atendente. Aguarde.",
                  vars
                );
                await sendMetaMessage({
                  ...sendCtx,
                  payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: transferMsg } },
                  textForStorage: transferMsg, messageType: "text",
                });
                const updateData: any = {
                  attendance_type: "agent",
                  updated_at: new Date().toISOString(),
                };
                if (errorAction === "transfer_queue" || errorAction === "transfer") {
                  updateData.department_id = currentNode.data?.errorDepartmentId || null;
                }
                if (errorAction === "transfer_agent") {
                  updateData.assigned_to = currentNode.data?.errorAgentId || null;
                }
                await supabaseAdmin.from("conversations").update(updateData).eq("id", conversationId);
                return { executed: true, responses: 1 };
              }

              if (errorAction === "message") {
                const finalMsg = replaceFlowVariables(
                  currentNode.data?.errorFinalMessage || "Não foi possível continuar o atendimento.",
                  vars
                );
                await sendMetaMessage({
                  ...sendCtx,
                  payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: finalMsg } },
                  textForStorage: finalMsg, messageType: "text",
                });
                return { executed: true, responses: 1 };
              }

              if (errorAction === "restart") {
                const startNode = nodes.find((n: any) => n.type === "start");
                if (startNode) {
                  const nextId = resolveNextNodeId(startNode.id, edges);
                  if (nextId) return await walkFlow(nextId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
                }
                return { executed: false, reason: "restart_failed" };
              }

              // continue
              const nextId = resolveNextNodeId(currentNode.id, edges);
              if (nextId) return await walkFlow(nextId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
              return { executed: true, responses: 0 };
            }

            // Send error message + re-send original interactive message
            await sendMetaMessage({
              ...sendCtx,
              payload: { messaging_product: "whatsapp", to: contactPhone, type: "text", text: { body: invalidMsg } },
              textForStorage: invalidMsg, messageType: "text",
            });

            const rebuilt = buildMetaMessagePayload(currentNode.data, contactPhone, vars);
            if (rebuilt) await sendMetaMessage({ ...sendCtx, ...rebuilt });

            await supabaseAdmin.from("flow_sessions").update({ error_count: newErrorCount }).eq("id", existingSession.id);
            return { executed: true, responses: 2 };
          }
        }
      }

      // For input nodes or unknown waiting nodes, just continue
      vars["response"] = inboundMessage;
      await supabaseAdmin.from("flow_sessions").update({ status: "completed" }).eq("id", existingSession.id);
      const nextId = resolveNextNodeId(currentNode.id, edges);
      if (nextId) return await walkFlow(nextId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
      return { executed: true, responses: 0 };
    }

    // ── NEW FLOW: no active session – only trigger on new conversations or first message ──
    const trigger = (flow?.trigger_type || "message").toLowerCase();
    const triggerApplies =
      trigger === "all" || trigger === "message" ||
      (trigger === "first_message" && isNewConversation) ||
      trigger === "keyword";

    if (!triggerApplies) return { executed: false, reason: `trigger_not_applied:${trigger}` };

    const startNode = nodes.find((n: any) => n.type === "start");
    if (!startNode?.id) return { executed: false, reason: "missing_start_node" };

    const nextNodeId = resolveNextNodeId(startNode.id, edges);
    if (!nextNodeId) return { executed: false, reason: "no_node_after_start" };

    return await walkFlow(nextNodeId, nodes, edges, vars, sendCtx, conversationId, companyId, flow.id);
  };

  // ── Walk flow graph until hitting a wait node or end ──
  const walkFlow = async (
    startNodeId: string, nodes: any[], edges: any[], vars: Record<string, string>,
    sendCtx: any, conversationId: string, companyId: string, flowId: string
  ): Promise<{ executed: boolean; responses: number; reason?: string }> => {
    let currentNodeId: string | null = startNodeId;
    let steps = 0;
    let executedMessages = 0;

    while (currentNodeId && steps < 30) {
      steps++;
      const currentNode = nodes.find((n: any) => n.id === currentNodeId);
      if (!currentNode) break;

      // ── Message node ──
      if (currentNode.type === "message") {
        const built = buildMetaMessagePayload(currentNode.data, sendCtx.to, vars);
        if (!built) break;
        await sendMetaMessage({ ...sendCtx, ...built });
        executedMessages++;

        // Check if message has reply buttons – need to wait for response
        const msgType = currentNode.data?.messageType || "text";
        if (msgType === "replyButtons" || msgType === "buttons" || msgType === "list") {
          // Save session – wait for user to pick an option
          // For message nodes with interactive elements, we treat like menu
          await supabaseAdmin.from("flow_sessions").insert({
            conversation_id: conversationId, company_id: companyId, flow_id: flowId,
            current_node_id: currentNode.id, error_count: 0, status: "waiting_input",
          });
          console.log(`⏸️ Flow paused at interactive message node ${currentNode.id} – waiting for input`);
          return { executed: true, responses: executedMessages };
        }

        currentNodeId = resolveNextNodeId(currentNode.id, edges);
        continue;
      }

      // ── Menu node ──
      if (currentNode.type === "menu") {
        const menuBuilt = buildMenuPayload(currentNode.data, sendCtx.to, vars);
        await sendMetaMessage({ ...sendCtx, ...menuBuilt });
        executedMessages++;

        // Save session – wait for user choice
        await supabaseAdmin.from("flow_sessions").insert({
          conversation_id: conversationId, company_id: companyId, flow_id: flowId,
          current_node_id: currentNode.id, error_count: 0, status: "waiting_input",
        });
        console.log(`⏸️ Flow paused at menu node ${currentNode.id} – waiting for input`);
        return { executed: true, responses: executedMessages };
      }

      // ── Delay node ──
      if (currentNode.type === "delay") {
        const secs = Number(currentNode.data?.seconds || currentNode.data?.delay || 1);
        if (Number.isFinite(secs) && secs > 0 && secs <= 30) {
          await new Promise((r) => setTimeout(r, secs * 1000));
        }
        currentNodeId = resolveNextNodeId(currentNode.id, edges);
        continue;
      }

      // ── Forward/Transfer node ──
      if (currentNode.type === "forward") {
        const transferMsg = replaceFlowVariables(currentNode.data?.transferMessage || "", vars);
        if (transferMsg) {
          await sendMetaMessage({
            ...sendCtx,
            payload: { messaging_product: "whatsapp", to: sendCtx.to, type: "text", text: { body: transferMsg } },
            textForStorage: transferMsg, messageType: "text",
          });
          executedMessages++;
        }

        const isClose = currentNode.data?.action === "close";
        if (isClose) {
          await supabaseAdmin.from("conversations").update({
            status: "closed", updated_at: new Date().toISOString(),
          }).eq("id", conversationId);
        } else {
          const deptId = currentNode.data?.departmentId || null;
          const agentId = currentNode.data?.specificAgentId || null;
          await supabaseAdmin.from("conversations").update({
            attendance_type: "agent",
            department_id: deptId,
            assigned_to: agentId,
            updated_at: new Date().toISOString(),
          }).eq("id", conversationId);
        }
        return { executed: true, responses: executedMessages };
      }

      // ── Input node – wait for response ──
      if (currentNode.type === "input") {
        const prompt = replaceFlowVariables(currentNode.data?.content || currentNode.data?.label || "", vars);
        if (prompt) {
          await sendMetaMessage({
            ...sendCtx,
            payload: { messaging_product: "whatsapp", to: sendCtx.to, type: "text", text: { body: prompt } },
            textForStorage: prompt, messageType: "text",
          });
          executedMessages++;
        }
        await supabaseAdmin.from("flow_sessions").insert({
          conversation_id: conversationId, company_id: companyId, flow_id: flowId,
          current_node_id: currentNode.id, error_count: 0, status: "waiting_input",
        });
        console.log(`⏸️ Flow paused at input node ${currentNode.id}`);
        return { executed: true, responses: executedMessages };
      }

      // ── Condition node ──
      if (currentNode.type === "condition") {
        const condValue = replaceFlowVariables(currentNode.data?.conditionValue || "", vars).toLowerCase();
        const inputVal = (vars["message"] || vars["response"] || "").toLowerCase();
        const condMatch = inputVal.includes(condValue);
        const handleId = condMatch ? "yes" : "no";
        currentNodeId = resolveNextNodeId(currentNode.id, edges, handleId) || resolveNextNodeId(currentNode.id, edges);
        continue;
      }

      // ── Tag node ──
      if (currentNode.type === "tag") {
        const tagName = currentNode.data?.tagName || currentNode.data?.label;
        if (tagName && conversationId) {
          const { data: conv } = await supabaseAdmin.from("conversations").select("tags").eq("id", conversationId).maybeSingle();
          const existingTags: string[] = Array.isArray(conv?.tags) ? conv.tags : [];
          if (!existingTags.includes(tagName)) {
            await supabaseAdmin.from("conversations").update({ tags: [...existingTags, tagName] }).eq("id", conversationId);
          }
        }
        currentNodeId = resolveNextNodeId(currentNode.id, edges);
        continue;
      }

      // ── Unknown node – skip ──
      console.log(`⚠️ Skipping unsupported node type: ${currentNode.type}`);
      currentNodeId = resolveNextNodeId(currentNode.id, edges);
    }

    return { executed: executedMessages > 0, responses: executedMessages };
  };

  // ── Linked flow resolution ──
  const linkedFlowCache = new Map<string, { flow: any | null; reason: string }>();

  const resolveActiveLinkedFlow = async ({ companyId, whatsappConnectionId }: { companyId: string; whatsappConnectionId: string }) => {
    const cacheKey = `${companyId}:${whatsappConnectionId}`;
    const cached = linkedFlowCache.get(cacheKey);
    if (cached) return cached;

    let linkedFlowId: string | null = null;

    const { data: metaSettings } = await supabaseAdmin
      .from("settings").select("value")
      .eq("company_id", companyId).eq("key", `connection_settings_meta_${whatsappConnectionId}`).maybeSingle();

    linkedFlowId = (metaSettings?.value as any)?.settings?.sendToUra || null;

    if (!linkedFlowId || linkedFlowId === "none") {
      const { data: appConn } = await supabaseAdmin
        .from("connections").select("credentials")
        .eq("company_id", companyId).eq("platform", "whatsapp")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      linkedFlowId = (appConn?.credentials as any)?.settings?.sendToUra || null;
    }

    if (!linkedFlowId || linkedFlowId === "none") {
      const result = { flow: null, reason: "no_linked_flow" };
      linkedFlowCache.set(cacheKey, result);
      return result;
    }

    const { data: flow } = await supabaseAdmin
      .from("flows").select("id, name, is_active, trigger_type, flow_data")
      .eq("id", linkedFlowId).eq("company_id", companyId).maybeSingle();

    if (!flow) { const r = { flow: null, reason: "flow_not_found" }; linkedFlowCache.set(cacheKey, r); return r; }
    if (!flow.is_active) { const r = { flow: null, reason: "flow_inactive" }; linkedFlowCache.set(cacheKey, r); return r; }

    const result = { flow, reason: "ok" };
    linkedFlowCache.set(cacheKey, result);
    return result;
  };

  // ============================================================
  // GET: Meta webhook verification
  // ============================================================
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && challenge) {
      const { data: settings } = await supabaseAdmin
        .from("app_settings").select("whatsapp_verify_token").eq("id", 1).maybeSingle();

      if (settings?.whatsapp_verify_token && token === settings.whatsapp_verify_token) {
        return new Response(challenge, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ============================================================
  // POST: Incoming events from Meta (multiempresa)
  // ============================================================
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📨 Webhook POST received");

      const entries = body?.entry || [];

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) continue;

          const { data: conn } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("id, company_id, meta_access_token, meta_phone_number_id")
            .eq("meta_phone_number_id", phoneNumberId).eq("provider", "meta").maybeSingle();

          if (!conn) { console.warn(`⚠️ No company for phone_number_id: ${phoneNumberId}`); continue; }

          const { company_id, id: whatsappConnectionId } = conn;

          const linkedFlowResolution = await resolveActiveLinkedFlow({ companyId: company_id, whatsappConnectionId });
          if (linkedFlowResolution.flow) {
            console.log(`🤖 Flow ready: ${linkedFlowResolution.flow.name}`);
          }

          let userId: string | null = null;
          const { data: companyProfile } = await supabaseAdmin.from("profiles").select("id").eq("company_id", company_id).limit(1).maybeSingle();
          if (companyProfile) userId = companyProfile.id;

          let conversationConnectionId: string | null = null;
          const { data: appConnection } = await supabaseAdmin.from("connections").select("id").eq("company_id", company_id).eq("platform", "whatsapp").order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (appConnection?.id) conversationConnectionId = appConnection.id;

          const contacts = value?.contacts || [];
          const contactName = contacts[0]?.profile?.name || null;

          // ── Process messages ──
          const messages = value?.messages || [];
          for (const msg of messages) {
            let content = "";
            const msgType = msg.type || "text";

            if (msgType === "text") content = msg.text?.body || "";
            else if (msgType === "interactive") {
              content = msg.interactive?.button_reply?.title || msg.interactive?.button_reply?.id
                || msg.interactive?.list_reply?.title || msg.interactive?.list_reply?.id || "[Interação]";
            } else if (msgType === "button") content = msg.button?.text || msg.button?.payload || "[Botão]";
            else if (msgType === "image") content = msg.image?.caption || "[Imagem]";
            else if (msgType === "video") content = msg.video?.caption || "[Vídeo]";
            else if (msgType === "audio") content = "[Áudio]";
            else if (msgType === "document") content = msg.document?.filename || "[Documento]";
            else if (msgType === "location") content = `[Localização: ${msg.location?.latitude},${msg.location?.longitude}]`;
            else if (msgType === "sticker") content = "[Figurinha]";
            else if (msgType === "reaction") content = msg.reaction?.emoji || "[Reação]";
            else content = `[${msgType}]`;

            const fromNumber = msg.from || "";
            const cleanPhone = fromNumber.replace(/\D/g, "");

            // Save raw message
            await supabaseAdmin.from("whatsapp_messages").insert({
              company_id, connection_id: whatsappConnectionId, provider: "meta",
              direction: "in", wa_message_id: msg.id, from_number: fromNumber,
              to_number: phoneNumberId, phone_number_id: phoneNumberId,
              message_type: msgType, body: content, status: "received", raw: msg,
            });

            if (userId && cleanPhone) {
              try {
                // Find/create conversation
                const { data: existingConv } = await supabaseAdmin
                  .from("conversations").select("id, status, attendance_type")
                  .eq("contact_phone", cleanPhone).eq("company_id", company_id)
                  .not("status", "eq", "closed").order("updated_at", { ascending: false }).limit(1).maybeSingle();

                let conversationId: string;
                let isNewConversation = false;

                if (existingConv) {
                  conversationId = existingConv.id;
                  await supabaseAdmin.from("conversations").update({
                    last_message: content, last_message_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(), unread_count: 1,
                  }).eq("id", conversationId);
                } else {
                  const { data: newConv, error: convError } = await supabaseAdmin
                    .from("conversations").insert({
                      user_id: userId, company_id, connection_id: conversationConnectionId,
                      contact_phone: cleanPhone, contact_name: contactName || cleanPhone,
                      status: "open", attendance_type: "ura",
                      last_message: content, last_message_at: new Date().toISOString(), unread_count: 1,
                    }).select("id").single();
                  if (convError) { console.error("❌ Error creating conversation:", convError.message); continue; }
                  conversationId = newConv.id;
                  isNewConversation = true;
                }

                // Save message to conversation
                await supabaseAdmin.from("messages").insert({
                  conversation_id: conversationId, sender_type: "customer", content,
                  message_type: msgType, status: "received", external_id: msg.id,
                });

                // Only execute flow if conversation is in URA mode
                const convType = existingConv?.attendance_type || "ura";
                if (linkedFlowResolution.flow && convType === "ura") {
                  try {
                    const flowResult = await executeMetaFlow({
                      flow: linkedFlowResolution.flow, inboundMessage: content,
                      contactPhone: cleanPhone, contactName: contactName || cleanPhone,
                      isNewConversation, conversationId, companyId: company_id,
                      whatsappConnection: conn, whatsappConnectionId, phoneNumberId,
                    });
                    console.log(`🤖 Flow result: ${JSON.stringify(flowResult)}`);
                  } catch (flowError: any) {
                    console.error("❌ Flow error:", flowError.message);
                  }
                }

                // Auto-save lead
                const { data: existingLead } = await supabaseAdmin.from("leads").select("id").eq("phone", cleanPhone).eq("user_id", userId).maybeSingle();
                if (!existingLead) {
                  await supabaseAdmin.from("leads").insert({
                    user_id: userId, phone: cleanPhone, name: contactName || cleanPhone,
                    source: "WhatsApp Meta", status: "warm",
                  });
                }
              } catch (convErr: any) {
                console.error("❌ Conversation error:", convErr.message);
              }
            }
          }

          // ── Status updates ──
          const statuses = value?.statuses || [];
          for (const st of statuses) {
            const validStatuses = ['sent', 'delivered', 'read', 'failed'];
            if (!validStatuses.includes(st.status)) continue;
            await supabaseAdmin.from("whatsapp_messages").update({ status: st.status }).eq("wa_message_id", st.id).eq("company_id", company_id);
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: { "Content-Type": "text/plain" } });
    } catch (error) {
      console.error("❌ Webhook POST error:", error);
      return new Response("EVENT_RECEIVED", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
