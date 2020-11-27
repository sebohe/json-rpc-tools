import { EventEmitter } from "events";
import { safeJsonParse, safeJsonStringify } from "safe-json-utils";
import { IJsonRpcConnection, JsonRpcPayload, isJsonRpcResponse } from "@json-rpc-tools/utils";

import { isWsUrl } from "./url";

const WS =
  // @ts-ignore
  typeof global.WebSocket !== "undefined" ? global.WebSocket : require("ws");

export class WsConnection implements IJsonRpcConnection {
  public events = new EventEmitter();

  private socket: WebSocket | undefined;

  constructor(public url: string) {
    if (!isWsUrl(url)) {
      throw new Error(`Provided URL is not compatible with WebSocket connection: ${url}`);
    }
    this.url = url;
  }

  get connected(): boolean {
    return typeof this.socket !== "undefined";
  }

  public on(event: string, listener: any): void {
    this.events.on(event, listener);
  }

  public once(event: string, listener: any): void {
    this.events.once(event, listener);
  }

  public off(event: string, listener: any): void {
    this.events.off(event, listener);
  }

  public async open(url: string = this.url): Promise<void> {
    this.socket = await this.register(url);
  }

  public async close(): Promise<void> {
    if (typeof this.socket === "undefined") {
      throw new Error("Already disconnected");
    }
    this.socket.close();
    this.onClose();
  }

  public async send(payload: JsonRpcPayload): Promise<void> {
    if (typeof this.socket === "undefined") {
      this.socket = await this.register();
    }
    this.socket.send(safeJsonStringify(payload));
  }

  // ---------- Private ----------------------------------------------- //

  private register(url = this.url): Promise<WebSocket> {
    if (!isWsUrl(url)) {
      throw new Error(`Provided URL is not compatible with WebSocket connection: ${url}`);
    }
    this.url = url;
    return new Promise((resolve, reject) => {
      const socket = new WS(url) as WebSocket;
      socket.onopen = () => {
        this.onOpen(socket);
        resolve(socket);
      };
      socket.onerror = (event: Event) => {
        this.events.emit("error", event);
        reject(event);
      };
    });
  }

  private onOpen(socket: WebSocket) {
    socket.onmessage = (event: MessageEvent) => this.onPayload(event);
    socket.onclose = () => this.onClose();
    this.socket = socket;
    this.events.emit("open");
  }

  private onClose() {
    this.socket = undefined;
    this.events.emit("close");
  }

  private onPayload(e: { data: any }) {
    if (typeof e.data === "undefined") return;
    const payload: JsonRpcPayload = typeof e.data === "string" ? safeJsonParse(e.data) : e.data;
    if (isJsonRpcResponse(payload)) {
      this.events.emit(`${payload.id}`, payload);
    } else {
      this.events.emit("request", payload);
    }
  }
}
