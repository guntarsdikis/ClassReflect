import React, { useState } from 'react';
import {
  Stack,
  Textarea,
  TextInput,
  Button,
  Group,
  Text,
  Alert,
  Badge,
  Paper,
  ScrollArea,
  Code,
  Tabs,
  List,
  ThemeIcon
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';

interface PromptEditorProps {
  initialPrompt: string;
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';
  onSave: (promptTemplate: string, description: string, changeDescription: string) => Promise<void>;
  onCancel: () => void;
}

const TEMPLATE_VARIABLES: Record<'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter', Array<{ name: string; description: string }>> = {
  lemur: [
    { name: 'CONTEXT_CALIBRATION', description: 'Grade and subject-specific context adjustments' },
    { name: 'CLASS_CONTEXT', description: 'Teacher, class, subject, and grade information' },
    { name: 'WAIT_TIME_METRICS', description: 'Pause metrics and wait time statistics' },
    { name: 'TIMING_SECTION', description: 'Time-coded evidence excerpts' },
    { name: 'EVALUATION_TEMPLATE', description: 'Template name and criteria definitions' },
    { name: 'CRITERIA_ANALYSIS', description: 'Instructions for analyzing criteria' },
    { name: 'OUTPUT_REQUIREMENTS', description: 'Output format and requirements' }
  ],
  openai: [
    { name: 'SCORING_RUBRIC', description: 'Motivational scoring guidelines' },
    { name: 'CONTEXT_CALIBRATION', description: 'Grade and subject-specific adjustments' },
    { name: 'TARGET_ADJUSTMENT', description: 'Context-based target adjustments' },
    { name: 'CLASS_CONTEXT', description: 'Class information' },
    { name: 'EVALUATION_TEMPLATE', description: 'Template and criteria' },
    { name: 'CRITERIA_TO_ANALYZE', description: 'Analysis instructions' },
    { name: 'RULES_FOR_EVIDENCE', description: 'Evidence requirements' },
    { name: 'BALANCE_REQUIREMENT', description: 'Balance requirements for feedback' },
    { name: 'IMPORTANT_NOTES', description: 'Important notes and warnings' },
    { name: 'WAIT_TIME_METRICS', description: 'Wait time metrics if available' },
    { name: 'OUTPUT_REQUIREMENT', description: 'Output format specification' }
  ],
  gemini: [
    { name: 'TRANSCRIPT_TEXT', description: 'Full transcript text passed to the model' },
    { name: 'TEACHER_NAME', description: 'Teacher\'s full name' },
    { name: 'CLASS_NAME', description: 'Class name' },
    { name: 'SUBJECT', description: 'Subject name' },
    { name: 'GRADE', description: 'Grade or year group' },
    { name: 'TEMPLATE_NAME', description: 'Evaluation template name' },
    { name: 'CRITERIA_LIST', description: 'Bullet list of criteria with weights and descriptions' },
    { name: 'WAIT_TIME_METRICS', description: 'Summary of pause/wait-time metrics if available' },
    { name: 'TIMING_SECTION', description: 'Time-coded evidence excerpt block if available' }
  ],
  vertex: [
    { name: 'TRANSCRIPT_TEXT', description: 'Full transcript text passed to the model' },
    { name: 'TEACHER_NAME', description: 'Teacher\'s full name' },
    { name: 'CLASS_NAME', description: 'Class name' },
    { name: 'SUBJECT', description: 'Subject name' },
    { name: 'GRADE', description: 'Grade or year group' },
    { name: 'TEMPLATE_NAME', description: 'Evaluation template name' },
    { name: 'CRITERIA_LIST', description: 'Bullet list of criteria with weights and descriptions' },
    { name: 'WAIT_TIME_METRICS', description: 'Summary of pause/wait-time metrics if available' },
    { name: 'TIMING_SECTION', description: 'Time-coded evidence excerpt block if available' }
  ],
  openrouter: [
    { name: 'TRANSCRIPT_TEXT', description: 'Full transcript text passed to the model' },
    { name: 'TEACHER_NAME', description: 'Teacher\'s full name' },
    { name: 'CLASS_NAME', description: 'Class name' },
    { name: 'SUBJECT', description: 'Subject name' },
    { name: 'GRADE', description: 'Grade or year group' },
    { name: 'TEMPLATE_NAME', description: 'Evaluation template name' },
    { name: 'CRITERIA_LIST', description: 'Bullet list of criteria with weights and descriptions' },
    { name: 'WAIT_TIME_METRICS', description: 'Summary of pause/wait-time metrics if available' },
    { name: 'TIMING_SECTION', description: 'Time-coded evidence excerpt block if available' }
  ]
};

export function PromptEditor({ initialPrompt, provider, onSave, onCancel }: PromptEditorProps) {
  const [promptTemplate, setPromptTemplate] = useState(initialPrompt);
  const [description, setDescription] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validatePrompt = () => {
    const errors: string[] = [];

    // Check minimum length
    if (promptTemplate.length < 100) {
      errors.push('Prompt template must be at least 100 characters');
    }

    // Check for unclosed variables
    const openBraces = (promptTemplate.match(/{{/g) || []).length;
    const closeBraces = (promptTemplate.match(/}}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unclosed template variables detected');
    }

    // Check for required sections per provider
    if (provider === 'lemur') {
      const required = ['PRIMARY GOAL', 'STYLE'];
      required.forEach(section => {
        if (!promptTemplate.includes(section)) {
          errors.push(`Missing required section: ${section}`);
        }
      });
    } else if (provider === 'openai') {
      const required = ['SCORING', 'OUTPUT'];
      const found = required.some(section => promptTemplate.toUpperCase().includes(section));
      if (!found) {
        errors.push('OpenAI prompt should include guidance for scoring and output.');
      }
    } else if (provider === 'gemini' || provider === 'vertex' || provider === 'openrouter') {
      const mustContain = ['CRITERIA_LIST', 'TEMPLATE_NAME'];
      mustContain.forEach(token => {
        if (!promptTemplate.includes(`{{${token}}}`)) {
          errors.push(`${provider} prompt should reference {{${token}}}.`);
        }
      });
    }

    if (!changeDescription.trim()) {
      errors.push('Please provide a description of your changes');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validatePrompt()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(promptTemplate, description, changeDescription);
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variableName: string) => {
    const insertion = `{{${variableName}}}`;
    const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        promptTemplate.substring(0, start) +
        insertion +
        promptTemplate.substring(end);
      setPromptTemplate(newValue);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.selectionStart = start + insertion.length;
        textarea.selectionEnd = start + insertion.length;
        textarea.focus();
      }, 0);
    }
  };

  const variables = TEMPLATE_VARIABLES[provider];

  return (
    <Stack>
      <Tabs defaultValue="editor">
        <Tabs.List>
          <Tabs.Tab value="editor">Editor</Tabs.Tab>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
          <Tabs.Tab value="variables">Template Variables</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="editor" pt="md">
          <Stack>
            <TextInput
              label="Version Description"
              description="Brief description of this prompt version"
              placeholder="e.g., Improved scoring rubric clarity"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />

            <Textarea
              id="prompt-textarea"
              label="Prompt Template"
              description="Use {{VARIABLE_NAME}} syntax for template variables"
              placeholder="Enter your prompt template..."
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.currentTarget.value)}
              minRows={20}
              maxRows={30}
              autosize
              styles={{
                input: { fontFamily: 'monospace' }
              }}
            />

            <Textarea
              label="Change Description"
              description="What changes did you make in this version?"
              placeholder="e.g., Added more specific guidance for K-2 grades, improved JSON output format"
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.currentTarget.value)}
              minRows={3}
              required
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="md">
          <Paper p="md" withBorder>
            <ScrollArea h={500}>
              <Code block styles={{ code: { whiteSpace: 'pre-wrap' } }}>
                {promptTemplate}
              </Code>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="variables" pt="md">
          <Stack>
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              Click on a variable to insert it at the cursor position in the editor
            </Alert>

            <List gap="md">
              {variables.map((variable) => (
                <List.Item
                  key={variable.name}
                  icon={
                    <ThemeIcon size={24} radius="xl" variant="light">
                      <IconCheck size={16} />
                    </ThemeIcon>
                  }
                  style={{ cursor: 'pointer' }}
                  onClick={() => insertVariable(variable.name)}
                >
                  <Group justify="space-between">
                    <div>
                      <Badge variant="light" size="lg">
                        {`{{${variable.name}}}`}
                      </Badge>
                      <Text size="sm" color="dimmed" mt={4}>
                        {variable.description}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        insertVariable(variable.name);
                      }}
                    >
                      Insert
                    </Button>
                  </Group>
                </List.Item>
              ))}
            </List>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {validationErrors.length > 0 && (
        <Alert icon={<IconX size={16} />} color="red">
          <Stack gap={4}>
            <Text size="sm" fw={600}>Please fix the following issues:</Text>
            {validationErrors.map((error, index) => (
              <Text key={index} size="sm">• {error}</Text>
            ))}
          </Stack>
        </Alert>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          leftSection={<IconCheck size={16} />}
        >
          Create Version
        </Button>
      </Group>
    </Stack>
  );
}
