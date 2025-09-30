import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Tabs,
  Stack,
  Group,
  Button,
  Select,
  Text,
  Badge,
  Alert,
  ActionIcon,
  Tooltip,
  Modal,
  Textarea,
  TextInput,
  NumberInput,
  Table,
  Code,
  Card,
  SimpleGrid,
  Divider,
  LoadingOverlay,
  ScrollArea
} from '@mantine/core';
import {
  IconEdit,
  IconHistory,
  IconTestPipe,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCopy,
  IconArrowBack
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { apiClient } from '@shared/services/api.client';
import { PromptEditor } from './PromptEditor';
import { PromptHistory } from './PromptHistory';
import { PromptComparison } from './PromptComparison';

interface Prompt {
  id: number;
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';
  name: string;
  description?: string;
  prompt_template: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export function PromptManager() {
  const [provider, setProvider] = useState<'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter'>('lemur');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('current');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editExistingModalOpen, setEditExistingModalOpen] = useState(false);
  const [selectedPromptForView, setSelectedPromptForView] = useState<Prompt | null>(null);
  const [selectedPromptForEdit, setSelectedPromptForEdit] = useState<Prompt | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateAssignments, setTemplateAssignments] = useState<Record<number, any>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Fetch prompts when provider changes
  useEffect(() => {
    fetchPrompts();
    fetchStats();
  }, [provider]);

  // Fetch templates when templates tab is accessed
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/prompts/provider/${provider}`);
      setPrompts(response.data.prompts || []);

      // Select the active prompt by default
      const activePrompt = response.data.prompts?.find((p: Prompt) => p.is_active);
      if (activePrompt) {
        setSelectedPrompt(activePrompt);
      } else {
        setSelectedPrompt(null);
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch prompts',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/prompts/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      // Fetch all templates
      const templatesResponse = await apiClient.get('/templates');
      setTemplates(templatesResponse.data || []);

      // Fetch assignments for each template
      const assignments: Record<number, any> = {};
      for (const template of templatesResponse.data || []) {
        try {
          const assignmentResponse = await apiClient.get(`/prompts/template/${template.id}/assignments`);
          assignments[template.id] = assignmentResponse.data;
        } catch (error) {
          console.error(`Failed to fetch assignments for template ${template.id}:`, error);
          assignments[template.id] = {
            lemur_prompt_id: null,
            openai_prompt_id: null,
            gemini_prompt_id: null,
            lemur_version: null,
            openai_version: null,
            gemini_version: null
          };
        }
      }
      setTemplateAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch templates',
        color: 'red'
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const updateTemplateAssignment = async (
    templateId: number,
    lemurPromptId: number | null,
    openaiPromptId: number | null,
    geminiPromptId: number | null = null,
    vertexPromptId: number | null = null,
    openrouterPromptId: number | null = null
  ) => {
    try {
      await apiClient.post(`/prompts/template/${templateId}/assign`, {
        lemur_prompt_id: lemurPromptId,
        openai_prompt_id: openaiPromptId,
        gemini_prompt_id: geminiPromptId,
        vertex_prompt_id: vertexPromptId,
        openrouter_prompt_id: openrouterPromptId
      });

      notifications.show({
        title: 'Success',
        message: 'Template prompt assignments updated',
        color: 'green'
      });

      // Refresh assignments
      fetchTemplates();
    } catch (error) {
      console.error('Failed to update template assignment:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update template assignment',
        color: 'red'
      });
    }
  };

  const handleViewPrompt = (prompt: Prompt) => {
    setSelectedPromptForView(prompt);
    setViewModalOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPromptForEdit(prompt);
    setEditExistingModalOpen(true);
  };

  const handleCopyToClipboard = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_template);
      notifications.show({
        title: 'Copied!',
        message: `Prompt v${prompt.version} copied to clipboard`,
        color: 'green',
        autoClose: 2000
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      notifications.show({
        title: 'Copy failed',
        message: 'Failed to copy prompt to clipboard',
        color: 'red'
      });
    }
  };

  const handleUpdateExistingPrompt = async (promptTemplate: string, description: string, changeDescription: string) => {
    if (!selectedPromptForEdit) return;

    setLoading(true);
    try {
      // Create a new version based on the edited one
      const response = await apiClient.post(
        `/prompts/${provider}/analysis_prompt/version`,
        {
          prompt_template: promptTemplate,
          description: description || selectedPromptForEdit.description,
          change_description: changeDescription || `Updated version ${selectedPromptForEdit.version}`
        }
      );

      notifications.show({
        title: 'Success',
        message: 'Prompt updated successfully',
        color: 'green'
      });

      setEditExistingModalOpen(false);
      setSelectedPromptForEdit(null);
      fetchPrompts();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update prompt',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (promptTemplate: string, description: string, changeDescription: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post(
        `/prompts/${provider}/analysis_prompt/version`,
        {
          prompt_template: promptTemplate,
          description,
          change_description: changeDescription
        }
      );

      notifications.show({
        title: 'Success',
        message: `Created version ${response.data.version}`,
        color: 'green',
        icon: <IconCheck />
      });

      await fetchPrompts();
      setEditModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to create version',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevertToVersion = async (version: number) => {
    setLoading(true);
    try {
      await apiClient.post(
        `/prompts/${provider}/analysis_prompt/revert/${version}`,
        {}
      );

      notifications.show({
        title: 'Success',
        message: `Reverted to version ${version}`,
        color: 'green',
        icon: <IconCheck />
      });

      await fetchPrompts();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to revert version',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get(
        `/prompts/export/${provider}`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prompts-${provider}-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: 'Success',
        message: 'Prompts exported successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to export prompts',
        color: 'red'
      });
    }
  };

  const getVersionBadgeColor = (prompt: Prompt) => {
    if (prompt.is_active) return 'green';
    if (prompt.version === Math.max(...prompts.map(p => p.version))) return 'blue';
    return 'gray';
  };

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Prompt Management</Title>
          <Group>
            <Select
              label="Provider"
              value={provider}
              onChange={(value) => setProvider(value as 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter')}
              data={[
                { value: 'lemur', label: 'LemUR (Claude)' },
                { value: 'openai', label: 'OpenAI (GPT)' },
                { value: 'gemini', label: 'Google Gemini' },
                { value: 'vertex', label: 'Vertex AI (Gemini)' },
                { value: 'openrouter', label: 'OpenRouter' }
              ]}
              style={{ width: 200 }}
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={fetchPrompts}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={handleExport}
            >
              Export
            </Button>
          </Group>
        </Group>

        {stats && (
          <SimpleGrid cols={4}>
            <Card>
              <Text size="sm" color="dimmed">Total Prompts</Text>
              <Text size="xl" fw={700}>{stats.totalPrompts}</Text>
            </Card>
            <Card>
              <Text size="sm" color="dimmed">Active Prompts</Text>
              <Text size="xl" fw={700}>{stats.activePrompts}</Text>
            </Card>
            <Card>
              <Text size="sm" color="dimmed">Total Versions</Text>
              <Text size="xl" fw={700}>{stats.totalVersions}</Text>
            </Card>
            <Card>
              <Text size="sm" color="dimmed">Total Tests</Text>
              <Text size="xl" fw={700}>{stats.totalTests}</Text>
            </Card>
          </SimpleGrid>
        )}

        <Paper shadow="sm" p="md" withBorder>
          <LoadingOverlay visible={loading} />

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="current">Current Version</Tabs.Tab>
              <Tabs.Tab value="versions">All Versions</Tabs.Tab>
              <Tabs.Tab value="templates">Template Assignments</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="current" pt="lg">
              {selectedPrompt && selectedPrompt.is_active ? (
                <Stack>
                  <Group justify="space-between">
                    <div>
                      <Text size="lg" fw={600}>
                        Active {provider === 'lemur' ? 'LemUR/Claude' : 'OpenAI'} Prompt
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Badge color="green">Version {selectedPrompt.version}</Badge>
                        <Badge variant="light">
                          Created by {selectedPrompt.created_by}
                        </Badge>
                        <Text size="sm" color="dimmed">
                          {new Date(selectedPrompt.created_at).toLocaleDateString()}
                        </Text>
                      </Group>
                    </div>
                    <Group>
                      <Button
                        leftSection={<IconEdit size={16} />}
                        onClick={() => setEditModalOpen(true)}
                      >
                        Create New Version
                      </Button>
                      <Button
                        leftSection={<IconHistory size={16} />}
                        variant="light"
                        onClick={() => setHistoryModalOpen(true)}
                      >
                        View History
                      </Button>
                    </Group>
                  </Group>

                  {selectedPrompt.description && (
                    <Alert icon={<IconAlertCircle size={16} />} color="blue">
                      {selectedPrompt.description}
                    </Alert>
                  )}

                  <ScrollArea h={400}>
                    <Code block>{selectedPrompt.prompt_template}</Code>
                  </ScrollArea>
                </Stack>
              ) : (
                <Stack>
                  <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                    No active prompt found for {provider}. Create a new version to get started.
                  </Alert>
                  <Group justify="center">
                    <Button
                      leftSection={<IconEdit size={16} />}
                      onClick={() => setEditModalOpen(true)}
                      size="lg"
                    >
                      Create New Version
                    </Button>
                  </Group>
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="versions" pt="lg">
              <Stack>
                <Group justify="space-between">
                  <Text size="lg" fw={600}>Version History</Text>
                  <Button
                    leftSection={<IconEdit size={16} />}
                    onClick={() => setEditModalOpen(true)}
                  >
                    Create New Version
                  </Button>
                </Group>

                <Table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Created At</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prompts
                      .filter(p => p.name === 'analysis_prompt')
                      .sort((a, b) => b.version - a.version)
                      .map((prompt) => (
                        <tr key={prompt.id}>
                          <td>
                            <Text fw={600}>v{prompt.version}</Text>
                          </td>
                          <td>
                            <Badge color={getVersionBadgeColor(prompt)}>
                              {prompt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>{prompt.created_by}</td>
                          <td>{new Date(prompt.created_at).toLocaleDateString()}</td>
                          <td>
                            <Text size="sm" lineClamp={1}>
                              {prompt.description || '-'}
                            </Text>
                          </td>
                          <td>
                            <Group gap={4}>
                              <Tooltip label="View Prompt">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => handleViewPrompt(prompt)}
                                >
                                  <IconTestPipe size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Edit Prompt">
                                <ActionIcon
                                  variant="light"
                                  color="orange"
                                  onClick={() => handleEditPrompt(prompt)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Copy to Clipboard">
                                <ActionIcon
                                  variant="light"
                                  color="gray"
                                  onClick={() => handleCopyToClipboard(prompt)}
                                >
                                  <IconCopy size={16} />
                                </ActionIcon>
                              </Tooltip>
                              {!prompt.is_active && (
                                <Tooltip label="Make Active">
                                  <ActionIcon
                                    variant="light"
                                    color="green"
                                    onClick={() => handleRevertToVersion(prompt.version)}
                                  >
                                    <IconArrowBack size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="Compare">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => setCompareModalOpen(true)}
                                >
                                  <IconCopy size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="templates" pt="lg">
              <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
                Assign specific prompt versions to templates. Templates without assignments will use the active default prompt.
              </Alert>

              <LoadingOverlay visible={templatesLoading} />

              {templates.length === 0 && !templatesLoading ? (
                <Text color="dimmed" ta="center" py="xl">
                  No templates found. Create analysis templates first.
                </Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Template Name</Table.Th>
                      <Table.Th>LemUR Prompt</Table.Th>
                      <Table.Th>OpenAI Prompt</Table.Th>
                      <Table.Th>Gemini Prompt</Table.Th>
                      <Table.Th>Vertex Prompt</Table.Th>
                      <Table.Th>OpenRouter Prompt</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {templates.map((template) => {
                      const assignment = templateAssignments[template.id] || {};
                      return (
                        <Table.Tr key={template.id}>
                          <Table.Td>
                            <div>
                              <Text fw={500}>{template.template_name}</Text>
                              <Text size="sm" color="dimmed">
                                {template.description || 'No description'}
                              </Text>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <Select
                              placeholder="Select LemUR prompt version"
                              value={assignment.lemur_prompt_id?.toString() || ''}
                              onChange={(value) => {
                                if (value === '') {
                                  updateTemplateAssignment(template.id, null, assignment.openai_prompt_id, assignment.gemini_prompt_id);
                                } else {
                                  updateTemplateAssignment(template.id, parseInt(value), assignment.openai_prompt_id, assignment.gemini_prompt_id);
                                }
                              }}
                              data={[
                                { value: '', label: 'Use default (active)' },
                                ...prompts
                                  .filter(p => p.provider === 'lemur')
                                  .map(p => ({
                                    value: p.id.toString(),
                                    label: `v${p.version} ${p.is_active ? '(active)' : ''}`
                                  }))
                              ]}
                              size="sm"
                            />
                            {assignment.lemur_version && (
                              <Badge size="xs" color="blue" mt={4}>
                                v{assignment.lemur_version}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Select
                              placeholder="Select OpenAI prompt version"
                              value={assignment.openai_prompt_id?.toString() || ''}
                              onChange={(value) => {
                                if (value === '') {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, null, assignment.gemini_prompt_id);
                                } else {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, parseInt(value), assignment.gemini_prompt_id);
                                }
                              }}
                              data={[
                                { value: '', label: 'Use default (active)' },
                                ...prompts
                                  .filter(p => p.provider === 'openai')
                                  .map(p => ({
                                    value: p.id.toString(),
                                    label: `v${p.version} ${p.is_active ? '(active)' : ''}`
                                  }))
                              ]}
                              size="sm"
                            />
                            {assignment.openai_version && (
                              <Badge size="xs" color="green" mt={4}>
                                v{assignment.openai_version}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Select
                              placeholder="Select Gemini prompt version"
                              value={assignment.gemini_prompt_id?.toString() || ''}
                              onChange={(value) => {
                                if (value === '') {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, null);
                                } else {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, parseInt(value));
                                }
                              }}
                              data={[
                                { value: '', label: 'Use default (active)' },
                                ...prompts
                                  .filter(p => p.provider === 'gemini')
                                  .map(p => ({
                                    value: p.id.toString(),
                                    label: `v${p.version} ${p.is_active ? '(active)' : ''}`
                                  }))
                              ]}
                              size="sm"
                            />
                            {assignment.gemini_version && (
                              <Badge size="xs" color="orange" mt={4}>
                                v{assignment.gemini_version}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Select
                              placeholder="Select Vertex prompt version"
                              value={assignment.vertex_prompt_id?.toString() || ''}
                              onChange={(value) => {
                                if (value === '') {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, assignment.gemini_prompt_id, null, assignment.openrouter_prompt_id);
                                } else {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, assignment.gemini_prompt_id, parseInt(value), assignment.openrouter_prompt_id);
                                }
                              }}
                              data={[
                                { value: '', label: 'Use default (active)' },
                                ...prompts
                                  .filter(p => p.provider === 'vertex')
                                  .map(p => ({
                                    value: p.id.toString(),
                                    label: `v${p.version} ${p.is_active ? '(active)' : ''}`
                                  }))
                              ]}
                              size="sm"
                            />
                            {assignment.vertex_version && (
                              <Badge size="xs" color="grape" mt={4}>
                                v{assignment.vertex_version}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Select
                              placeholder="Select OpenRouter prompt version"
                              value={assignment.openrouter_prompt_id?.toString() || ''}
                              onChange={(value) => {
                                if (value === '') {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, assignment.gemini_prompt_id, assignment.vertex_prompt_id, null);
                                } else {
                                  updateTemplateAssignment(template.id, assignment.lemur_prompt_id, assignment.openai_prompt_id, assignment.gemini_prompt_id, assignment.vertex_prompt_id, parseInt(value));
                                }
                              }}
                              data={[
                                { value: '', label: 'Use default (active)' },
                                ...prompts
                                  .filter(p => p.provider === 'openrouter')
                                  .map(p => ({
                                    value: p.id.toString(),
                                    label: `v${p.version} ${p.is_active ? '(active)' : ''}`
                                  }))
                              ]}
                              size="sm"
                            />
                            {assignment.openrouter_version && (
                              <Badge size="xs" color="indigo" mt={4}>
                                v{assignment.openrouter_version}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Clear all assignments">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() => updateTemplateAssignment(template.id, null, null, null, null, null)}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Refresh assignment data">
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  size="sm"
                                  onClick={() => fetchTemplates()}
                                >
                                  <IconRefresh size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}

              <Group justify="flex-end" mt="md">
                <Button
                  leftSection={<IconRefresh size={16} />}
                  variant="outline"
                  onClick={fetchTemplates}
                  loading={templatesLoading}
                >
                  Refresh Templates
                </Button>
              </Group>
            </Tabs.Panel>
          </Tabs>
        </Paper>

        {/* Edit Modal */}
        <Modal
          opened={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Create New Prompt Version"
          size="xl"
        >
          <PromptEditor
            initialPrompt={selectedPrompt?.prompt_template || ''}
            provider={provider}
            onSave={handleCreateVersion}
            onCancel={() => setEditModalOpen(false)}
          />
        </Modal>

        {/* History Modal */}
        <Modal
          opened={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title="Prompt History"
          size="xl"
        >
          {selectedPrompt && (
            <PromptHistory
              promptId={selectedPrompt.id}
              provider={provider}
              promptName={selectedPrompt.name}
              onClose={() => setHistoryModalOpen(false)}
            />
          )}
        </Modal>

        {/* View Modal */}
        <Modal
          opened={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`View Prompt - ${selectedPromptForView ? `v${selectedPromptForView.version}` : ''}`}
          size="xl"
        >
          {selectedPromptForView && (
            <Stack>
              <Group>
                <Badge color="blue">Version {selectedPromptForView.version}</Badge>
                <Badge color={selectedPromptForView.is_active ? 'green' : 'gray'}>
                  {selectedPromptForView.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Group>

              {selectedPromptForView.description && (
                <div>
                  <Text fw={500} mb="xs">Description:</Text>
                  <Text size="sm" color="dimmed">{selectedPromptForView.description}</Text>
                </div>
              )}

              <div>
                <Text fw={500} mb="xs">Prompt Template:</Text>
                <ScrollArea h={400}>
                  <Code block>{selectedPromptForView.prompt_template}</Code>
                </ScrollArea>
              </div>

              <Group justify="flex-end">
                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  leftSection={<IconCopy size={16} />}
                  onClick={() => handleCopyToClipboard(selectedPromptForView)}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    setViewModalOpen(false);
                    handleEditPrompt(selectedPromptForView);
                  }}
                >
                  Edit This Version
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        {/* Edit Existing Prompt Modal */}
        <Modal
          opened={editExistingModalOpen}
          onClose={() => setEditExistingModalOpen(false)}
          title={`Edit Prompt - ${selectedPromptForEdit ? `v${selectedPromptForEdit.version}` : ''}`}
          size="xl"
        >
          <PromptEditor
            initialPrompt={selectedPromptForEdit?.prompt_template || ''}
            provider={provider}
            onSave={handleUpdateExistingPrompt}
            onCancel={() => setEditExistingModalOpen(false)}
          />
        </Modal>

        {/* Comparison Modal */}
        <Modal
          opened={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          title="Compare Versions"
          size="xl"
        >
          <PromptComparison
            provider={provider}
            prompts={prompts.filter(p => p.name === 'analysis_prompt')}
            onClose={() => setCompareModalOpen(false)}
          />
        </Modal>
      </Stack>
    </Container>
  );
}
