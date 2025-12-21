"use client";

import { useState, useCallback, useRef } from "react";
import { validateTickers } from "@/lib/api";
import { isInStaticList } from "@/data/tickers";

export type ValidationStatus = "pending" | "valid" | "invalid" | "static";

interface ValidationState {
  [ticker: string]: ValidationStatus;
}

interface UseTickerValidationReturn {
  validationState: ValidationState;
  validateTicker: (ticker: string) => Promise<boolean>;
  validateMultipleTickers: (
    tickers: string[]
  ) => Promise<Record<string, boolean>>;
  clearValidation: (ticker: string) => void;
  getStatus: (ticker: string) => ValidationStatus | null;
}

/**
 * 股票代碼驗證 Hook
 * - 優先檢查靜態清單（即時返回）
 * - 不在清單中的代碼使用 API 驗證
 * - 內建 debounce 避免過度呼叫 API
 */
export function useTickerValidation(): UseTickerValidationReturn {
  const [validationState, setValidationState] = useState<ValidationState>({});
  const pendingPromises = useRef<Map<string, Promise<boolean>>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const getStatus = useCallback(
    (ticker: string): ValidationStatus | null => {
      if (!ticker) return null;
      return validationState[ticker.toUpperCase()] || null;
    },
    [validationState]
  );

  const validateTicker = useCallback(
    async (ticker: string): Promise<boolean> => {
      const normalizedTicker = ticker.toUpperCase().trim();

      if (!normalizedTicker) {
        return false;
      }

      // 檢查靜態清單（即時返回）
      if (isInStaticList(normalizedTicker)) {
        setValidationState((prev) => ({
          ...prev,
          [normalizedTicker]: "static",
        }));
        return true;
      }

      // Return existing promise if validation is already in-flight
      if (pendingPromises.current.has(normalizedTicker)) {
        return pendingPromises.current.get(normalizedTicker)!;
      }

      // 清除之前的 debounce timer
      const existingTimer = debounceTimers.current.get(normalizedTicker);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 設定 pending 狀態
      setValidationState((prev) => ({
        ...prev,
        [normalizedTicker]: "pending",
      }));

      // Create and store a new promise for the debounced API call
      const promise = new Promise<boolean>((resolve) => {
        const timer = setTimeout(async () => {
          try {
            const results = await validateTickers([normalizedTicker]);
            const isValid = results[normalizedTicker] ?? false;

            setValidationState((prev) => ({
              ...prev,
              [normalizedTicker]: isValid ? "valid" : "invalid",
            }));

            resolve(isValid);
          } catch (error) {
            console.error("Ticker validation failed:", error);
            setValidationState((prev) => ({
              ...prev,
              [normalizedTicker]: "invalid",
            }));
            resolve(false);
          } finally {
            // Clean up after the promise is settled
            pendingPromises.current.delete(normalizedTicker);
            debounceTimers.current.delete(normalizedTicker);
          }
        }, 300);

        debounceTimers.current.set(normalizedTicker, timer);
      });

      pendingPromises.current.set(normalizedTicker, promise);
      return promise;
    },
    []
  );

  const validateMultipleTickers = useCallback(
    async (tickers: string[]): Promise<Record<string, boolean>> => {
      const normalizedTickers = tickers
        .map((t) => t.toUpperCase().trim())
        .filter(Boolean);

      if (normalizedTickers.length === 0) {
        return {};
      }

      // 分離靜態清單中的和需要 API 驗證的
      const staticTickers: string[] = [];
      const apiTickers: string[] = [];

      normalizedTickers.forEach((ticker) => {
        if (isInStaticList(ticker)) {
          staticTickers.push(ticker);
        } else {
          apiTickers.push(ticker);
        }
      });

      // 更新靜態清單的狀態
      if (staticTickers.length > 0) {
        setValidationState((prev) => {
          const updates: ValidationState = { ...prev };
          staticTickers.forEach((ticker) => {
            updates[ticker] = "static";
          });
          return updates;
        });
      }

      // 呼叫 API 驗證其餘的
      let apiResults: Record<string, boolean> = {};
      if (apiTickers.length > 0) {
        // 設定 pending 狀態
        setValidationState((prev) => {
          const updates: ValidationState = { ...prev };
          apiTickers.forEach((ticker) => {
            updates[ticker] = "pending";
          });
          return updates;
        });

        try {
          apiResults = await validateTickers(apiTickers);

          setValidationState((prev) => {
            const updates: ValidationState = { ...prev };
            Object.entries(apiResults).forEach(([ticker, isValid]) => {
              updates[ticker] = isValid ? "valid" : "invalid";
            });
            return updates;
          });
        } catch (error) {
          console.error("Failed to validate tickers:", error);
          // 驗證失敗時標記為 invalid
          setValidationState((prev) => {
            const updates: ValidationState = { ...prev };
            apiTickers.forEach((ticker) => {
              updates[ticker] = "invalid";
            });
            return updates;
          });
        }
      }

      // 合併結果
      const results: Record<string, boolean> = {};
      staticTickers.forEach((ticker) => {
        results[ticker] = true;
      });
      Object.entries(apiResults).forEach(([ticker, isValid]) => {
        results[ticker] = isValid;
      });

      return results;
    },
    []
  );

  const clearValidation = useCallback((ticker: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();

    // 清除 debounce timer
    const existingTimer = debounceTimers.current.get(normalizedTicker);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.current.delete(normalizedTicker);
    }

    // 從 pending 中移除
    pendingPromises.current.delete(normalizedTicker);

    // 清除狀態
    setValidationState((prev) => {
      const updated = { ...prev };
      delete updated[normalizedTicker];
      return updated;
    });
  }, []);

  return {
    validationState,
    validateTicker,
    validateMultipleTickers,
    clearValidation,
    getStatus,
  };
}
