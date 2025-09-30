import React, { useState } from 'react';
import {
  Stack,
  Select,
  Group,
  Button,
  Paper,
  Text,
  Badge,
  ScrollArea,
  Code,
  Alert,
  Grid
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { apiClient } from '@shared/services/api.client';

interface Prompt {
  id: number;
  version: number;
  created_at: string;
  prompt_template: string;
}

interface PromptComparisonProps {
  provider: 'lemur' | 'openai' | 'gemini';
  prompts: Prompt[];
  onClose: () => void;
}

interface ComparisonResult {
  additions: string[];
  deletions: string[];
  changes: number;
}

export function PromptComparison({ provider, prompts, onClose }: PromptComparisonProps) {
  const [version1, setVersion1] = useState<string>('');
  const [version2, setVersion2] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedPrompts = [...prompts].sort((a, b) => b.version - a.version);
  const versionOptions = sortedPrompts.map(p => ({
    value: p.version.toString(),
    label: `Version ${p.version} (${new Date(p.created_at).toLocaleDateString()})`
  }));

  const handleCompare = async () => {
    if (!version1 || !version2) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/prompts/${provider}/analysis_prompt/compare`,
        {
          params: {
            version1,
            version2
          }
        }
      );
      setComparison(response.data.comparison);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = version1;
    setVersion1(version2);
    setVersion2(temp);
    setComparison(null);
  };

  return (
    <Stack>
      <Group align="end">
        <Select
          label="First Version"
          placeholder="Select version"
          value={version1}
          onChange={setVersion1 || ''}
          data={versionOptions}
          style={{ flex: 1 }}
        />
        <Button
          variant="subtle"
          onClick={handleSwap}
          disabled={!version1 || !version2}
        >
          ↔️ Swap
        </Button>
        <Select
          label="Second Version"
          placeholder="Select version"
          value={version2}
          onChange={setVersion2 || ''}
          data={versionOptions}
          style={{ flex: 1 }}
        />
      </Group>

      <Group justify="center">
        <Button
          onClick={handleCompare}
          loading={loading}
          disabled={!version1 || !version2 || version1 === version2}
        >
          Compare Versions
        </Button>
      </Group>

      {version1 === version2 && version1 && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Please select different versions to compare
        </Alert>
      )}

      {comparison && (
        <Stack>
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Comparison Results</Text>
              <Badge>{comparison.changes} changes</Badge>
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder style={{ backgroundColor: '#f8fff8' }}>
                  <Text size="sm" fw={600} color="green" mb="xs">
                    ➕ Additions ({comparison.additions.length})
                  </Text>
                  <ScrollArea h={200}>
                    {comparison.additions.length > 0 ? (
                      <Stack gap={4}>
                        {comparison.additions.map((line, index) => (
                          <Code key={index} block color="green" styles={{ code: { fontSize: 12 } }}>
                            {line}
                          </Code>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" color="dimmed">No additions</Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Grid.Col>

              <Grid.Col span={6}>
                <Paper p="sm" withBorder style={{ backgroundColor: '#fff8f8' }}>
                  <Text size="sm" fw={600} color="red" mb="xs">
                    ➖ Deletions ({comparison.deletions.length})
                  </Text>
                  <ScrollArea h={200}>
                    {comparison.deletions.length > 0 ? (
                      <Stack gap={4}>
                        {comparison.deletions.map((line, index) => (
                          <Code key={index} block color="red" styles={{ code: { fontSize: 12 } }}>
                            {line}
                          </Code>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" color="dimmed">No deletions</Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Grid.Col>
            </Grid>
          </Paper>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  );
}
