import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {Message} from "@types";
import {createIndexedDBService, type IDBConfig, isIndexedDBAvailable} from "@utils";

interface UseMessageCacheProps {
  enableCache: boolean;
  initData: { PRODUCT_SOURCE?: string; STORE?: string };
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

// Types
type ChatCachedMessage = {
  dedupeKey: string;
  sessionId: string;
  threadKey: string;
  messageId: string;
  seq: number;
  message: Message;
};

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
    () => `${tabSessionId}|${initData.PRODUCT_SOURCE}|${initData.STORE}`,
    [tabSessionId, initData.PRODUCT_SOURCE, initData.STORE]
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
        const recentResult = await dbService.paginate(
          { limit: CHAT_CACHE_PAGE_SIZE, direction: 'prev' },
          {
            index: "byThreadSeq",
            range: IDBKeyRange.bound(
              [threadKey, 0],
              [threadKey, Number.MAX_SAFE_INTEGER]
            ),
            direction: 'prev'
          }
        );
        const recentItems = recentResult.items.slice().reverse();
        const messages = recentItems.map((item) => item.message);
        const hasMore = recentResult.hasMore;

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
  }, [threadKey, enableCache, onMessagesLoaded]);

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
  }, [enableCache, threadKey, pagination, onPrependMessages]);

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
