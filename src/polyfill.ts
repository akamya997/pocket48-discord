const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://example.com/",
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.self = globalThis.window;
globalThis.navigator = dom.window.navigator;
