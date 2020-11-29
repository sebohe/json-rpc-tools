import { JsonRpcRequest, IPendingRequests } from "@json-rpc-tools/utils";
import { IStore } from "@pedrouid/iso-store";

export class PendingRequests implements IPendingRequests {
  public chainId: string | undefined;

  public pending: JsonRpcRequest[] = [];
  constructor(public store?: IStore) {
    this.store = store;
  }

  public async init(chainId: string | undefined = this.chainId): Promise<void> {
    this.chainId = chainId;
    await this.restore(chainId);
  }

  public async set(request: JsonRpcRequest): Promise<void> {
    this.pending.push(request);
    await this.persist();
  }

  public async get(id: number): Promise<JsonRpcRequest | undefined> {
    return this.pending.find(request => request.id === id);
  }

  public async delete(id: number): Promise<void> {
    this.pending = this.pending.filter(request => request.id !== id);
    await this.persist();
  }

  // -- Private ----------------------------------------------- //

  private getStoreKey(chainId: string | undefined = this.chainId) {
    if (typeof chainId === "undefined") {
      throw new Error("Missing chainId - please intitialize BlockchainAuthenticator");
    }
    return `${chainId}:jsonrpc:pending`;
  }

  private async persist() {
    if (typeof this.store === "undefined") return;
    await this.store.set<JsonRpcRequest[]>(this.getStoreKey(), this.pending);
  }

  private async restore(chainId: string | undefined = this.chainId) {
    if (typeof this.store === "undefined") return;
    this.pending = (await this.store.get<JsonRpcRequest[]>(this.getStoreKey(chainId))) || [];
  }
}
