import { useBrandingMainLogoSrc } from '../hooks/useBrandingMainLogo';

type Props = {
  variant?: 'hero' | 'header' | 'sidebar';
  className?: string;
};

export default function MainLogo({ variant = 'hero', className = '' }: Props) {
  const src = useBrandingMainLogoSrc();

  if (variant === 'sidebar') {
    return (
      <div className={`flex min-w-0 shrink-0 items-center ${className}`}>
        <img
          src={src}
          alt=""
          aria-hidden
          className="h-7 w-auto max-w-full object-contain object-left"
        />
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`flex shrink-0 items-center ${className}`}>
        <img
          src={src}
          alt=""
          aria-hidden
          className="h-7 w-auto max-w-[132px] object-contain object-left"
        />
      </div>
    );
  }

  return (
    <div className={`mb-3 flex w-full justify-start px-1 ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="h-auto max-h-9 w-auto max-w-[168px] object-contain object-left"
      />
    </div>
  );
}
