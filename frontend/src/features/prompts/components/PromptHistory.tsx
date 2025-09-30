import React, { useState, useEffect } from 'react';
import {
  Stack,
  Timeline,
  Text,
  Badge,
  Group,
  Button,
  LoadingOverlay,
  Alert,
  Paper
} from '@mantine/core';
import { IconGitBranch, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiClient } from '@shared/services/api.client';

interface HistoryEntry {
  id: number;
  prompt_id: number;
  provider: string;
  name: string;
  prompt_template: string;
  version: number;
  change_description?: string;
  changed_by: string;
  changed_at: string;
}

interface PromptHistoryProps {
  promptId: number;
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';
  promptName: string;
  onClose: () => void;
}

export function PromptHistory({ promptId, provider, promptName, onClose }: PromptHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [promptId]);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get(`/prompts/${provider}/${promptName}/versions`);
      setHistory(response.data.versions || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper p="xl" style={{ position: 'relative', minHeight: 200 }}>
        <LoadingOverlay visible={loading} />
      </Paper>
    );
  }

  if (history.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="yellow">
        No history available for this prompt.
      </Alert>
    );
  }

  return (
    <Stack>
      <Timeline bulletSize={24} lineWidth={2}>
        {history.map((entry, index) => (
          <Timeline.Item
            key={entry.id}
            bullet={<IconGitBranch size={12} />}
            title={
              <Group gap="xs">
                <Text fw={600}>Version {entry.version}</Text>
                {index === 0 && (
                  <Badge color="green" variant="light">Current</Badge>
                )}
              </Group>
            }
          >
            <Stack gap={4}>
              <Text size="sm" color="dimmed">
                {new Date(entry.changed_at).toLocaleString()} by {entry.changed_by}
              </Text>
              {entry.change_description && (
                <Paper p="xs" withBorder>
                  <Text size="sm">{entry.change_description}</Text>
                </Paper>
              )}
            </Stack>
          </Timeline.Item>
        ))}
      </Timeline>

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  );
}
