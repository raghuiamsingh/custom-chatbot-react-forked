import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {Message} from "@types";
import {createIndexedDBService, type IDBConfig, isIndexedDBAvailable} from "@utils";

interface UseMessageCacheProps {
  enableCache: boolean;
  enableCacheAutoExpiry: boolean;
  initData: {
    PRODUCT_SOURCE?: string;
    STORE?: string;
    SOURCE_PRACTICE_TOKEN?: string;
  };
  messages: Message[];
  onMessagesLoaded: (messages: Message[]) => void;
  onPrependMessages: (messages: Message[]) => void;
}

// Constants
const CHAT_CACHE_DB_NAME = "custom-chatbot-chat-cache";
const CHAT_CACHE_DB_VERSION = 1;
const CHAT_CACHE_STORE = "messages";
const TAB_SESSION_STORAGE_KEY = "customChatbot_tabSessionId_v1";
const CHAT_CACHE_PAGE_SIZE = 20;
const CACHE_MESSAGE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const CACHE_HYDRATE_SCAN_MAX_PAGES = 100;

// Types
type ChatCachedMessage = {
  dedupeKey: string;
  sessionId: string;
  threadKey: string;
  messageId: string;
  seq: number;
  cachedAtMs?: number;
  message: Message;
};

function isExpiredCachedRow(item: ChatCachedMessage, enableCacheAutoExpiry: boolean): boolean {
  if (!enableCacheAutoExpiry) return false;
  const t = item.cachedAtMs;
  if (typeof t !== "number") return true;
  return Date.now() - t > CACHE_MESSAGE_MAX_AGE_MS;
}

// Database configuration
const chatCacheConfig: IDBConfig = {
  dbName: CHAT_CACHE_DB_NAME,
  version: CHAT_CACHE_DB_VERSION,
  stores: [{
    name: CHAT_CACHE_STORE,
    keyPath: "dedupeKey",
    indexes: [
      { name: "bySession", keyPath: "sessionId", options: { unique: false } },
      { name: "byThreadSeq", keyPath: ["threadKey", "seq"], options: { unique: true } }
    ]
  }]
};

// Create the service instance
const dbService = createIndexedDBService<ChatCachedMessage>(chatCacheConfig);

interface CachePagination {
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
}

