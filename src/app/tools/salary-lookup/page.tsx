'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RotateCcw,
  ArrowRightLeft,
  Calculator,
  Wallet,
  Receipt,
  Shield,
  Users,
  Sparkles,
  Info,
} from 'lucide-react';

type RegionKey = 'I' | 'II' | 'III' | 'IV';
type InsuranceMode = 'official' | 'custom';
type CalcMode = 'grossToNet' | 'netToGross';
type TaxPeriod = '2025H2' | '2026';

const BASE_SALARY = 2_340_000;

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

const TAX_BRACKETS_2026 = [
  { limit: 10_000_000, rate: 0.05 },
  { limit: 30_000_000, rate: 0.1 },
  { limit: 60_000_000, rate: 0.2 },
  { limit: 100_000_000, rate: 0.3 },
  { limit: Infinity, rate: 0.35 },
] as const;

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

function formatVnd(value: number) {
  return `${formatNumber(value)}đ`;
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function formatMoneyInput(value: string) {
  const num = parseMoneyInput(value);
  return num ? num.toLocaleString('vi-VN') : '';
}

function calculateProgressiveTaxRows(taxableIncome: number) {
  if (taxableIncome <= 0) {
    return TAX_BRACKETS_2026.map((bracket, index) => ({
      index: index + 1,
      label:
        bracket.limit === 10_000_000
          ? 'Đến 10 triệu VND'
          : bracket.limit === 30_000_000
          ? 'Trên 10 triệu đến 30 triệu VND'
          : bracket.limit === 60_000_000
          ? 'Trên 30 triệu đến 60 triệu VND'
          : bracket.limit === 100_000_000
          ? 'Trên 60 triệu đến 100 triệu VND'
          : 'Trên 100 triệu VND',
      rate: bracket.rate,
      taxablePart: 0,
      tax: 0,
    }));
  }

  let remaining = taxableIncome;
  let previousLimit = 0;

  return TAX_BRACKETS_2026.map((bracket, index) => {
    const bandAmount =
      bracket.limit === Infinity ? Infinity : bracket.limit - previousLimit;

    const taxablePart =
      remaining <= 0
        ? 0
        : bandAmount === Infinity
        ? remaining
        : Math.min(remaining, bandAmount);

    const tax = taxablePart * bracket.rate;

    const row = {
      index: index + 1,
      label:
        bracket.limit === 10_000_000
          ? 'Đến 10 triệu VND'
          : bracket.limit === 30_000_000
          ? 'Trên 10 triệu đến 30 triệu VND'
          : bracket.limit === 60_000_000
          ? 'Trên 30 triệu đến 60 triệu VND'
          : bracket.limit === 100_000_000
          ? 'Trên 60 triệu đến 100 triệu VND'
          : 'Trên 100 triệu VND',
      rate: bracket.rate,
      taxablePart,
      tax,
    };

    remaining -= taxablePart;
    previousLimit = bracket.limit;
    return row;
  });
}

function calculateProgressivePit(taxableIncome: number) {
  return calculateProgressiveTaxRows(taxableIncome).reduce(
    (sum, row) => sum + row.tax,
    0,
  );
}

function computeGrossToNet({
  grossIncome,
  dependents,
  insuranceMode,
  customInsuranceBase,
  region,
  period,
}: {
  grossIncome: number;
  dependents: number;
  insuranceMode: InsuranceMode;
  customInsuranceBase: number;
  region: RegionKey;
  period: TaxPeriod;
}) {
  const personalDeduction = PERSONAL_DEDUCTION[period];
  const dependentDeductionAmount = DEPENDENT_DEDUCTION[period] * dependents;

  const insuranceBase =
    insuranceMode === 'custom' ? customInsuranceBase : grossIncome;

  const cappedSocialBase = Math.min(insuranceBase, SOCIAL_BASE_CAP);
  const unemploymentCap = REGION_MIN_WAGE[region] * 20;
  const unemploymentBase = Math.min(insuranceBase, unemploymentCap);

  const employeeBhxh = cappedSocialBase * 0.08;
  const employeeBhyt = cappedSocialBase * 0.015;
  const employeeBhtn = unemploymentBase * 0.01;
  const employeeInsuranceTotal = employeeBhxh + employeeBhyt + employeeBhtn;

  const incomeBeforeTax = Math.max(grossIncome - employeeInsuranceTotal, 0);
  const taxableIncome = Math.max(
    incomeBeforeTax - personalDeduction - dependentDeductionAmount,
    0,
  );
  const pit = calculateProgressivePit(taxableIncome);
  const netIncome = grossIncome - employeeInsuranceTotal - pit;

  const employerBhxh = cappedSocialBase * 0.175;
  const employerBhyt = cappedSocialBase * 0.03;
  const employerBhtn = unemploymentBase * 0.01;
  const employerAccident = cappedSocialBase * 0.005;
  const employerTotal =
    employerBhxh + employerBhyt + employerBhtn + employerAccident;

  return {
    grossIncome,
    netIncome,
    employeeBhxh,
    employeeBhyt,
    employeeBhtn,
    employeeInsuranceTotal,
    incomeBeforeTax,
    taxableIncome,
    pit,
    personalDeduction,
    dependentDeductionAmount,
    employerBhxh,
    employerBhyt,
    employerBhtn,
    employerAccident,
    employerTotal,
    totalCostToCompany: grossIncome + employerTotal,
    taxRows: calculateProgressiveTaxRows(taxableIncome),
  };
}

function solveNetToGross(params: {
  targetNet: number;
  dependents: number;
  insuranceMode: InsuranceMode;
  customInsuranceBase: number;
  region: RegionKey;
  period: TaxPeriod;
}) {
  const { targetNet } = params;

  let low = 0;
  let high = Math.max(targetNet * 2, 20_000_000);

  while (
    computeGrossToNet({
      grossIncome: high,
      dependents: params.dependents,
      insuranceMode: params.insuranceMode,
      customInsuranceBase:
        params.insuranceMode === 'custom' ? params.customInsuranceBase : high,
      region: params.region,
      period: params.period,
    }).netIncome < targetNet
  ) {
    high *= 1.5;
    if (high > 1_000_000_000) break;
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const result = computeGrossToNet({
      grossIncome: mid,
      dependents: params.dependents,
      insuranceMode: params.insuranceMode,
      customInsuranceBase:
        params.insuranceMode === 'custom' ? params.customInsuranceBase : mid,
      region: params.region,
      period: params.period,
    });

    if (result.netIncome < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return computeGrossToNet({
    grossIncome: high,
    dependents: params.dependents,
    insuranceMode: params.insuranceMode,
    customInsuranceBase:
      params.insuranceMode === 'custom' ? params.customInsuranceBase : high,
    region: params.region,
    period: params.period,
  });
}

const FAQS = [
  {
    q: 'Lương Gross là gì?',
    a: 'Lương Gross là tổng thu nhập trước khi trừ bảo hiểm bắt buộc và thuế thu nhập cá nhân.',
  },
  {
    q: 'Lương Net là gì?',
    a: 'Lương Net là số tiền thực nhận sau khi đã trừ các khoản phải đóng.',
  },
  {
    q: 'Công thức tính lương Gross là gì?',
    a: 'Lương Gross là tổng thu nhập trước khi trừ các khoản bảo hiểm và thuế. Trong thực tế, khi quy đổi từ Net sang Gross, hệ thống sẽ tính ngược dựa trên bảo hiểm, thuế TNCN và các khoản khấu trừ tương ứng.',
  },
  {
    q: 'Công thức tính lương Net là gì?',
    a: 'Lương Net là số tiền người lao động thực nhận sau khi trừ bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp và thuế thu nhập cá nhân.',
  },
  {
    q: 'Cách tính lương Gross sang Net?',
    a: 'Sau khi trừ đi các khoản phí và thuế trên lương Gross, ta sẽ thu được số tiền lương Net. Công thức chung để tính lương Gross sang Net là:\n\nLương Net = Lương Gross - (Thuế thu nhập cá nhân + Bảo hiểm xã hội + Bảo hiểm y tế + Bảo hiểm thất nghiệp + Các khoản khấu trừ khác)',
  },
  {
    q: 'Cách quy đổi lương Net sang Gross?',
    a: 'Để quy đổi lương Net sang lương Gross, ta cần tính toán lại các khoản phí và thuế đã bị trừ đi từ lương Gross. Công thức quy đổi từ lương Net sang Gross như sau:\n\nLương Gross = Lương Net + Thuế thu nhập cá nhân + Bảo hiểm xã hội + Bảo hiểm y tế + Bảo hiểm thất nghiệp + Các khoản chi phí khác',
  },
  {
    q: 'Lương Net có bao gồm thuế thu nhập cá nhân không?',
    a: 'Có. Lương Net là số tiền còn lại sau khi đã trừ thuế thu nhập cá nhân và các khoản bảo hiểm bắt buộc.',
  },
  {
    q: 'Nên deal lương Gross hay Net?',
    a: 'Bạn nên deal lương Gross để nắm rõ về các khoản phải đóng hằng tháng như: BHXH, BHYT, BHTN, thuế TNCN và quỹ công đoàn (nếu có). Tuy nhiên cũng cần hiểu rằng, dù bạn đàm phán với nhà tuyển dụng bằng loại lương nào thì nhà tuyển dụng cũng sẽ tính toán để số tiền phải trả cho bạn tương đương nhau.',
  },
];

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const parts = answer.split('\n\n');
  const normalText = parts[0] ?? '';
  const formulaText = parts[1] ?? '';

  return (
    <div className="rounded-2xl border border-slate-300 bg-white px-5 py-1 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-base font-extrabold text-slate-900 md:text-lg">
          {question}
        </span>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open ? (
        <div className="pb-5">
          <p className="whitespace-pre-line text-[15px] leading-8 text-slate-800">
            {normalText}
          </p>

          {formulaText ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-base font-extrabold leading-8 text-emerald-700 md:text-lg">
              {formulaText}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TableCell({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
          ? 'text-center'
          : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  );
}

function TableHeadCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={`bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-900 ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
          ? 'text-center'
          : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  tone = 'green',
}: {
  label: string;
  value: string;
  tone?: 'green' | 'blue' | 'slate';
}) {
  const cls =
    tone === 'blue'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : tone === 'slate'
      ? 'border-slate-300 bg-slate-50 text-slate-900'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-sm font-bold opacity-100">{label}</p>
      <p className="mt-1 text-xl font-black md:text-2xl">{value}</p>
    </div>
  );
}

function SelectPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
        active
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'border border-slate-300 bg-white text-slate-800 hover:border-emerald-400 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function SalaryLookupPage() {
  const [period, setPeriod] = useState<TaxPeriod>('2026');
  const [mode, setMode] = useState<CalcMode>('grossToNet');
  const [salaryInput, setSalaryInput] = useState('10000000');
  const [dependents, setDependents] = useState(0);
  const [region, setRegion] = useState<RegionKey>('I');
  const [insuranceMode, setInsuranceMode] = useState<InsuranceMode>('official');
  const [customInsuranceBaseInput, setCustomInsuranceBaseInput] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const amount = useMemo(() => parseMoneyInput(salaryInput), [salaryInput]);
  const customInsuranceBase = useMemo(
    () => parseMoneyInput(customInsuranceBaseInput),
    [customInsuranceBaseInput],
  );

  const result = useMemo(() => {
    if (mode === 'grossToNet') {
      return computeGrossToNet({
        grossIncome: amount,
        dependents,
        insuranceMode,
        customInsuranceBase,
        region,
        period,
      });
    }

    return solveNetToGross({
      targetNet: amount,
      dependents,
      insuranceMode,
      customInsuranceBase,
      region,
      period,
    });
  }, [amount, customInsuranceBase, dependents, insuranceMode, mode, period, region]);

  const quickOptions = [10_000_000, 15_000_000, 20_000_000, 30_000_000];

  function resetForm() {
    setPeriod('2026');
    setMode('grossToNet');
    setSalaryInput('10000000');
    setDependents(0);
    setRegion('I');
    setInsuranceMode('official');
    setCustomInsuranceBaseInput('');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-5 py-7 text-white md:px-8 md:py-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white backdrop-blur">
                  <Sparkles size={15} />
                  Công cụ hỗ trợ ứng viên
                </div>

                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                      Tính lương Gross - Net
                    </h1>
                    <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-white/95">
                      Quy đổi Gross sang Net và ngược lại theo chuẩn 2026, có tính
                      bảo hiểm, giảm trừ gia cảnh, thuế thu nhập cá nhân và chi phí
                      doanh nghiệp phải đóng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[380px]">
                <div className="rounded-2xl bg-white/15 px-4 py-4 backdrop-blur">
                  <p className="text-sm font-bold text-white/90">
                    {mode === 'grossToNet' ? 'Bạn nhập Gross' : 'Bạn nhập Net'}
                  </p>
                  <p className="mt-1 text-xl font-black text-white">{formatVnd(amount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white shadow-lg">
                  <p className="text-sm font-bold text-slate-200">
                    {mode === 'grossToNet' ? 'Lương Net thực nhận' : 'Lương Gross cần có'}
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {formatVnd(mode === 'grossToNet' ? result.netIncome : result.grossIncome)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-extrabold text-slate-900">Áp dụng quy định:</span>
                  <SelectPill
                    active={period === '2025H2'}
                    onClick={() => setPeriod('2025H2')}
                  >
                    01/07/2025 - 31/12/2025
                  </SelectPill>
                  <SelectPill
                    active={period === '2026'}
                    onClick={() => setPeriod('2026')}
                  >
                    Từ 01/01/2026
                  </SelectPill>
                </div>

                <div className="space-y-1 text-sm leading-7 text-slate-800">
                  <p>Áp dụng mức lương cơ sở mới nhất: 2.340.000đ.</p>
                  <p>Áp dụng mức lương tối thiểu vùng mới nhất theo vùng bạn chọn.</p>
                  <p>
                    Giảm trừ bản thân: {formatVnd(PERSONAL_DEDUCTION[period])} · Người phụ thuộc:{' '}
                    {formatVnd(DEPENDENT_DEDUCTION[period])}/người.
                  </p>
                  <p className="font-bold text-red-600">
                    Thuế TNCN 2026 áp dụng biểu thuế 5 bậc theo cấu hình hiện tại của công cụ.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <StatCard label="Lương cơ sở" value={formatVnd(BASE_SALARY)} tone="slate" />
              <StatCard
                label="Giảm trừ bản thân"
                value={formatVnd(PERSONAL_DEDUCTION[period])}
                tone="green"
              />
              <StatCard
                label="Người phụ thuộc"
                value={formatVnd(DEPENDENT_DEDUCTION[period])}
                tone="blue"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Thông tin tính lương</h2>
                    <p className="text-sm font-medium text-slate-700">
                      Nhập thông tin để hệ thống quy đổi tự động.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-900">
                      Chế độ tính
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <SelectPill
                        active={mode === 'grossToNet'}
                        onClick={() => setMode('grossToNet')}
                      >
                        GROSS → NET
                      </SelectPill>
                      <SelectPill
                        active={mode === 'netToGross'}
                        onClick={() => setMode('netToGross')}
                      >
                        NET → GROSS
                      </SelectPill>

                      <button
                        type="button"
                        onClick={() =>
                          setMode((prev) =>
                            prev === 'grossToNet' ? 'netToGross' : 'grossToNet',
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 hover:border-emerald-400 hover:text-emerald-700"
                      >
                        <ArrowRightLeft size={16} />
                        Đổi chiều tính
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-900">
                      {mode === 'grossToNet' ? 'Thu nhập Gross' : 'Thu nhập Net'}
                    </label>
                    <div className="flex overflow-hidden rounded-2xl border-2 border-slate-300 bg-white transition focus-within:border-emerald-500">
                      <span className="flex items-center px-4 text-base font-black text-emerald-600">
                        ₫
                      </span>
                      <input
                        inputMode="numeric"
                        value={formatMoneyInput(salaryInput)}
                        onChange={(e) => setSalaryInput(e.target.value)}
                        className="w-full px-3 py-4 text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-500"
                        placeholder="Ví dụ: 10,000,000"
                      />
                      <span className="flex items-center px-4 text-xs font-bold text-slate-600">
                        VND
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSalaryInput(String(item))}
                          className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {formatNumber(item)}đ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-900">
                      Số người phụ thuộc
                    </label>
                    <div className="flex max-w-sm items-center overflow-hidden rounded-2xl border-2 border-slate-300 bg-white">
                      <button
                        type="button"
                        onClick={() => setDependents((prev) => Math.max(0, prev - 1))}
                        className="flex h-14 w-14 items-center justify-center border-r border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Minus size={16} />
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
                        <span className="text-sm font-bold text-slate-700">người</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDependents((prev) => Math.min(50, prev + 1))}
                        className="flex h-14 w-14 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-900">
                      Mức lương đóng bảo hiểm
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <SelectPill
                        active={insuranceMode === 'official'}
                        onClick={() => setInsuranceMode('official')}
                      >
                        Trên lương chính thức
                      </SelectPill>
                      <SelectPill
                        active={insuranceMode === 'custom'}
                        onClick={() => setInsuranceMode('custom')}
                      >
                        Nhập mức khác
                      </SelectPill>
                    </div>

                    <div className="mt-3 flex overflow-hidden rounded-2xl border-2 border-slate-300 bg-white transition focus-within:border-emerald-500">
                      <span className="flex items-center px-4 text-base font-black text-emerald-600">
                        ₫
                      </span>
                      <input
                        inputMode="numeric"
                        value={
                          insuranceMode === 'official'
                            ? amount
                              ? amount.toLocaleString('vi-VN')
                              : ''
                            : formatMoneyInput(customInsuranceBaseInput)
                        }
                        onChange={(e) => {
                          if (insuranceMode === 'custom') {
                            setCustomInsuranceBaseInput(e.target.value);
                          }
                        }}
                        disabled={insuranceMode === 'official'}
                        className="w-full px-3 py-4 text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-500 disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="Nhập mức đóng bảo hiểm"
                      />
                      <span className="flex items-center px-4 text-xs font-bold text-slate-600">
                        VND
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-900">
                      Vùng áp dụng
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(['I', 'II', 'III', 'IV'] as RegionKey[]).map((item) => (
                        <SelectPill
                          key={item}
                          active={region === item}
                          onClick={() => setRegion(item)}
                        >
                          Vùng {item}
                        </SelectPill>
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      Mức lương tối thiểu vùng đang chọn: {formatVnd(REGION_MIN_WAGE[region])}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      <RotateCcw size={16} />
                      Đặt lại
                    </button>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Kết quả nổi bật</h2>
                      <p className="text-sm font-medium text-slate-700">
                        Những thông tin quan trọng nhất cho người dùng.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-700 p-5 text-white shadow-xl">
                    <p className="text-sm font-bold text-emerald-100">
                      {mode === 'grossToNet' ? 'Lương Net thực nhận' : 'Lương Gross cần có'}
                    </p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-white">
                      {formatVnd(mode === 'grossToNet' ? result.netIncome : result.grossIncome)}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/10 px-4 py-3">
                        <p className="text-xs font-bold text-slate-200">Tổng bảo hiểm</p>
                        <p className="mt-1 text-lg font-black text-white">
                          {formatVnd(result.employeeInsuranceTotal)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/10 px-4 py-3">
                        <p className="text-xs font-bold text-slate-200">Thuế TNCN</p>
                        <p className="mt-1 text-lg font-black text-white">{formatVnd(result.pit)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatCard label="Lương Gross" value={formatVnd(result.grossIncome)} tone="slate" />
                    <StatCard label="Lương Net" value={formatVnd(result.netIncome)} tone="green" />
                  </div>
                </section>

                <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Info size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Lưu ý nhanh</h3>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm leading-7 text-slate-800">
                    <li>• Kết quả dùng để tham khảo khi deal lương hoặc so sánh offer.</li>
                    <li>• Công cụ hiện tính theo cấu hình giảm trừ gia cảnh bạn đã chọn.</li>
                    <li>• Một số trường hợp đặc thù chưa được bao quát hết.</li>
                  </ul>
                </section>

                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Chi phí doanh nghiệp</h3>
                      <p className="text-sm font-medium text-slate-700">
                        Tổng số tiền công ty cần chi cho bạn.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-700">Tổng chi phí doanh nghiệp</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {formatVnd(result.totalCostToCompany)}
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-8 space-y-8">
              <section>
                <h2 className="text-base font-extrabold text-emerald-700 md:text-lg">Bảng kết quả</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <TableHeadCell align="center">Lương Gross</TableHeadCell>
                          <TableHeadCell align="center">Bảo hiểm</TableHeadCell>
                          <TableHeadCell align="center">Thuế TNCN</TableHeadCell>
                          <TableHeadCell align="center">Lương Net</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <TableCell align="center">{formatNumber(result.grossIncome)}</TableCell>
                          <TableCell align="center">
                            {formatNumber(result.employeeInsuranceTotal)}
                          </TableCell>
                          <TableCell align="center">{formatNumber(result.pit)}</TableCell>
                          <TableCell align="center">{formatNumber(result.netIncome)}</TableCell>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-extrabold text-emerald-700 md:text-base">
                  Diễn giải chi tiết (VND)
                </h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <tbody>
                        <tr>
                          <TableHeadCell>Lương GROSS</TableHeadCell>
                          <TableCell align="right">{formatNumber(result.grossIncome)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm xã hội (8%)</TableHeadCell>
                          <TableCell align="right">- {formatNumber(result.employeeBhxh)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm y tế (1.5%)</TableHeadCell>
                          <TableCell align="right">- {formatNumber(result.employeeBhyt)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm thất nghiệp (1%)</TableHeadCell>
                          <TableCell align="right">- {formatNumber(result.employeeBhtn)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Thu nhập trước thuế</TableHeadCell>
                          <TableCell align="right">{formatNumber(result.incomeBeforeTax)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Giảm trừ gia cảnh bản thân</TableHeadCell>
                          <TableCell align="right">- {formatNumber(result.personalDeduction)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Giảm trừ người phụ thuộc</TableHeadCell>
                          <TableCell align="right">
                            - {formatNumber(result.dependentDeductionAmount)}
                          </TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Thu nhập tính thuế</TableHeadCell>
                          <TableCell align="right">{formatNumber(result.taxableIncome)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Thuế thu nhập cá nhân</TableHeadCell>
                          <TableCell align="right">- {formatNumber(result.pit)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Lương NET</TableHeadCell>
                          <TableCell align="right" className="font-bold text-emerald-700">
                            {formatNumber(result.netIncome)}
                          </TableCell>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-sm font-medium text-slate-700">
                  Chi tiết thuế thu nhập cá nhân (VND)
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <TableHeadCell align="center">Mức chịu thuế</TableHeadCell>
                          <TableHeadCell align="center">Thuế suất</TableHeadCell>
                          <TableHeadCell align="center">Lương chịu thuế</TableHeadCell>
                          <TableHeadCell align="center">Tiền nộp</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {result.taxRows.map((row) => (
                          <tr key={row.index}>
                            <TableCell>{row.label}</TableCell>
                            <TableCell align="center">{Math.round(row.rate * 100)}%</TableCell>
                            <TableCell align="right">{formatNumber(row.taxablePart)}</TableCell>
                            <TableCell align="right">{formatNumber(row.tax)}</TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-extrabold text-emerald-700 md:text-base">
                  Người sử dụng lao động đóng (VND)
                </h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <tbody>
                        <tr>
                          <TableHeadCell>Lương GROSS</TableHeadCell>
                          <TableCell align="right">{formatNumber(result.grossIncome)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm xã hội (17.5%)</TableHeadCell>
                          <TableCell align="right">+ {formatNumber(result.employerBhxh)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm tai nạn lao động - bệnh nghề nghiệp (0.5%)</TableHeadCell>
                          <TableCell align="right">+ {formatNumber(result.employerAccident)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm y tế (3%)</TableHeadCell>
                          <TableCell align="right">+ {formatNumber(result.employerBhyt)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Bảo hiểm thất nghiệp (1%)</TableHeadCell>
                          <TableCell align="right">+ {formatNumber(result.employerBhtn)}</TableCell>
                        </tr>
                        <tr>
                          <TableHeadCell>Tổng cộng</TableHeadCell>
                          <TableCell align="right" className="font-bold text-emerald-700">
                            {formatNumber(result.totalCostToCompany)}
                          </TableCell>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-300 bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
            Các câu hỏi thường gặp
          </h2>
          <div className="mt-4 space-y-3">
            {FAQS.map((item, index) => (
              <FaqItem
                key={item.q}
                question={item.q}
                answer={item.a}
                open={openFaqIndex === index}
                onToggle={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}