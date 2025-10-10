import ReactDOM from "react-dom/client";
import App from "./App";

// Define custom element
class ChatbotWidget extends HTMLElement {
  connectedCallback() {
    const mountPoint = document.createElement("div");
    this.appendChild(mountPoint);
    ReactDOM.createRoot(mountPoint).render(<App />);
  }
}

// Register the custom element
customElements.define("chatbot-widget", ChatbotWidget);
