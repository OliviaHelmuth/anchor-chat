import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement scrollTo — every chat-transcript component
// (ChatWidget, ListenerChat) calls scrollRef.current?.scrollTo(...) to keep
// the view pinned to the latest message, which real browsers always have.
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

afterEach(() => {
  cleanup();
});
