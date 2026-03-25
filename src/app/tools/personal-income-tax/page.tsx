'use client';

import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Calculator,
  CircleHelp,
  Coins,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Users,
  Sparkles,
  Wallet,
  Minus,
  Plus,
  BookOpen,
  FileText,
  BriefcaseBusiness,
  Globe2,
  Info,
} from 'lucide-react';


type TaxPeriod = '2025H2' | '2026';
type InsuranceMode = 'official' | 'custom';
type RegionKey = 'I' | 'II' | 'III' | 'IV';

const REGION_MIN_WAGE: Record<RegionKey, number> = {
  I: 4_960_000,
  II: 4_410_000,
  III: 3_860_000,
  IV: 3_450_000,
};

const PERSONAL_DEDUCTION: Record<TaxPeriod, number> = {
  '2025H2': 11_000_000,
  '2026': 15_500_000,
};

const DEPENDENT_DEDUCTION: Record<TaxPeriod, number> = {
  '2025H2': 4_400_000,
  '2026': 6_200_000,
};

const SOCIAL_BASE_CAP = 46_800_000;

const UNEMPLOYMENT_CAP_BY_REGION: Record<RegionKey, number> = {
  I: REGION_MIN_WAGE.I * 20,
  II: REGION_MIN_WAGE.II * 20,
  III: REGION_MIN_WAGE.III * 20,
  IV: REGION_MIN_WAGE.IV * 20,
};

