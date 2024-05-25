import NimChatroomSocket from "./NimChatroomSocket";
const { JSDOM, ResourceLoader } = require("jsdom");

const loader = new ResourceLoader({
  userAgent: "PocketFans201807/24020203",
});

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://pocketapi.48.cn/",
  resources: loader,
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

class InterceptWebSocket extends window.WebSocket {}

const old_send = InterceptWebSocket.prototype.send;
InterceptWebSocket.prototype.send = function () {
  if (/3:::/.test(arguments[0])) {
    const message = arguments[0].replace(/3:::/, "");
    let data = null;

    try {
      data = JSON.parse(message);
    } catch {
      /* noop */
    }

    if (data && data?.SER === 1 && data?.SID === 2 && data?.Q?.length) {
      for (const Q of data.Q) {
        if (/Property/i.test(Q.t) && Q.v) {
          Q.v["3"] = 2;
          Q.v["42"] = "PocketFans201807/24020203";
          arguments[0] = `3:::${JSON.stringify(data)}`;
          break;
        }
      }
    } else if (data && data?.SER === 1 && data?.SID === 24 && data?.Q?.length) {
      for (const Q of data.Q) {
        if (/Property/i.test(Q.t) && Q.v) {
          Q.v["6"] = 2;
          arguments[0] = `3:::${JSON.stringify(data)}`;
          break;
        }
      }
    }
    return old_send.apply(this, arguments);
  }
};

globalThis.window.WebSocket = InterceptWebSocket;
