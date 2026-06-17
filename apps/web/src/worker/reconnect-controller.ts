export function createReconnectController() {
  let url = "";
  let lastUserMessage = "";
  let streamActive = false;
  let reconnectMessage = "";

  return {
    get url() {
      return url;
    },
    connect(nextUrl: string) {
      url = nextUrl;
    },
    sentUserMessage(content: string) {
      lastUserMessage = content;
      streamActive = true;
    },
    streamEnded() {
      streamActive = false;
    },
    takeReconnectMessage() {
      const content = reconnectMessage;
      reconnectMessage = "";
      return content;
    },
    socketClosed() {
      if (!streamActive || !lastUserMessage) return "";
      reconnectMessage = lastUserMessage;
      return lastUserMessage;
    },
  };
}
