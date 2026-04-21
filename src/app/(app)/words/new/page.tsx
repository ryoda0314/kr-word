import { Container, Stack, Tabs, Text, Title } from '@mantine/core';
import { FileText, PenLine } from 'lucide-react';

import { ManualEntryForm } from './ManualEntryForm';
import { PasteExtractForm } from './PasteExtractForm';

export default function NewWordPage() {
  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>単語を追加</Title>
          <Text c="dimmed" size="sm">
            一語ずつ手入力するか、韓国語の文章からまとめて抽出します。
          </Text>
        </Stack>

        <Tabs defaultValue="manual" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="manual" leftSection={<PenLine size={14} />}>
              手入力
            </Tabs.Tab>
            <Tabs.Tab value="paste" leftSection={<FileText size={14} />}>
              文章から抽出
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="manual" pt="md">
            <ManualEntryForm />
          </Tabs.Panel>
          <Tabs.Panel value="paste" pt="md">
            <PasteExtractForm />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
