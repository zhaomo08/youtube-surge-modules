/**
 * Normalize DualSubs' cached Chinese target language.
 *
 * $argument accepts the same source,target pair used by DualSubs, for example:
 * AUTO,ZH-HANS
 */
(() => {
  const CACHE_KEY = "@DualSubs.YouTube.Caches.tlang";
  const FALLBACK_TARGET = "zh-Hans";

  const canonicalize = value => {
    const normalized = String(value || "").trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (["zh-hans", "zh-cn", "zh-sg", "zh"].includes(normalized)) return "zh-Hans";
    if (["zh-hant", "zh-tw", "zh-hk", "zh-mo"].includes(normalized)) return "zh-Hant";
    return value || FALLBACK_TARGET;
  };

  try {
    const rawArgument = typeof $argument === "string" ? $argument : "";
    const languagePair = rawArgument.replace(/^["']|["']$/g, "").split(",");
    const targetLanguage = canonicalize(languagePair[1] || languagePair[0] || FALLBACK_TARGET);

    if ($persistentStore.read(CACHE_KEY) !== targetLanguage) {
      $persistentStore.write(targetLanguage, CACHE_KEY);
    }

    const url = new URL($request.url);
    const requestedTarget = url.searchParams.get("tlang");

    // Only normalize Chinese variants. Explicit non-Chinese selections remain available.
    if (
      targetLanguage === "zh-Hans" &&
      requestedTarget &&
      /^zh(?:-|$)/i.test(requestedTarget) &&
      canonicalize(requestedTarget) !== targetLanguage
    ) {
      url.searchParams.set("tlang", targetLanguage);
      $done({ url: url.toString() });
    } else {
      $done({});
    }
  } catch (error) {
    console.log(`[DualSubs Language] ${String(error)}`);
    $done({});
  }
})();