function getTaxBrackets(period: TaxPeriod) {
  if (period === '2026') {
    return [
      { limit: 10_000_000, rate: 0.05 },
      { limit: 30_000_000, rate: 0.1 },
      { limit: 60_000_000, rate: 0.2 },
      { limit: 100_000_000, rate: 0.3 },
      { limit: Infinity, rate: 0.35 },
    ] as const;
  }

  return [
    { limit: 5_000_000, rate: 0.05 },
    { limit: 10_000_000, rate: 0.1 },
    { limit: 18_000_000, rate: 0.15 },
    { limit: 32_000_000, rate: 0.2 },
    { limit: 52_000_000, rate: 0.25 },
    { limit: 80_000_000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ] as const;
}

function getBracketDisplayRows(period: TaxPeriod) {
  if (period === '2026') {
    return [
      ['Đến 10 triệu', '5%'],
      ['Trên 10 - 30 triệu', '10%'],
      ['Trên 30 - 60 triệu', '20%'],
      ['Trên 60 - 100 triệu', '30%'],
      ['Trên 100 triệu', '35%'],
    ];
  }

  return [
    ['Đến 5 triệu', '5%'],
    ['Trên 5 - 10 triệu', '10%'],
    ['Trên 10 - 18 triệu', '15%'],
    ['Trên 18 - 32 triệu', '20%'],
    ['Trên 32 - 52 triệu', '25%'],
    ['Trên 52 - 80 triệu', '30%'],
    ['Trên 80 triệu', '35%'],
  ];
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function formatMoneyInput(value: string) {
  const num = parseMoneyInput(value);
  return num ? num.toLocaleString('vi-VN') : '';
}

function clampMin(value: number, min: number) {
  return Number.isFinite(value) ? Math.max(value, min) : min;
}

function calculateProgressivePit(
  taxableIncome: number,
  brackets: ReadonlyArray<{ limit: number; rate: number }>,
) {
  if (taxableIncome <= 0) {
    return {
      totalTax: 0,
      rows: [] as Array<{
        from: number;
        to: number | null;
        taxable: number;
        rate: number;
        tax: number;
      }>,
    };
  }

  let remaining = taxableIncome;
  let prevLimit = 0;

  const rows: Array<{
    from: number;
    to: number | null;
    taxable: number;
    rate: number;
    tax: number;
  }> = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const currentCap =
      bracket.limit === Infinity ? Infinity : bracket.limit - prevLimit;

    const taxableAtThisBracket =
      currentCap === Infinity ? remaining : Math.min(remaining, currentCap);

    const tax = taxableAtThisBracket * bracket.rate;

    rows.push({
      from: prevLimit,
      to: bracket.limit === Infinity ? null : bracket.limit,
      taxable: taxableAtThisBracket,
      rate: bracket.rate,
      tax,
    });

    remaining -= taxableAtThisBracket;
    prevLimit = bracket.limit;
  }

  return {
    totalTax: rows.reduce((sum, row) => sum + row.tax, 0),
    rows,
  };
}

function getRangeLabel(from: number, to: number | null) {
  if (to === null) return `Trên ${formatVnd(from)}`;
  if (from === 0) return `Đến ${formatVnd(to)}`;
  return `Trên ${formatVnd(from)} - ${formatVnd(to)}`;
}

function SummaryItem({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'green' | 'blue' | 'red' | 'dark';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'blue'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : tone === 'red'
      ? 'bg-rose-50 text-rose-700 border-rose-100'
      : tone === 'dark'
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className={`text-sm ${tone === 'dark' ? 'text-slate-200' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold md:text-xl">{value}</p>
    </div>
  );
}

export default function PersonalIncomeTaxPage() {
  const [period, setPeriod] = useState<TaxPeriod>('2026');
  const [grossInput, setGrossInput] = useState('10000000');
  const [insuranceMode, setInsuranceMode] = useState<InsuranceMode>('official');
  const [customInsuranceBaseInput, setCustomInsuranceBaseInput] = useState('');
  const [region, setRegion] = useState<RegionKey>('I');
  const [dependents, setDependents] = useState(0);

  const grossIncome = useMemo(() => parseMoneyInput(grossInput), [grossInput]);

  const insuranceBaseRaw = useMemo(() => {
    if (insuranceMode === 'custom') {
      return parseMoneyInput(customInsuranceBaseInput);
    }
    return grossIncome;
  }, [insuranceMode, customInsuranceBaseInput, grossIncome]);

  const insuranceBase = useMemo(() => clampMin(insuranceBaseRaw, 0), [insuranceBaseRaw]);
  const activeBrackets = useMemo(() => getTaxBrackets(period), [period]);
  const bracketRows = useMemo(() => getBracketDisplayRows(period), [period]);

  const result = useMemo(() => {
    const personalDeduction = PERSONAL_DEDUCTION[period];
    const dependentDeduction = DEPENDENT_DEDUCTION[period] * dependents;

    const socialInsuranceBase = Math.min(insuranceBase, SOCIAL_BASE_CAP);
    const unemploymentBase = Math.min(insuranceBase, UNEMPLOYMENT_CAP_BY_REGION[region]);

    const bhxh = socialInsuranceBase * 0.08;
    const bhyt = socialInsuranceBase * 0.015;
    const bhtn = unemploymentBase * 0.01;

    const totalInsurance = bhxh + bhyt + bhtn;

    const taxableBeforeFamily = Math.max(grossIncome - totalInsurance, 0);

    const taxableIncome = Math.max(
      taxableBeforeFamily - personalDeduction - dependentDeduction,
      0,
    );

    const pitBreakdown = calculateProgressivePit(taxableIncome, activeBrackets);
    const pit = pitBreakdown.totalTax;
    const netIncome = grossIncome - totalInsurance - pit;

    return {
      personalDeduction,
      dependentDeduction,
      bhxh,
      bhyt,
      bhtn,
      totalInsurance,
      taxableBeforeFamily,
      taxableIncome,
      pit,
      netIncome,
      pitRows: pitBreakdown.rows,
    };
  }, [period, dependents, insuranceBase, region, grossIncome, activeBrackets]);

  const quickGrossOptions = [10_000_000, 15_000_000, 20_000_000, 30_000_000];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      

      <main className="px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <section className="border-b border-slate-200 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-5 py-8 text-white md:px-8 md:py-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                    <Sparkles size={16} />
                    Công cụ hỗ trợ ứng viên
                  </div>

                  <div className="mt-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <Calculator size={30} />
                    </div>

                    <div>
                      <h1 className="text-3xl font-black leading-tight md:text-4xl">
                        Tính thuế thu nhập cá nhân
                      </h1>
                      <p className="mt-3 text-sm leading-7 text-emerald-50 md:text-base">
                        Ước tính lương NET từ lương GROSS, đồng thời giải thích rõ cách tính,
                        mức giảm trừ, biểu thuế và những lưu ý quan trọng để người dùng dễ hiểu hơn.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
                  <div className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur">
                    <p className="text-sm text-emerald-50">Gross</p>
                    <p className="mt-1 text-lg font-extrabold">{formatVnd(grossIncome)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur">
                    <p className="text-sm text-emerald-50">Thuế tạm tính</p>
                    <p className="mt-1 text-lg font-extrabold">{formatVnd(result.pit)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white shadow-lg">
                    <p className="text-sm text-slate-300">NET nhận được</p>
                    <p className="mt-1 text-lg font-extrabold">{formatVnd(result.netIncome)}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="px-4 py-5 md:px-8 md:py-8">
              <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                      Chọn mốc áp dụng
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Hệ thống đang hỗ trợ 2 giai đoạn để bạn so sánh nhanh cách tính.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPeriod('2025H2')}
                      className={`rounded-2xl border px-5 py-3 text-sm font-extrabold transition ${
                        period === '2025H2'
                          ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                          : 'border-transparent bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      01/07/2025 - 31/12/2025
                    </button>

                    <button
                      type="button"
                      onClick={() => setPeriod('2026')}
                      className={`rounded-2xl border px-5 py-3 text-sm font-extrabold transition ${
                        period === '2026'
                          ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                          : 'border-transparent bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      Từ 01/01/2026
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <SummaryItem
                    label="Giảm trừ bản thân"
                    value={formatVnd(PERSONAL_DEDUCTION[period])}
                    tone="green"
                  />
                  <SummaryItem
                    label="Người phụ thuộc / người"
                    value={formatVnd(DEPENDENT_DEDUCTION[period])}
                    tone="green"
                  />
                  <SummaryItem
                    label={`Lương tối thiểu vùng ${region}`}
                    value={formatVnd(REGION_MIN_WAGE[region])}
                    tone="blue"
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700">
                  {period === '2026' ? (
                    <p>
                      Từ 01/01/2026, mức giảm trừ gia cảnh cho bản thân là{' '}
                      <span className="font-bold">15,5 triệu/tháng</span>, cho mỗi người phụ thuộc là{' '}
                      <span className="font-bold">6,2 triệu/tháng</span>; đồng thời biểu thuế
                      lũy tiến rút còn <span className="font-bold">5 bậc</span>.
                    </p>
                  ) : (
                    <p>
                      Giai đoạn 01/07/2025 - 31/12/2025 vẫn áp dụng mức giảm trừ bản thân{' '}
                      <span className="font-bold">11 triệu/tháng</span> và người phụ thuộc{' '}
                      <span className="font-bold">4,4 triệu/tháng</span>.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <BadgeDollarSign size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Thông tin đầu vào</h2>
                        <p className="text-sm text-slate-500">
                          Nhập dữ liệu cơ bản để hệ thống tính lương NET cho bạn.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Thu nhập Gross mỗi tháng
                        </label>

                        <div className="flex overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition focus-within:border-emerald-500">
                          <div className="flex items-center px-4 text-emerald-600">
                            <Coins size={18} />
                          </div>

                          <input
                            inputMode="numeric"
                            value={formatMoneyInput(grossInput)}
                            onChange={(e) => setGrossInput(e.target.value)}
                            placeholder="Ví dụ: 10,000,000"
                            className="w-full bg-transparent px-3 py-4 text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                          />

                          <div className="flex items-center border-l border-slate-200 px-4 text-sm font-bold text-slate-500">
                            VND
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {quickGrossOptions.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setGrossInput(String(amount))}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              {amount.toLocaleString('vi-VN')}đ
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Mức lương đóng bảo hiểm
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label
                            className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              insuranceMode === 'official'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={insuranceMode === 'official'}
                                onChange={() => setInsuranceMode('official')}
                              />
                              Trên lương chính thức
                            </div>
                          </label>

                          <label
                            className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              insuranceMode === 'custom'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={insuranceMode === 'custom'}
                                onChange={() => setInsuranceMode('custom')}
                              />
                              Nhập mức khác
                            </div>
                          </label>
                        </div>

                        <div className="mt-3 flex overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition focus-within:border-emerald-500">
                          <div className="flex items-center px-4 text-emerald-600">
                            <ShieldCheck size={18} />
                          </div>

                          <input
                            inputMode="numeric"
                            value={
                              insuranceMode === 'official'
                                ? grossIncome
                                  ? grossIncome.toLocaleString('vi-VN')
                                  : ''
                                : formatMoneyInput(customInsuranceBaseInput)
                            }
                            onChange={(e) => {
                              if (insuranceMode === 'custom') {
                                setCustomInsuranceBaseInput(e.target.value);
                              }
                            }}
                            disabled={insuranceMode === 'official'}
                            placeholder="Nhập mức lương đóng BH"
                            className="w-full bg-transparent px-3 py-4 text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                          />

                          <div className="flex items-center border-l border-slate-200 px-4 text-sm font-bold text-slate-500">
                            VND
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Vùng tính BHTN
                        </label>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {(['I', 'II', 'III', 'IV'] as RegionKey[]).map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setRegion(item)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                                region === item
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40'
                              }`}
                            >
                              Vùng {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Số người phụ thuộc
                        </label>

                        <div className="flex w-full max-w-sm items-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setDependents((prev) => Math.max(0, prev - 1))}
                            className="flex h-14 w-14 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          >
                            <Minus size={18} />
                          </button>

                          <div className="flex flex-1 items-center justify-center gap-3 px-4">
                            <Users size={18} className="text-emerald-600" />
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={dependents}
                              onChange={(e) =>
                                setDependents(Math.max(0, Number(e.target.value || 0)))
                              }
                              className="w-20 bg-transparent text-center text-lg font-extrabold text-slate-900 outline-none"
                            />
                            <span className="text-sm font-bold text-slate-500">người</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDependents((prev) => Math.min(50, prev + 1))}
                            className="flex h-14 w-14 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <ReceiptText size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Chi tiết tính toán</h2>
                        <p className="text-sm text-slate-500">
                          Từng khoản được hiển thị rõ ràng để người dùng dễ kiểm tra.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <SummaryItem label="Thu nhập Gross" value={formatVnd(grossIncome)} />
                        <SummaryItem
                          label="Tổng bảo hiểm"
                          value={`- ${formatVnd(result.totalInsurance)}`}
                          tone="red"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <SummaryItem label="BHXH (8%)" value={`- ${formatVnd(result.bhxh)}`} />
                        <SummaryItem label="BHYT (1.5%)" value={`- ${formatVnd(result.bhyt)}`} />
                        <SummaryItem label="BHTN (1%)" value={`- ${formatVnd(result.bhtn)}`} />
                      </div>

                      <SummaryItem
                        label="Thu nhập sau bảo hiểm"
                        value={formatVnd(result.taxableBeforeFamily)}
                        tone="blue"
                      />
                      <SummaryItem
                        label="Giảm trừ bản thân"
                        value={`- ${formatVnd(result.personalDeduction)}`}
                        tone="green"
                      />
                      <SummaryItem
                        label="Giảm trừ người phụ thuộc"
                        value={`- ${formatVnd(result.dependentDeduction)}`}
                        tone="green"
                      />
                      <SummaryItem
                        label="Thu nhập tính thuế"
                        value={formatVnd(result.taxableIncome)}
                        tone="blue"
                      />
                      <SummaryItem
                        label="Thuế TNCN tạm tính"
                        value={`- ${formatVnd(result.pit)}`}
                        tone="red"
                      />
                      <SummaryItem
                        label="Lương NET ước tính"
                        value={formatVnd(result.netIncome)}
                        tone="dark"
                      />
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Kết quả nổi bật</h2>
                        <p className="text-sm text-slate-500">
                          Đây là phần người dùng sẽ nhìn thấy nhanh nhất.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-700 p-5 text-white shadow-xl">
                      <p className="text-sm font-semibold text-emerald-100">
                        Lương thực nhận dự kiến
                      </p>
                      <p className="mt-2 text-3xl font-black md:text-4xl">
                        {formatVnd(result.netIncome)}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                          <p className="text-xs text-slate-200">Thuế TNCN</p>
                          <p className="mt-1 text-lg font-extrabold">{formatVnd(result.pit)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                          <p className="text-xs text-slate-200">Tổng bảo hiểm</p>
                          <p className="mt-1 text-lg font-extrabold">
                            {formatVnd(result.totalInsurance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Landmark size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">Biểu thuế lũy tiến</h2>
                        <p className="text-sm text-slate-500">
                          Bảng tham chiếu nhanh theo từng bậc thuế.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-[1.3fr_0.7fr] bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-700">
                        <span>Bậc thu nhập</span>
                        <span>Thuế suất</span>
                      </div>

                      {bracketRows.map(([label, rate]) => (
                        <div
                          key={label}
                          className="grid grid-cols-[1.3fr_0.7fr] border-t border-slate-100 px-4 py-3 text-sm text-slate-700"
                        >
                          <span>{label}</span>
                          <span className="font-bold">{rate}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5">
                      <h3 className="mb-3 text-sm font-extrabold text-slate-700">
                        Phân bổ thuế theo từng bậc
                      </h3>

                      {result.pitRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          Hiện chưa phát sinh thu nhập tính thuế.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {result.pitRows.map((row, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-extrabold text-slate-800">
                                    Bậc {idx + 1} · {Math.round(row.rate * 100)}%
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {getRangeLabel(row.from, row.to)}
                                  </p>
                                </div>

                                <div className="text-left sm:text-right">
                                  <p className="text-xs text-slate-500">Thuế của bậc này</p>
                                  <p className="text-lg font-black text-rose-600">
                                    {formatVnd(row.tax)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm text-slate-600">
                                Phần thu nhập chịu thuế ở bậc này:{' '}
                                <span className="font-bold text-slate-900">
                                  {formatVnd(row.taxable)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Thuế thu nhập cá nhân là gì?
                      </h2>
                      <p className="text-sm text-slate-500">
                        Phần giải thích để người dùng mới có thể hiểu ngay trên trang.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm leading-7 text-slate-700 md:text-[15px]">
                    <p>
                      Thuế thu nhập cá nhân là khoản tiền người có thu nhập phải trích từ lương
                      và các nguồn thu khác để nộp vào ngân sách nhà nước sau khi đã được giảm trừ.
                    </p>
                    <p>
                      Thuế thu nhập cá nhân không áp dụng giống nhau cho tất cả mọi người mà phụ
                      thuộc vào loại đối tượng, thu nhập chịu thuế và các khoản giảm trừ.
                    </p>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                      <p className="font-bold text-emerald-800">Vì sao cần đóng thuế TNCN?</p>
                      <ul className="mt-2 space-y-2 text-slate-700">
                        <li>• Góp phần vào ngân sách nhà nước.</li>
                        <li>• Hỗ trợ phân phối lại thu nhập và thu hẹp chênh lệch xã hội.</li>
                        <li>• Tạo cơ sở pháp lý minh bạch cho thu nhập của người lao động.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Công thức tính thuế thu nhập cá nhân
                      </h2>
                      <p className="text-sm text-slate-500">
                        Áp dụng cho cá nhân cư trú ký hợp đồng lao động từ 03 tháng trở lên.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-800">
                        Công thức tổng quát
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        <span className="font-bold">Thuế TNCN phải nộp</span> ={' '}
                        <span className="font-bold">Thu nhập tính thuế</span> ×{' '}
                        <span className="font-bold">Thuế suất</span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-800">
                        Diễn giải
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        <span className="font-bold">Thu nhập tính thuế</span> = Thu nhập chịu thuế
                        − Các khoản giảm trừ
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="font-bold text-emerald-800">Mức giảm trừ 2026</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
                        <li>• Bản thân người nộp thuế: <span className="font-bold">15,5 triệu/tháng</span></li>
                        <li>• Mỗi người phụ thuộc: <span className="font-bold">6,2 triệu/tháng</span></li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <p className="font-bold text-blue-800">Biểu thuế 2026</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
                        <li>• Đến 10 triệu: 5%</li>
                        <li>• Trên 10 - 30 triệu: 10%</li>
                        <li>• Trên 30 - 60 triệu: 20%</li>
                        <li>• Trên 60 - 100 triệu: 30%</li>
                        <li>• Trên 100 triệu: 35%</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <BriefcaseBusiness size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Đối tượng nộp thuế
                      </h2>
                      <p className="text-sm text-slate-500">
                        Chia thành cá nhân cư trú và cá nhân không cư trú.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-bold text-slate-900">Cá nhân cư trú</p>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                        <li>• Có mặt tại Việt Nam từ 183 ngày trở lên trong năm hoặc 12 tháng liên tục.</li>
                        <li>• Hoặc có nơi ở thường xuyên tại Việt Nam.</li>
                        <li>• Thuế thường tính theo biểu lũy tiến từng phần.</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-bold text-slate-900">Cá nhân không cư trú</p>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                        <li>• Không đáp ứng điều kiện của cá nhân cư trú.</li>
                        <li>• Không được giảm trừ gia cảnh.</li>
                        <li>• Thuế từ tiền lương, tiền công áp dụng mức <span className="font-bold">20%</span> trên thu nhập chịu thuế.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <Globe2 size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Các trường hợp thường gặp
                      </h2>
                      <p className="text-sm text-slate-500">
                        Hiển thị ngắn gọn để người dùng dễ tra cứu.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900">
                        HĐLĐ dưới 03 tháng hoặc không ký HĐLĐ
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Thuế TNCN phải nộp = <span className="font-bold">10% × tổng thu nhập trước khi trả</span>.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900">Thử việc</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Nếu không ký hợp đồng lao động hoặc hợp đồng dưới 03 tháng và mức chi trả từ
                        <span className="font-bold"> 2.000.000 đồng/lần trở lên</span> thì thường bị
                        khấu trừ <span className="font-bold">10%</span> trước khi trả lương.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900">Làm thêm giờ / tăng ca</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Phần thu nhập trả cao hơn so với tiền lương làm việc trong giờ theo quy định
                        có thể được miễn thuế; không phải toàn bộ tiền tăng ca đều miễn.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Info size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Phụ cấp, trợ cấp không tính thuế
                      </h2>
                      <p className="text-sm text-slate-600">
                        Chỉ nên hiển thị dạng tóm tắt để tránh trang quá dài.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/80 px-4 py-4 text-sm leading-7 text-slate-700">
                      • Trợ cấp người có công, kháng chiến, bảo trợ xã hội
                      <br />
                      • Phụ cấp quốc phòng, an ninh
                      <br />
                      • Phụ cấp độc hại, nguy hiểm
                      <br />
                      • Phụ cấp khu vực, phụ cấp thu hút
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-4 text-sm leading-7 text-slate-700">
                      • Trợ cấp tai nạn lao động, thất nghiệp, thai sản
                      <br />
                      • Trợ cấp thôi việc, mất việc làm
                      <br />
                      • Trợ cấp chuyển vùng một lần
                      <br />
                      • Một số phụ cấp đặc thù ngành nghề theo quy định
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <CircleHelp size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Lưu ý</h2>
                      <p className="text-sm text-slate-600">
                        Giúp người dùng hiểu rõ giới hạn của công cụ.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm leading-7 text-slate-700">
                    <li>
                      • Đây là công cụ <span className="font-bold">ước tính</span> cho người lao động nhận lương theo tháng.
                    </li>
                    <li>
                      • Chưa bao gồm toàn bộ trường hợp đặc thù như từ thiện, nhiều nguồn thu nhập, miễn giảm riêng hoặc quyết toán cuối năm.
                    </li>
                    <li>
                      • Bảo hiểm đang tính theo tỷ lệ người lao động thường đóng: <span className="font-bold">BHXH 8% + BHYT 1.5% + BHTN 1%</span>.
                    </li>
                    <li>
                      • Khi dùng cho hồ sơ chính thức, nên đối chiếu thêm bảng lương thực tế và quy định nội bộ doanh nghiệp.
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}