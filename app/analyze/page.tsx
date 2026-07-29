'use client';


import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';

export default function AnalyzePage() {
  const router = useRouter();

  // JD
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdPreviewUrl, setJdPreviewUrl] = useState<string | null>(null);
  const jdFileRef = useRef<HTMLInputElement>(null);

  // Resume
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // Meta
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal
  const [previewModal, setPreviewModal] = useState<{
    type: 'image' | 'pdf';
    title: string;
    src?: string;
    fileName?: string;
  } | null>(null);

  // JD 截图上传 — 只存 File + 生成缩略图，不立即 OCR
  const handleJdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 生成预览
    const previewUrl = URL.createObjectURL(file);
    setJdFile(file);
    setJdPreviewUrl(previewUrl);

    toast.success('截图已就绪，将在分析时自动识别');
    if (jdFileRef.current) jdFileRef.current.value = '';
  };

  // Resume PDF/TXT 上传 — 只存 File，不立即解析
  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);

    toast.success('简历文件已就绪，将在分析时自动识别');
    if (resumeFileRef.current) resumeFileRef.current.value = '';
  };

  // 清除 JD 上传
  const clearJdUpload = () => {
    if (jdPreviewUrl) URL.revokeObjectURL(jdPreviewUrl);
    setJdFile(null);
    setJdPreviewUrl(null);
  };

  // 清除 Resume 上传
  const clearResumeUpload = () => {
    setResumeFile(null);
  };

  const handleSubmit = async () => {
    // 校验：有文件上传 OR 有文本内容（≥20字符）
    const hasJd = jdFile || jdText.trim().length >= 20;
    const hasResume = resumeFile || resumeText.trim().length >= 20;

    if (!hasJd || !hasResume) {
      if (!jdFile && !resumeFile) {
        toast.error('请上传文件或填写 JD/简历内容（至少20字符）');
      } else if (!hasJd) {
        toast.error('请上传 JD 截图或填写 JD 文本（至少20字符）');
      } else {
        toast.error('请上传简历文件或填写简历文本（至少20字符）');
      }
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      // 有文件上传 → 用 FormData
      if (jdFile || resumeFile) {
        const formData = new FormData();
        if (jdFile) formData.append('jdFile', jdFile);
        if (resumeFile) formData.append('resumeFile', resumeFile);
        if (jdText.trim()) formData.append('jdText', jdText.trim());
        if (resumeText.trim()) formData.append('resumeText', resumeText.trim());
        if (companyName.trim()) formData.append('companyName', companyName.trim());
        if (jobTitle.trim()) formData.append('jobTitle', jobTitle.trim());

        res = await fetch('/api/protected/analyze', {
          method: 'POST',
          body: formData,
        });
      } else {
        // 纯文本 → JSON
        res = await fetch('/api/protected/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jdText: jdText.trim(),
            resumeText: resumeText.trim(),
            companyName: companyName.trim() || null,
            jobTitle: jobTitle.trim() || null,
          }),
        });
      }

      const data = await res.json();

      if (res.ok && data.analysisId) {
        toast.success('分析任务已提交');
        router.push(`/analyze/processing?analysisId=${data.analysisId}`);
      } else {
        toast.error(data.error || '请求失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-50 mb-3">开始岗位匹配分析</h1>
          <p className="text-zinc-400">上传 JD 截图或粘贴文本，上传简历 PDF，AI 自动完成匹配评估</p>
        </div>

        <div className="space-y-6">
          {/* 可选：公司和岗位 */}
          <GlassCard className="p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">📌 岗位基本信息（可选）</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="公司名称，如：字节跳动"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm"
              />
              <input
                type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                placeholder="岗位名称，如：后端开发工程师"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm"
              />
            </div>
          </GlassCard>

          {/* JD 输入 */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300">📋 职位描述（JD）</h2>
              <div className="flex items-center gap-3">
                {jdText.length > 0 && (
                  <span className="text-xs text-zinc-500">{jdText.length} 字符</span>
                )}
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/[0.08] hover:bg-zinc-700 cursor-pointer transition-colors">
                  <span>📷 截图上传</span>
                  <input ref={jdFileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleJdImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* JD 缩略图 */}
            {jdFile && jdPreviewUrl && (
              <div className="mb-3 flex items-center gap-3 p-2 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                <div
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all group"
                  onClick={() => setPreviewModal({ type: 'image', title: jdFile.name, src: jdPreviewUrl })}
                >
                  <img src={jdPreviewUrl} alt={jdFile.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-lg transition-opacity">🔍</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate" title={jdFile.name}>{jdFile.name}</p>
                  <p className="text-xs text-zinc-500">文件已就绪，将在分析时自动识别</p>
                </div>
                <button
                  onClick={clearJdUpload}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="粘贴 JD 文本，或上传截图后直接开始分析…"
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm resize-y min-h-[160px]"
            />
          </GlassCard>

          {/* 简历输入 */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300">📄 简历</h2>
              <div className="flex items-center gap-3">
                {resumeText.length > 0 && (
                  <span className="text-xs text-zinc-500">{resumeText.length} 字符</span>
                )}
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/[0.08] hover:bg-zinc-700 cursor-pointer transition-colors">
                  <span>📎 PDF 上传</span>
                  <input ref={resumeFileRef} type="file" accept=".pdf,.txt" onChange={handleResumeFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* 简历文件缩略图 */}
            {resumeFile && (
              <div className="mb-3 flex items-center gap-3 p-2 rounded-xl bg-zinc-800/50 border border-white/[0.06]">
                <div
                  className="w-16 h-16 rounded-lg bg-zinc-700 border border-white/[0.08] flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all"
                  onClick={() => setPreviewModal({ type: 'pdf', title: resumeFile.name, fileName: resumeFile.name })}
                >
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate" title={resumeFile.name}>{resumeFile.name}</p>
                  <p className="text-xs text-zinc-500">文件已就绪，将在分析时自动识别</p>
                </div>
                <button
                  onClick={clearResumeUpload}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="粘贴简历文本，或上传 PDF 后直接开始分析…"
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand/50 text-sm resize-y min-h-[160px]"
            />
          </GlassCard>

          {/* Submit */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-brand to-brand-dark text-zinc-900 shadow-[0_0_30px_rgba(245,166,35,0.3)] hover:shadow-[0_0_50px_rgba(245,166,35,0.5)] hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                  正在提交…
                </span>
              ) : (
                '开始分析 ⚡'
              )}
            </button>
            <p className="text-xs text-zinc-500 mt-3">
              新用户注册即送 1 次分析，后续 ¥3.9/次
            </p>
          </div>
        </div>
      </div>

      {/* 预览 Modal */}
      {previewModal && (
        <Modal onClose={() => setPreviewModal(null)}>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 truncate">{previewModal.title}</h3>
            {previewModal.type === 'image' && previewModal.src ? (
              <img
                src={previewModal.src}
                alt={previewModal.title}
                className="max-w-full max-h-[60vh] rounded-lg mx-auto"
              />
            ) : (
              <div className="py-8 text-center">
                <span className="text-6xl">📄</span>
                <p className="text-zinc-400 text-sm mt-4">{previewModal.fileName}</p>
                <p className="text-zinc-500 text-xs mt-1">PDF 文件已就绪，将在分析时自动识别</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
