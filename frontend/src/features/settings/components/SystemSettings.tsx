import { useEffect, useState } from 'react';
import { Paper, Title, Stack, Group, SegmentedControl, TextInput, Button, Alert, Text, Loader } from '@mantine/core';
import { IconSettings, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { ApiClient } from '@shared/services/api.client';

type Provider = 'lemur' | 'openai';

export function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [provider, setProvider] = useState<Provider>('lemur');
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o');

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const api = new ApiClient();
      const data = await api.get<{ provider: Provider; openai_model?: string }>(`/settings/analysis-provider`);
      setProvider((data.provider as Provider) || 'lemur');
      setOpenaiModel(data.openai_model || 'gpt-4o');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const api = new ApiClient();
      const body: any = { provider };
      if (provider === 'openai') body.openai_model = openaiModel;
      await api.put(`/settings/analysis-provider`, body);
      setSuccess('Settings saved');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack>
      <Paper p="lg" withBorder>
        <Group>
          <IconSettings />
          <Title order={3}>System Settings</Title>
        </Group>
        <Text size="sm" c="dimmed" mt="xs">Only super admins can change these settings.</Text>
      </Paper>

      {error && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          {success}
        </Alert>
      )}

      <Paper p="lg" withBorder>
        <Title order={4} mb="sm">Analysis Provider</Title>
        <SegmentedControl
          value={provider}
          onChange={(v) => setProvider(v as Provider)}
          data={[{ label: 'LeMUR (Claude)', value: 'lemur' }, { label: 'OpenAI', value: 'openai' }]}
        />

        {provider === 'openai' && (
          <Stack gap="sm" mt="md">
            <TextInput
              label="OpenAI Model"
              description="e.g., gpt-4o or gpt-4o"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">
              Requires `OPENAI_API_KEY` to be set in the backend `.env` file.
            </Text>
          </Stack>
        )}

        <Group mt="lg">
          <Button loading={saving} onClick={save}>Save</Button>
          <Button variant="light" onClick={load}>Reset</Button>
        </Group>
      </Paper>
    </Stack>
  );
}
