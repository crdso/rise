import type { MessagingProvider } from "./provider";

export class TwilioWhatsAppProvider implements MessagingProvider {
  name = "twilio";
  async send(to: string, body: string) {
    // stub: integração real usa Twilio REST API server-side
    console.log(`[Twilio] send to ${to}: ${body}`);
    return { id: `mock_${Date.now()}` };
  }
  verifySignature(payload: string, signature: string, url: string): boolean {
    // produção: validar com twilio helper usando TWILIO_AUTH_TOKEN
    // por ora retorna true para sandbox local, mas estrutura pronta
    if (!process.env.TWILIO_AUTH_TOKEN) return true;
    try {
      // import dinâmico opcional
      // const twilio = require('twilio');
      // return twilio.validateRequest(token, signature, url, params)
      return signature.length > 0;
    } catch { return false; }
  }
}
