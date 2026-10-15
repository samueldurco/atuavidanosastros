import {
  calculateFreeToolResult,
  FreeToolInputError,
  isFreeToolId,
} from "../../../apps/web/src/lib/server/free-tools-calculation";
import { signFreeToolResult } from "../../../apps/web/src/lib/server/free-tool-receipt";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
};
// Match the web endpoint: a valid 6000-character dream may exceed 16 KiB in UTF-8.
const maxRequestBytes = 32768;
export function freeToolsRuntimeHandler(secret: string | undefined) {
  return async (request: Request): Promise<Response> => {
    const respond = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (request.method !== "POST")
      return respond({ code: "method_not_allowed" }, 405);
    if (!secret || secret.length < 32)
      return respond({ code: "runtime_unavailable" }, 503);
    if (
      !(request.headers.get("content-type") ?? "").startsWith(
        "application/json",
      )
    )
      return respond({ code: "invalid_input" }, 400);
    if (Number(request.headers.get("content-length")) > maxRequestBytes)
      return respond({ code: "invalid_input" }, 400);
    let payload: { tool?: unknown; input?: unknown };
    try {
      const reader = request.body?.getReader();
      if (!reader) return respond({ code: "invalid_input" }, 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxRequestBytes) {
          await reader.cancel();
          return respond({ code: "invalid_input" }, 400);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        typeof payload.tool !== "string" ||
        !isFreeToolId(payload.tool)
      )
        return respond({ code: "invalid_tool" }, 404);
      const result = await calculateFreeToolResult(payload.tool, payload.input);
      const receipt = await signFreeToolResult(result, secret);
      if (!receipt) return respond({ code: "runtime_unavailable" }, 503);
      return respond({ result, receipt });
    } catch (error) {
      if (error instanceof FreeToolInputError)
        return respond(
          { code: error.code },
          error.code === "ascendant_unavailable" || error.code === "houses_unavailable" ? 422 : 400,
        );
      if (error instanceof SyntaxError || error instanceof TypeError)
        return respond({ code: "invalid_input" }, 400);
      return respond({ code: "calculation_unavailable" }, 503);
    }
  };
}
