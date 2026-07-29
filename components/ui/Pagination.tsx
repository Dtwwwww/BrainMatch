'use client';

import { useState, type KeyboardEvent, type ChangeEvent } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * 获取要显示的页码列表（含省略号）
 */
function getPageNumbers(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  pages.push(1);

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);
  return pages;
}

/** 按钮基础样式 */
const btnBase =
  'px-2.5 py-1.5 rounded-lg text-sm bg-zinc-800 text-zinc-400 border border-white/[0.06] hover:bg-zinc-700 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

const selectClass =
  'px-2.5 py-1.5 rounded-lg text-sm bg-zinc-800 border border-white/[0.08] text-zinc-400 focus:outline-none focus:border-brand/50 transition-colors';

const inputClass =
  'w-16 px-2.5 py-1.5 rounded-lg text-sm bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-center';

export default function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  if (total === 0) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const rangeStart = (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, total);

  const handleJump = () => {
    const target = parseInt(jumpValue, 10);
    if (isNaN(target) || target < 1 || target > totalPages) {
      setJumpValue('');
      return;
    }
    onPageChange(target);
    setJumpValue('');
  };

  const handleJumpKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
      {/* 页码导航 */}
      <div className="flex items-center gap-1">
        {/* 首页 */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={btnBase}
          title="首页"
        >
          «
        </button>
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={btnBase}
          title="上一页"
        >
          ‹
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((item, idx) => {
            if (item === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-sm text-zinc-500"
                >
                  …
                </span>
              );
            }

            const isActive = item === currentPage;
            return (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand text-zinc-900 font-semibold border border-brand'
                    : 'bg-zinc-800 text-zinc-400 border border-white/[0.06] hover:bg-zinc-700 hover:text-zinc-300'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={btnBase}
          title="下一页"
        >
          ›
        </button>
        {/* 末页 */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={btnBase}
          title="末页"
        >
          »
        </button>
      </div>

      {/* 控件区：每页数量 + 跳转 */}
      <div className="flex items-center gap-3">
        {/* 每页数量 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">每页</span>
          <select
            value={limit}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onLimitChange(Number(e.target.value))
            }
            className={selectClass}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* 跳转 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">跳至</span>
          <input
            type="text"
            value={jumpValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setJumpValue(e.target.value.replace(/\D/g, ''))
            }
            onKeyDown={handleJumpKeyDown}
            onBlur={handleJump}
            placeholder={`${currentPage}`}
            className={inputClass}
          />
        </div>
      </div>

      {/* 范围文本 */}
      <div className="text-xs text-zinc-500 whitespace-nowrap">
        第 {rangeStart}-{rangeEnd} 条，共 {total} 条
      </div>
    </div>
  );
}
