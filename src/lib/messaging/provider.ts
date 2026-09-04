export interface MessagingProvider {
  name: string;
  send(to: string, body: string): Promise<{ id: string }>;
  verifySignature(payload: string, signature: string, url: string): boolean;
}
