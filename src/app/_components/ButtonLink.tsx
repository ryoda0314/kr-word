'use client';

import { Button, type ButtonProps } from '@mantine/core';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

type Props = ButtonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof ButtonProps>;

export function ButtonLink(props: Props) {
  return <Button component={Link} {...props} />;
}
