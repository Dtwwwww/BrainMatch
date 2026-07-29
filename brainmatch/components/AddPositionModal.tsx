'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import type { AnalysisStatus } from '@/lib/types';

interface AddPositionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STATUS_OPTIONS: { value: AnalysisStatus; label: string }[] = [
  { value: '待投递', label: '待投递' },
  { value: '已投递', label: '已投递' },
  { value: '面试中', label: '面试中' },
  { value: '已拿Offer', label: '已拿Offer' },
  { value: '已结束', label: '已结束' },
];

export default function AddPositionModal({
  open,
  onClose,
  onCreated,
}: AddPositionModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('已投递');
  const [appliedAt, setAppliedAt] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm';

  const handleSubmit = async () => {
    // 校验
    if (!companyName.trim() || !jobTitle.trim()) {
      setError('公司名称和岗位名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/protected/analyses/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          jobUrl: jobUrl.trim() || null,
          status,
          appliedAt: appliedAt
            ? new Date(appliedAt).toISOString()
            : new Date().toISOString(),
          note: note.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success('岗位已添加');
        // 重置表单
        setCompanyName('');
        setJobTitle('');
        setJobUrl('');
        setStatus('已投递');
        setAppliedAt(new Date().toISOString().split('T')[0]);
        setNote('');
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || '添加失败，请重试');
      }
    } catch {
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-zinc-100">手动添加岗位</h2>
        <p className="text-xs text-zinc-500 mt-1">
          不消耗分析次数，仅记录岗位信息
        </p>
      </div>

      <div className="space-y-4">
        {/* 公司名称 + 岗位名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              公司名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="如：字节跳动"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              岗位名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="如：后端开发工程师"
              className={inputClass}
            />
          </div>
        </div>

        {/* 岗位链接 */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            岗位链接 <span className="text-zinc-600">（选填）</span>
          </label>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://zhaopin.com/..."
            className={inputClass}
          />
        </div>

        {/* 投递状态 + 投递日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              投递状态
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AnalysisStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              投递日期
            </label>
            <input
              type="date"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            备注 <span className="text-zinc-600">（选填）</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="面试感受、薪资范围、公司印象…"
            rows={3}
            className={`${inputClass} resize-y min-h-[72px]`}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-red-400 text-center bg-red-950/30 rounded-lg py-2">
            {error}
          </p>
        )}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-zinc-900 font-semibold text-sm shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              添加中…
            </span>
          ) : (
            '添加岗位'
          )}
        </button>
      </div>
    </Modal>
  );
}
