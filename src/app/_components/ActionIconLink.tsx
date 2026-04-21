'use client';

import { ActionIcon, type ActionIconProps } from '@mantine/core';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

type Props = ActionIconProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof ActionIconProps>;

export function ActionIconLink(props: Props) {
  return <ActionIcon component={Link} {...props} />;
}
