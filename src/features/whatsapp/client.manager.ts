import { Client } from 'whatsapp-web.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientManager {
  private clients: Map<string, Client> = new Map();

  getClient(userId: string): Client | undefined {
    return this.clients.get(userId);
  }

  setClient(userId: string, client: Client) {
    this.clients.set(userId, client);
  }

  deleteClient(userId: string) {
    this.clients.delete(userId);
  }

  getAllClients(): Map<string, Client> {
    return this.clients;
  }
}
