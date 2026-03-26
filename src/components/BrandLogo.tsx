import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  className?: string;
  text?: string;
  textClassName?: string;
  logoClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
};

export default function BrandLogo({
  href = '/',
  className = '',
  text = 'Tuyendungso.vn',
  textClassName = 'text-xl font-black tracking-tight text-gray-900 md:text-2xl',
  logoClassName = 'h-10 w-10 rounded-md object-contain',
  subtitle,
  subtitleClassName = 'mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 md:text-xs',
}: BrandLogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <img
        src="/brand-logo.png"
        alt="Tuyendungso logo"
        className={logoClassName}
      />
      <div>
        <h1 className={textClassName}>{text}</h1>
        {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
      </div>
    </Link>
  );
}
