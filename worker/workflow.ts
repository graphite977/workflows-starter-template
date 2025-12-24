import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";

/**
 * This workflow showcases:
 * - Durable step execution with step.do
 * - Time-based delays with step.sleep
 * - Interactive pausing with step.waitForEvent
 * - Data flow between steps
 *
 * @see https://developers.cloudflare.com/workflows
 */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    // パラメータ（上限付き）
    const durationMs = Math.min(Number(url.searchParams.get("dur") || 8000), 10000);
    const rps = Math.min(Number(url.searchParams.get("rps") || 20), 50);
    const target = env.ORIGIN_URL; // 自分のoriginのみ

    const endAt = Date.now() + durationMs;
    let sent = 0;

    // シンプルなレートループ
    while (Date.now() < endAt) {
      const batch = [];
      for (let i = 0; i < rps; i++) {
        const u = new URL(target);
        // キャッシュ回避
        u.searchParams.set("t", Date.now().toString());
        u.searchParams.set("r", Math.random().toString(36).slice(2));

        batch.push(fetch(u.toString(), {
          headers: {
            "Cache-Control": "no-store",
            "Accept": "application/octet-stream"
          }
        }).catch(() => null));
      }
      await Promise.all(batch);
      sent += batch.length;
      // 1秒刻み
      await new Promise(r => setTimeout(r, 1000));
    }

    return new Response(JSON.stringify({
      sent,
      durationMs,
      note: "own-origin load probe"
    }), { headers: { "content-type": "application/json" }});
  }
};
