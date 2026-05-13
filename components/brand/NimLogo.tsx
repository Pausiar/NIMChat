import Image from "next/image";

import { cn } from "@/lib/utils";

interface NimLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function NimLogo({ size = 32, className, priority = false }: NimLogoProps) {
  return (
    <Image
      src="/NIMChat-noBG.png"
      alt="NimChat"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}