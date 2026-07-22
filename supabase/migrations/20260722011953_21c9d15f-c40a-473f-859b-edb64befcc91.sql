
ALTER TABLE public.mercado_pago_configs
ADD COLUMN IF NOT EXISTS reminder_templates jsonb NOT NULL DEFAULT jsonb_build_object(
  'before_3', jsonb_build_object('tone','Cordial','text', 'Oi {cliente}! 👋 Passando só pra lembrar que sua cobrança de *R$ {valor}* ({descricao}) vence em *{vencimento}*. Qualquer dúvida é só me chamar. 🙌'),
  'before_1', jsonb_build_object('tone','Cordial','text', 'Oi {cliente}! Só um lembrete rápido: amanhã ({vencimento}) vence sua cobrança de *R$ {valor}*. Já está tudo certo por aí? 😊'),
  'on_day',   jsonb_build_object('tone','Cordial','text', 'Olá {cliente}! Hoje é o dia do vencimento da sua cobrança de *R$ {valor}* ({descricao}). Quando puder, confirma o pagamento por aqui pra eu dar baixa, beleza? 🙏'),
  'overdue',  jsonb_build_object('tone','Firme','text',   'Oi {cliente}, tudo bem? Sua cobrança de *R$ {valor}* venceu há {dias_atraso} dias. Conseguimos acertar essa pendência hoje? Qualquer coisa me chama. 😉')
);
