import NimChatroomSocket from "./NimChatroomSocket";
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://example.com/",
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.self = globalThis.window;
globalThis.navigator = dom.window.navigator;

// a magic to let the program run
// eslint-disable-next-line no-unused-vars
function magic() {
  const _socket = new NimChatroomSocket({
    pocket48IsAnonymous: true,
    pocket48Account: "",
    pocket48Token: "",
    pocket48RoomId: "1",
    messageIgnore: true,
  });
  return _socket;
}
