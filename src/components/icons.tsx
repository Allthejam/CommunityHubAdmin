import type { SVGProps } from 'react';
import Image from 'next/image';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <Image
      src="https://i.postimg.cc/P5zmrLNQ/HubLogo32x32.png"
      alt="Community Hub Logo"
      width={32}
      height={32}
      {...props}
    />
  );
}