export function useMessageCache({
  enableCache,
  enableCacheAutoExpiry,
  initData,
  messages,
  onMessagesLoaded,
  onPrependMessages,
}: UseMessageCacheProps) {
  const tabSessionId = useMemo(() => {
    if (typeof sessionStorage === "undefined") {
      return "ssr";
    }
    let id = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, id);
    }
    return id;
  }, []);
  const threadKey = useMemo(
    () =>
      `${tabSessionId}|${initData.PRODUCT_SOURCE}|${initData.STORE}|${initData.SOURCE_PRACTICE_TOKEN ?? ""}`,
    [tabSessionId, initData.PRODUCT_SOURCE, initData.STORE, initData.SOURCE_PRACTICE_TOKEN]
  );

  const [pagination, setPagination] = useState<CachePagination>({
    hasOlderMessages: false,
    isLoadingOlder: false,
  });

  const oldestSeqLoadedRef = useRef<number | null>(null);
  const hydrateRunIdRef = useRef(0);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistGenerationRef = useRef(0);

  // Hydrate messages from cache on thread change
  useEffect(() => {
    if (!enableCache || !isIndexedDBAvailable()) return;

    const runId = ++hydrateRunIdRef.current;
    oldestSeqLoadedRef.current = null;
    setPagination({ hasOlderMessages: false, isLoadingOlder: false });

    onMessagesLoaded([]); // Clear current messages

    let cancelled = false;

    (async () => {
      try {
        if (cancelled || runId !== hydrateRunIdRef.current) return;

        const threadRange = IDBKeyRange.bound(
          [threadKey, 0],
          [threadKey, Number.MAX_SAFE_INTEGER]
        );

        let recentItems: ChatCachedMessage[] = [];
        let hasMore = false;

        if (!enableCacheAutoExpiry) {
          const recentResult = await dbService.paginate(
            { limit: CHAT_CACHE_PAGE_SIZE, direction: 'prev' },
            { index: "byThreadSeq", range: threadRange, direction: 'prev' }
          );
          recentItems = recentResult.items.slice().reverse();
          hasMore = recentResult.hasMore;
        } else {
          const bucket: ChatCachedMessage[] = [];
          let offset = 0;
          let lastHasMore = false;
          for (let page = 0; page < CACHE_HYDRATE_SCAN_MAX_PAGES; page++) {
            if (cancelled || runId !== hydrateRunIdRef.current) return;
            const recentResult = await dbService.paginate(
              { limit: CHAT_CACHE_PAGE_SIZE, direction: 'prev', offset },
              { index: "byThreadSeq", range: threadRange, direction: 'prev' }
            );
            lastHasMore = recentResult.hasMore;
            if (recentResult.items.length === 0) {
              break;
            }
            const batchChrono = recentResult.items.slice().reverse();
            for (const item of batchChrono) {
              if (isExpiredCachedRow(item, true)) {
                try {
                  await dbService.delete(item.dedupeKey);
                } catch {
                  // ignore single-row delete failure
                }
              } else {
                bucket.push(item);
              }
            }
            offset += recentResult.items.length;
            const sorted = [...bucket].sort((a, b) => a.seq - b.seq);
            if (sorted.length >= CHAT_CACHE_PAGE_SIZE || !recentResult.hasMore) {
              break;
            }
          }
          if (cancelled || runId !== hydrateRunIdRef.current) return;
          const sorted = [...bucket].sort((a, b) => a.seq - b.seq);
          recentItems = sorted.slice(-CHAT_CACHE_PAGE_SIZE);
          hasMore = lastHasMore;
        }

        const messages = recentItems.map((item) => item.message);

        if (cancelled || runId !== hydrateRunIdRef.current) return;

        if (messages.length === 0) return;

        // Oldest seq in the *loaded window* (not global max), so "load older" starts below this.
        oldestSeqLoadedRef.current = Math.min(...recentItems.map((item) => item.seq));
        setPagination({ hasOlderMessages: hasMore, isLoadingOlder: false });

        onMessagesLoaded(messages);
      } catch (e) {
        // Hydration failed
      }
    })();

    return () => { cancelled = true; };
  }, [threadKey, enableCache, enableCacheAutoExpiry, onMessagesLoaded]);

  // Debounced persistence
  useEffect(() => {
    if (!enableCache || !isIndexedDBAvailable()) return;

    const generation = ++persistGenerationRef.current;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

    persistTimerRef.current = setTimeout(async () => {
      persistTimerRef.current = null;
      try {
        if (generation !== persistGenerationRef.current) return;

        const maxSeqResult = await dbService.findOne({
          index: "byThreadSeq",
          range: IDBKeyRange.bound(
            [threadKey, 0],
            [threadKey, Number.MAX_SAFE_INTEGER]
          ),
          direction: 'prev'
        });
        if (generation !== persistGenerationRef.current) return;

        let maxSeq = maxSeqResult?.seq ?? 0;

        const now = Date.now();
        for (const message of messages) {
          if (generation !== persistGenerationRef.current) return;
          if (message.type !== "typing" && message.id !== "typing") {
            maxSeq += 1;
            const dedupeKey = `${threadKey}::${message.id}`;
            const cachedMessage: ChatCachedMessage = {
              dedupeKey,
              sessionId: tabSessionId,
              threadKey,
              messageId: message.id,
              seq: maxSeq,
              cachedAtMs: now,
              message
            };
            await dbService.create(cachedMessage);
          }
        }
      } catch (e) {
        // Cache persist failed
      }
    }, 160);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [messages, threadKey, enableCache, tabSessionId]);

  // Cleanup on page hide
  useEffect(() => {
    if (!enableCache || !isIndexedDBAvailable() || !tabSessionId || tabSessionId === "ssr") return;

    const onPageHide = async () => {
      try {
        await dbService.deleteByQuery({
          index: "bySession",
          range: IDBKeyRange.only(tabSessionId)
        });
      } catch (e) {
        // Cache session delete failed
      } finally {
        if (typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.removeItem(TAB_SESSION_STORAGE_KEY);
          } catch {
            // ignore quota / private mode
          }
        }
      }
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [enableCache, tabSessionId]);

  const loadOlderMessages = useCallback(async () => {
    if (!enableCache || !isIndexedDBAvailable() || pagination.isLoadingOlder || !pagination.hasOlderMessages) return;
    if (oldestSeqLoadedRef.current == null) return;

    setPagination((prev) => ({ ...prev, isLoadingOlder: true }));

    try {
      let olderMessages: Message[] = [];
      let hasMore = false;

      if (oldestSeqLoadedRef.current > 1) {
        if (!enableCacheAutoExpiry) {
          const result = await dbService.paginate(
            { limit: CHAT_CACHE_PAGE_SIZE, direction: 'prev' },
            {
              index: "byThreadSeq",
              range: IDBKeyRange.bound([threadKey, 0], [threadKey, oldestSeqLoadedRef.current - 1]),
              direction: 'prev'
            }
          );
          const olderItems = result.items.slice().reverse();
          olderMessages = olderItems.map((item) => item.message);
          hasMore = result.hasMore;

          if (olderItems.length > 0) {
            oldestSeqLoadedRef.current = Math.min(...olderItems.map((item) => item.seq));
          }
        } else {
          let lastHasMore = false;
          for (let guard = 0; guard < CACHE_HYDRATE_SCAN_MAX_PAGES; guard++) {
            const upper = oldestSeqLoadedRef.current - 1;
            if (upper < 1) break;

            const result = await dbService.paginate(
              { limit: CHAT_CACHE_PAGE_SIZE, direction: 'prev' },
              {
                index: "byThreadSeq",
                range: IDBKeyRange.bound([threadKey, 0], [threadKey, upper]),
                direction: 'prev'
              }
            );
            lastHasMore = result.hasMore;
            const batchChrono = result.items.slice().reverse();

            if (batchChrono.length === 0) {
              hasMore = lastHasMore;
              break;
            }

            const minSeqInBatch = Math.min(...batchChrono.map((i) => i.seq));
            const freshInBatch: ChatCachedMessage[] = [];
            for (const item of batchChrono) {
              if (isExpiredCachedRow(item, true)) {
                try {
                  await dbService.delete(item.dedupeKey);
                } catch {
                  // ignore
                }
              } else {
                freshInBatch.push(item);
              }
            }

            if (freshInBatch.length > 0) {
              olderMessages = freshInBatch.map((item) => item.message);
              oldestSeqLoadedRef.current = Math.min(...freshInBatch.map((item) => item.seq));
              hasMore = lastHasMore;
              break;
            }

            oldestSeqLoadedRef.current = minSeqInBatch;
            if (!lastHasMore) {
              hasMore = false;
              break;
            }
          }
        }
      }

      if (olderMessages.length === 0) {
        setPagination({ hasOlderMessages: false, isLoadingOlder: false });
        return;
      }

      if (!oldestSeqLoadedRef.current) {
        setPagination({ hasOlderMessages: false, isLoadingOlder: false });
        return;
      }

      setPagination({ hasOlderMessages: hasMore, isLoadingOlder: false });

      onPrependMessages(olderMessages);
    } catch (e) {
      setPagination((prev) => ({ ...prev, isLoadingOlder: false }));
    }
  }, [enableCache, enableCacheAutoExpiry, threadKey, pagination, onPrependMessages]);

  const clearCache = useCallback(async () => {
    if (!enableCache || !isIndexedDBAvailable()) return;
    persistGenerationRef.current += 1;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    try {
      await dbService.deleteByQuery({
        index: "byThreadSeq",
        range: IDBKeyRange.bound(
            [threadKey, 0],
            [threadKey, Number.MAX_SAFE_INTEGER]
        )
      });
    } catch (e) {
      // Cache clear failed
    }
    oldestSeqLoadedRef.current = null;
    setPagination({ hasOlderMessages: false, isLoadingOlder: false });
  }, [enableCache, threadKey]);

  return {
    pagination,
    loadOlderMessages,
    clearCache,
  };
}
