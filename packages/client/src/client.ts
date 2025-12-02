import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  MessageNotification,
  UpdateNotification,
  RoomIdNotification,
  PlayerIdNotification,
  Entity,
} from "@viwo/shared/jsonrpc";

export type CommandArgument =
  | string
  | number
  | boolean
  | null
  | readonly CommandArgument[];

export type GameMessage =
  | { type: "message"; text: string }
  | { type: "error"; text: string };

export interface GameState {
  isConnected: boolean;
  messages: GameMessage[];
  entities: Map<number, Entity>;
  roomId: number | null;
  playerId: number | null;
  opcodes: any[] | null;
}

export type StateListener = (state: GameState) => void;
export type MessageListener = (message: GameMessage) => void;

export class ViwoClient {
  private socket: WebSocket | null = null;
  private state: GameState = {
    isConnected: false,
    messages: [],
    entities: new Map(),
    roomId: null,
    playerId: null,
    opcodes: null,
  };
  private responseResolveFunctions = new Map<number, (value: any) => void>();
  private idCounter = 1;
  private stateListeners: Set<StateListener> = new Set();
  private messageListeners: Set<MessageListener> = new Set();
  private url: string;

  constructor(url: string = "ws://localhost:8080") {
    this.url = url;
  }

  public connect() {
    if (this.state.isConnected) return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.updateState({ isConnected: true });

      // Initial fetch
      this.execute("whoami", []);
      this.execute("look", []);
      this.execute("inventory", []);

      // Fetch opcodes
      this.fetchOpcodes();
    };

    this.socket.onclose = () => {
      this.updateState({ isConnected: false });
      this.addMessage({
        type: "error",
        text: "Disconnected from server.",
      });
      this.socket = null;
    };

    this.socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        this.handleMessage(data);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public execute(
    command: string,
    args: readonly CommandArgument[],
  ): Promise<any> {
    return this.sendRequest("execute", [command, ...args]);
  }

  public sendRequest(method: string, params: any): Promise<any> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Socket not connected"));
    }

    const id = this.idCounter++;
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    this.socket.send(JSON.stringify(req));

    return new Promise((resolve) => {
      this.responseResolveFunctions.set(id, resolve);
    });
  }

  public async fetchOpcodes() {
    const opcodes = await this.sendRequest("get_opcodes", []);
    this.updateState({ opcodes });
    return opcodes;
  }

  public subscribe(listener: StateListener) {
    this.stateListeners.add(listener);
    // Send current state immediately
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public getState(): GameState {
    return this.state;
  }

  private updateState(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  private addMessage(msg: GameMessage) {
    this.updateState({
      messages: [...this.state.messages, msg],
    });
    for (const listener of this.messageListeners) {
      listener(msg);
    }
  }

  private handleMessage(data: any) {
    // Basic JSON-RPC validation
    if (data.jsonrpc !== "2.0") {
      console.warn("Invalid JSON-RPC version", data);
      return;
    }

    if ("id" in data && data.id !== null && data.id !== undefined) {
      this.handleResponse(data as JsonRpcResponse);
    } else if ("method" in data) {
      this.handleNotification(data as JsonRpcNotification);
    }
  }

  private handleResponse(response: JsonRpcResponse) {
    const resolve = this.responseResolveFunctions.get(Number(response.id));
    if (resolve) {
      if ("result" in response) {
        resolve(response.result);

        // Special handling for get_opcodes response
        // We might need a better way to identify this request, but for now assuming it's based on content or we track IDs
        // Since we don't track which ID was for get_opcodes easily without extra map,
        // we can check if the result looks like opcodes or just rely on the caller to handle it.
        // BUT, the original code handled it globally.
        // Let's see if we can infer it.
        if (
          Array.isArray(response.result) &&
          response.result.length > 0 &&
          response.result[0].name &&
          response.result[0].handler
        ) {
          // This check is weak.
          // Better: we can't easily know.
          // However, the original code had: if (response.id === 0)
          // I am using dynamic IDs.
          // Maybe I should just expose a specific method for get_opcodes that updates the state.
        }
      } else {
        console.error("RPC Error:", response.error);
        this.addMessage({
          type: "error",
          text: `Error: ${response.error.message}`,
        });
        resolve(null);
      }
      this.responseResolveFunctions.delete(Number(response.id));
    }
  }

  private handleNotification(notification: JsonRpcNotification) {
    switch (notification.method) {
      case "message": {
        const params = (notification as MessageNotification).params;
        this.addMessage({
          type: params.type === "info" ? "message" : "error",
          text: params.text,
        });
        break;
      }
      case "update": {
        const params = (notification as UpdateNotification).params;
        const newEntities = new Map(this.state.entities);
        for (const entity of params.entities) {
          newEntities.set(entity.id, entity);
        }
        this.updateState({ entities: newEntities });
        break;
      }
      case "room_id": {
        const params = (notification as RoomIdNotification).params;
        this.updateState({ roomId: params.roomId });
        break;
      }
      case "player_id": {
        const params = (notification as PlayerIdNotification).params;
        this.updateState({ playerId: params.playerId });
        break;
      }
      default:
        console.warn("Unknown notification method:", notification.method);
    }
  }
}
