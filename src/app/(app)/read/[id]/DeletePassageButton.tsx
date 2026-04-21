'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deletePassage } from '@/lib/actions/passage';

export function DeletePassageButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await deletePassage({ id });
    setDeleting(false);
    if (!res.ok) {
      setError('削除に失敗しました。');
      return;
    }
    close();
    router.push('/read');
    router.refresh();
  }

  return (
    <>
      <Button
        variant="subtle"
        color="red"
        size="xs"
        leftSection={<Trash2 size={12} />}
        onClick={open}
      >
        削除
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title="この長文を削除しますか？"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            <Text component="span" fw={700}>
              {title}
            </Text>{' '}
            をライブラリから削除します。元に戻せません（単語帳に登録済みの語は残ります）。
          </Text>
          {error ? (
            <Text size="xs" c="red">
              {error}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              キャンセル
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              削除する
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
