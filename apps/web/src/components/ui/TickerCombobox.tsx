"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { searchTickers, TickerItem, isInStaticList } from "@/data/tickers";
import type { ValidationStatus } from "@/hooks/useTickerValidation";

interface TickerComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validationStatus?: ValidationStatus | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TickerCombobox({
  value,
  onChange,
  onBlur,
  validationStatus,
  placeholder = "Ticker symbol",
  disabled = false,
  className = "",
}: TickerComboboxProps) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<TickerItem[]>([]);

  // 當 value 從外部改變時同步 query
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // 搜尋靜態清單
  useEffect(() => {
    const results = searchTickers(query, 8);
    setOptions(results);
  }, [query]);

  // 處理選擇
  const handleChange = useCallback(
    (selectedItem: TickerItem | string | null) => {
      if (!selectedItem) return;

      const newValue =
        typeof selectedItem === "string"
          ? selectedItem.toUpperCase()
          : selectedItem.symbol;

      onChange(newValue);
      setQuery(newValue);
    },
    [onChange]
  );

  // 處理輸入變化
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = event.target.value.toUpperCase();
      setQuery(newQuery);
      onChange(newQuery);
    },
    [onChange]
  );

  // 驗證狀態指示器
  const StatusIndicator = () => {
    if (!value || !validationStatus) return null;

    switch (validationStatus) {
      case "pending":
        return (
          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        );
      case "valid":
      case "static":
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "invalid":
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // 判斷是否為自由輸入（不在選項中）
  const isCustomInput =
    query !== "" && !options.some((o) => o.symbol === query);

  return (
    <Combobox
      value={value}
      onChange={handleChange}
      disabled={disabled}
      immediate
    >
      <div className="relative">
        <ComboboxInput
          displayValue={(item: string | TickerItem) =>
            typeof item === "string" ? item : item?.symbol || ""
          }
          onChange={handleInputChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2 pr-16 border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${validationStatus === "invalid" ? "border-red-500" : "border-gray-300"}
            ${className}
          `}
        />

        {/* 右側圖示區域 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <StatusIndicator />
          <ComboboxButton className="p-1 hover:bg-gray-100 rounded">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </ComboboxButton>
        </div>

        {/* 下拉選項 */}
        <ComboboxOptions
          anchor="bottom start"
          className="w-[var(--input-width)] z-50 mt-1 max-h-60 overflow-auto rounded-lg bg-white border border-gray-200 shadow-lg focus:outline-none empty:invisible"
        >
          {options.length === 0 && query !== "" ? (
            <div className="py-3 px-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span>No matches found.</span>
              </div>
            </div>
          ) : (
            options.map((item) => (
              <ComboboxOption
                key={item.symbol}
                value={item}
                className="cursor-pointer select-none py-2 px-4 data-[focus]:bg-blue-50 data-[focus]:text-blue-900 text-gray-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium data-[selected]:text-blue-600">
                      {item.symbol}
                    </span>
                    <span className="text-sm text-gray-500 truncate max-w-48">
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.category === "etf"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.category.toUpperCase()}
                  </span>
                </div>
              </ComboboxOption>
            ))
          )}

          {/* 自由輸入選項 */}
          {isCustomInput && (
            <ComboboxOption
              value={query}
              className="cursor-pointer select-none py-2 px-4 border-t border-gray-100 data-[focus]:bg-blue-50 data-[focus]:text-blue-900 text-gray-900"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>
                  Use &quot;{query}&quot;
                </span>
                {!isInStaticList(query) && (
                  <span className="text-sm text-gray-500">
                    (will be validated)
                  </span>
                )}
              </div>
            </ComboboxOption>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
