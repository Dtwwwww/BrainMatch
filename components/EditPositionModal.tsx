'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import type { AnalysisStatus } from '@/lib/types';

interface PositionItem {
  id: string;
  company_name: string | null;
  job_title: string | null;
  job_url: string | null;
  note: string | null;
  status: string;
  applied_at: string | null;
  interview_round: string | null;
  interview_date: string | null;
  report_json: any;
  created_at: string;
}

interface EditPositionModalProps {
  open: boolean;
  position: PositionItem;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS: { value: AnalysisStatus; label: string }[] = [
  { value: '待投递', label: '待投递' },
  { value: '已投递', label: '已投递' },
  { value: '面试中', label: '面试中' },
  { value: '已拿Offer', label: '已拿Offer' },
  { value: '已结束', label: '已结束' },
];

const INTERVIEW_ROUNDS = [
  { value: '', label: '未设置' },
  { value: '简历筛选', label: '简历筛选' },
  { value: 'HR初筛', label: 'HR初筛' },
  { value: '技术一面', label: '技术一面' },
  { value: '技术二面', label: '技术二面' },
  { value: '技术终面', label: '技术终面' },
  { value: 'HR面', label: 'HR面' },
  { value: '总监面', label: '总监面' },
  { value: 'CEO面', label: 'CEO面' },
];

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 transition-colors text-sm';

export default function EditPositionModal({
  open,
  position,
  onClose,
  onUpdated,
}: EditPositionModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('已投递');
  const [appliedAt, setAppliedAt] = useState('');
  const [interviewRound, setInterviewRound] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 打开弹窗时从 position 数据初始化表单
  useEffect(() => {
    if (open && position) {
      setCompanyName(position.company_name || '');
      setJobTitle(position.job_title || '');
      setJobUrl(position.job_url || '');
      setStatus(position.status as AnalysisStatus);
      setAppliedAt(
        position.applied_at ? position.applied_at.split('T')[0] : ''
      );
      setInterviewRound(position.interview_round || '');
      setInterviewDate(
        position.interview_date ? position.interview_date.split('T')[0] : ''
      );
      setNote(position.note || '');
      setError('');
    }
  }, [open, position]);

  if (!open) return null;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    if (!companyName.trim() || !jobTitle.trim()) {
      setError('公司名称和岗位名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/protected/analyses/${position.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          job_title: jobTitle.trim(),
          job_url: jobUrl.trim() || null,
          status,
          applied_at: appliedAt ? new Date(appliedAt).toISOString() : null,
          interview_round: interviewRound.trim() || null,
          interview_date: interviewDate
            ? new Date(interviewDate).toISOString()
            : null,
          note: note.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success('岗位信息已更新');
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || '更新失败，请重试');
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
        <h2 className="text-lg font-bold text-zinc-100">编辑岗位信息</h2>
        <p className="text-xs text-zinc-500 mt-1">
          修改岗位的各项信息并保存
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

        {/* 面试轮次 + 面试日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              面试轮次
            </label>
            <select
              value={interviewRound}
              onChange={(e) => setInterviewRound(e.target.value)}
              className={inputClass}
            >
              {INTERVIEW_ROUNDS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              面试日期
            </label>
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
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

        {/* 创建时间（只读） */}
        <div className="px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/[0.04] text-xs text-zinc-500">
          <span className="text-zinc-600">创建时间：</span>
          {formatDateTime(position.created_at)}
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
              保存中…
            </span>
          ) : (
            '保存修改'
          )}
        </button>
      </div>
    </Modal>
  );
}
