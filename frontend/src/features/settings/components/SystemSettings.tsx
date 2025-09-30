import { useEffect, useState } from 'react';
import { Paper, Title, Stack, Group, SegmentedControl, Select, TextInput, Button, Alert, Text, Loader } from '@mantine/core';
import { IconSettings, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { ApiClient } from '@shared/services/api.client';

type Provider = 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';

export function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [provider, setProvider] = useState<Provider>('lemur');
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o');
  const [openrouterModel, setOpenrouterModel] = useState<string>('google/gemini-pro-1.5');

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const api = new ApiClient();
      const data = await api.get<{ provider: Provider; openai_model?: string; openrouter_model?: string }>(`/settings/analysis-provider`);
      setProvider((data.provider as Provider) || 'lemur');
      setOpenaiModel(data.openai_model || 'gpt-4o');
      setOpenrouterModel(data.openrouter_model || 'google/gemini-pro-1.5');
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
      if (provider === 'openrouter') body.openrouter_model = openrouterModel;
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
          data={[
            { label: 'LeMUR (Claude)', value: 'lemur' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'Gemini', value: 'gemini' },
            { label: 'Vertex (Gemini)', value: 'vertex' },
            { label: 'OpenRouter', value: 'openrouter' }
          ]}
        />

        {provider === 'openai' && (
          <Stack gap="sm" mt="md">
            <TextInput
              label="OpenAI Model"
              description="e.g., gpt-4o or gpt-4o-mini"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">
              Requires `OPENAI_API_KEY` to be set in the backend `.env` file.
            </Text>
          </Stack>
        )}

        {provider === 'openrouter' && (
          <Stack gap="sm" mt="md">
            <Select
              label="OpenRouter Model"
              description="Select a preset model or type 'custom' to enter your own"
              placeholder="Choose a model..."
              value={openrouterModel}
              onChange={(value) => setOpenrouterModel(value || 'google/gemini-2.5-flash')}
              data={[
                { value: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash (Fast & cost-effective)' },
                { value: 'google/gemini-2.5-pro', label: 'Google Gemini 2.5 Pro (Most capable Gemini)' },
                { value: 'google/gemini-2.5-flash-lite', label: 'Google Gemini 2.5 Flash Lite (Fastest)' },
                { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o (Highest quality)' },
                { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini (Fast & affordable)' },
                { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (Latest & most capable)' },
                { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4 (Most powerful Claude)' },
                { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Previous version)' },
                { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Excellent reasoning)' },
                { value: 'custom', label: '✏️ Custom Model (enter below)' }
              ]}
              searchable
              allowDeselect={false}
            />
            {(openrouterModel === 'custom' || !['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash-lite', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-sonnet-4.5', 'anthropic/claude-opus-4', 'anthropic/claude-sonnet-4', 'anthropic/claude-3.5-sonnet'].includes(openrouterModel)) && (
              <TextInput
                label="Custom Model ID"
                placeholder="e.g., meta-llama/llama-3.1-405b"
                value={openrouterModel === 'custom' ? '' : openrouterModel}
                onChange={(e) => setOpenrouterModel(e.currentTarget.value)}
              />
            )}
            <Text size="xs" c="dimmed">
              Requires `OPENROUTER_API_KEY` in backend `.env`. Get your key at openrouter.ai/keys
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
