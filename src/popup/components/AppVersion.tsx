import { VERSION_LABEL } from '../../version';

type Props = {
  className?: string;
};

export default function AppVersion({ className = '' }: Props) {
  return (
    <p
      className={`max-w-[55%] shrink-0 text-left text-[0.62rem] leading-tight tracking-wide text-vault-subtle ${className}`}
      role="contentinfo"
    >
      {VERSION_LABEL}
    </p>
  );
}
