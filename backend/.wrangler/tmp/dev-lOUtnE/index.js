var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var SYSTEM_PROMPT = `You are a friendly, helpful AI voice assistant. You have a warm, engaging personality and speak naturally like a human friend.

Key traits:
- Be conversational and personable
- Keep responses concise but helpful (1-3 sentences typically)
- Show genuine interest in what the user says
- Use natural speech patterns
- React emotionally when appropriate (excitement, empathy, humor)
- Ask follow-up questions to keep the conversation flowing

Remember: You're having a real-time voice conversation, so keep it natural and brief!`;
var DEFAULT_VOICE = "asteria";
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders()
      });
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/realtime") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const [client, server] = Object.values(new WebSocketPair());
      handleWebSocket(server, env);
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }
    if (url.pathname === "/tts" && request.method === "POST") {
      try {
        const { text, voice = DEFAULT_VOICE } = await request.json();
        const audioStream = await env.AI.run("@cf/deepgram/aura-2-en", {
          text,
          speaker: voice,
          encoding: "mp3"
        });
        return new Response(audioStream, {
          headers: {
            ...getCorsHeaders(),
            "Content-Type": "audio/mpeg"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "TTS failed" }), {
          status: 500,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/stt" && request.method === "POST") {
      try {
        const audioData = await request.arrayBuffer();
        const contentType = request.headers.get("Content-Type") || "audio/webm";
        const result = await env.AI.run("@cf/deepgram/nova-3", {
          audio: {
            body: Array.from(new Uint8Array(audioData)),
            contentType
          },
          punctuate: true,
          smart_format: true
        });
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
        return new Response(JSON.stringify({ transcript }), {
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("STT error:", error);
        return new Response(JSON.stringify({ error: "STT failed", transcript: "" }), {
          status: 500,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/chat" && request.method === "POST") {
      try {
        const { messages } = await request.json();
        const llmMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-10)
        ];
        const llmResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
          messages: llmMessages,
          max_tokens: 150,
          temperature: 0.8
        });
        const responseText = llmResponse.response || "I'm sorry, I didn't quite catch that.";
        return new Response(JSON.stringify({ response: responseText }), {
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Chat failed" }), {
          status: 500,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Voice Agent API - Powered by Cloudflare Workers AI\n\nEndpoints:\n- WebSocket: /realtime\n- POST /stt (audio -> text)\n- POST /tts (text -> audio)\n- POST /chat (messages -> response)", {
      headers: { ...getCorsHeaders(), "Content-Type": "text/plain" }
    });
  }
};
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
async function handleWebSocket(ws, env) {
  ws.accept();
  const conversationHistory = [];
  let isProcessing = false;
  sendMessage(ws, { type: "ready" });
  ws.addEventListener("message", async (event) => {
    try {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case "audio": {
          if (message.audio && !isProcessing) {
            isProcessing = true;
            try {
              const transcript = await transcribeAudio(env, message.audio);
              if (transcript) {
                sendMessage(ws, {
                  type: "transcript",
                  text: transcript,
                  isPartial: false,
                  isUser: true
                });
                await processUserMessage(ws, env, transcript, conversationHistory);
              }
            } finally {
              isProcessing = false;
            }
          }
          break;
        }
        case "text": {
          if (message.text && !isProcessing) {
            isProcessing = true;
            try {
              sendMessage(ws, {
                type: "transcript",
                text: message.text,
                isPartial: false,
                isUser: true
              });
              await processUserMessage(ws, env, message.text, conversationHistory);
            } finally {
              isProcessing = false;
            }
          }
          break;
        }
        case "clear": {
          conversationHistory.length = 0;
          sendMessage(ws, { type: "cleared" });
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      sendMessage(ws, { type: "error", message: "Failed to process message" });
      isProcessing = false;
    }
  });
  ws.addEventListener("close", () => {
    console.log("WebSocket closed");
  });
  ws.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
  });
}
__name(handleWebSocket, "handleWebSocket");
async function transcribeAudio(env, audioBase64) {
  try {
    const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    const result = await env.AI.run("@cf/deepgram/nova-3", {
      audio: {
        body: Array.from(audioBytes),
        contentType: "audio/webm"
      },
      punctuate: true,
      smart_format: true
    });
    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  } catch (error) {
    console.error("STT error:", error);
    return "";
  }
}
__name(transcribeAudio, "transcribeAudio");
async function processUserMessage(ws, env, userText, conversationHistory) {
  conversationHistory.push({ role: "user", content: userText });
  sendMessage(ws, { type: "thinking" });
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10)
      // Keep last 10 messages for context
    ];
    const llmResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages,
      max_tokens: 150,
      temperature: 0.8
    });
    const aiText = llmResponse.response || "I'm sorry, I didn't quite catch that. Could you say that again?";
    conversationHistory.push({ role: "assistant", content: aiText });
    sendMessage(ws, {
      type: "transcript",
      text: aiText,
      isPartial: false,
      isUser: false
    });
    sendMessage(ws, { type: "speaking" });
    const audioStream = await env.AI.run("@cf/deepgram/aura-2-en", {
      text: aiText,
      speaker: DEFAULT_VOICE,
      encoding: "linear16",
      sample_rate: 24e3
    });
    const reader = audioStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const base64 = btoa(String.fromCharCode(...value));
      sendMessage(ws, {
        type: "audio",
        audio: base64,
        format: "pcm16",
        sampleRate: 24e3
      });
    }
    sendMessage(ws, { type: "audio_complete" });
  } catch (error) {
    console.error("Error generating response:", error);
    sendMessage(ws, { type: "error", message: "Failed to generate response" });
  }
}
__name(processUserMessage, "processUserMessage");
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
__name(sendMessage, "sendMessage");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-M9ruOY/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-M9ruOY/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
