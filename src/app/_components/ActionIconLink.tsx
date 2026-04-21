'use client';

import { ActionIcon, type ActionIconProps } from '@mantine/core';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

type Props = ActionIconProps & {
  href: ComponentPropsWithoutRef<typeof Link>['href'];
  prefetch?: ComponentPropsWithoutRef<typeof Link>['prefetch'];
  replace?: ComponentPropsWithoutRef<typeof Link>['replace'];
  scroll?: ComponentPropsWithoutRef<typeof Link>['scroll'];
  'aria-label'?: string;
};

export function ActionIconLink({
  href,
  prefetch,
  replace,
  scroll,
  children,
  ...iconProps
}: Props) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      style={{ display: 'inline-flex', textDecoration: 'none' }}
    >
      <ActionIcon component="span" {...iconProps}>
        {children}
      </ActionIcon>
    </Link>
  );
}
