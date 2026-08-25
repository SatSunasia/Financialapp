// Sincroniza pedidos com uma planilha do Google Sheets, para consulta fácil
// (a planilha é só um espelho de leitura — o Supabase continua sendo a
// fonte real dos dados e quem controla as regras de acesso por perfil).
//
// Como ligar isso:
// 1. No Google Cloud Console, crie uma Service Account e ative a API do
//    Google Sheets. Baixe a chave JSON.
// 2. Compartilhe a planilha de destino com o e-mail da Service Account
//    (algo como xxx@xxx.iam.gserviceaccount.com), como Editor.
// 3. No Netlify, configure as variáveis de ambiente:
//    GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID
// 4. No painel do Supabase: Database → Webhooks → crie um webhook para
//    INSERT e UPDATE na tabela `pedidos_compra`, apontando para
//    https://SEU-SITE.netlify.app/.netlify/functions/sync-sheets
//
// Enquanto essas variáveis não existirem, a função responde 200 sem fazer
// nada — não quebra o app, só fica inativa.

import type { Handler } from '@netlify/functions'
import { google } from 'googleapis'

const ABA = 'Pedidos'

export const handler: Handler = async (event) => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!email || !privateKey || !sheetId) {
    return { statusCode: 200, body: 'Sincronização com Sheets não configurada — ignorando.' }
  }

  if (!event.body) return { statusCode: 400, body: 'Corpo vazio.' }

  const payload = JSON.parse(event.body)
  const pedido = payload.record ?? payload.new

  const auth = new google.auth.JWT(email, undefined, privateKey, [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
  const sheets = google.sheets({ version: 'v4', auth })

  const linha = [
    pedido.numero,
    pedido.descricao_item,
    pedido.quantidade,
    pedido.valor_estimado,
    pedido.status,
    pedido.data_solicitacao,
    pedido.updated_at ?? pedido.created_at,
  ]

  // Para manter simples: cada evento adiciona uma linha nova (histórico
  // de mudanças). Para "última versão por pedido", troque por uma leitura +
  // localização da linha do pedido antes de decidir append vs update.
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${ABA}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [linha] },
  })

  return { statusCode: 200, body: 'ok' }
}
