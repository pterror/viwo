import { createStore } from "solid-js/store";
const [state, setState] = createStore({
    isConnected: false,
    messages: [],
    room: null,
    inventory: null,
    inspectedItem: null,
});
let socket = null;
export const gameStore = {
    state,
    connect: () => {
        if (state.isConnected)
            return;
        socket = new WebSocket("ws://localhost:8080");
        socket.onopen = () => {
            setState("isConnected", true);
            // Initial fetch
            gameStore.send(["look"]);
            gameStore.send(["inventory"]);
        };
        socket.onclose = () => {
            setState("isConnected", false);
            gameStore.addMessage({
                type: "error",
                text: "Disconnected from server.",
            });
            socket = null;
        };
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Update specific state based on type
                if (data.type === "room") {
                    setState("room", data);
                }
                else if (data.type === "inventory") {
                    setState("inventory", data);
                }
                else if (data.type === "item") {
                    setState("inspectedItem", data);
                }
                gameStore.addMessage(structuredClone(data));
            }
            catch (e) {
                console.error("Failed to parse message", e);
            }
        };
    },
    send: (payload) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
        else {
            console.error("Socket not connected");
        }
    },
    addMessage: (msg) => {
        setState("messages", (msgs) => [...msgs, msg]);
    },
};
