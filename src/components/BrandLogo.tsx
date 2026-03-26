// components/BrandLogo.tsx
'use client';

import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  className?: string;
  textClassName?: string;
  logoClassName?: string;
};

export default function BrandLogo({
  href = '/',
  className = '',
  textClassName = 'text-xl font-black tracking-tight text-gray-900 md:text-2xl',
  logoClassName = 'h-10 w-10 rounded-md object-contain',
}: BrandLogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-3 ${className}`}>
      <img
        src="/brand-logo.png"
        alt="Tuyendungso logo"
        className={logoClassName}
      />
      <span className={textClassName}>Tuyendungso.vn</span>
    </Link>
  );
}