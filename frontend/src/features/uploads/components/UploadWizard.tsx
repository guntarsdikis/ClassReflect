import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Stepper,
  Button,
  Group,
  Paper,
  Title,
  Text,
  Select,
  FileInput,
  TextInput,
  Textarea,
  MultiSelect,
  NumberInput,
  Switch,
  Card,
  Stack,
  Badge,
  Alert,
  Progress,
  Checkbox,
  Radio,
} from '@mantine/core';
import {
  IconUpload,
  IconFileMusic,
  IconInfoCircle,
  IconTemplate,
  IconSettings,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
// import { useAuthStore } from '@store/auth.store'; // Will use when needed

// Mock data for templates
const mockTemplates = [
  {
    id: 'k12-math',
    name: 'K-12 Math Assessment',
    category: 'Mathematics',
    grades: ['K-5', '6-8'],
    description: 'Comprehensive math teaching evaluation focusing on problem-solving and student engagement',
    criteria: [
      { id: 'clarity', name: 'Clarity of Instruction', weight: 25 },
      { id: 'engagement', name: 'Student Engagement', weight: 30 },
      { id: 'assessment', name: 'Formative Assessment', weight: 25 },
      { id: 'management', name: 'Classroom Management', weight: 20 },
    ],
  },
  {
    id: 'science-inquiry',
    name: 'Science Inquiry Template',
    category: 'Science',
    grades: ['3-5', '6-8', '9-12'],
    description: 'Evaluates inquiry-based science teaching methods and lab safety',
    criteria: [
      { id: 'inquiry', name: 'Inquiry Process', weight: 35 },
      { id: 'safety', name: 'Lab Safety', weight: 20 },
      { id: 'engagement', name: 'Student Participation', weight: 25 },
      { id: 'explanation', name: 'Scientific Explanation', weight: 20 },
    ],
  },
  {
    id: 'language-arts',
    name: 'Language Arts Standard',
    category: 'English',
    grades: ['K-2', '3-5', '6-8', '9-12'],
    description: 'Focus on reading comprehension, writing skills, and discussion facilitation',
    criteria: [
      { id: 'discussion', name: 'Discussion Facilitation', weight: 30 },
      { id: 'feedback', name: 'Student Feedback', weight: 25 },
      { id: 'literacy', name: 'Literacy Strategies', weight: 25 },
      { id: 'differentiation', name: 'Differentiation', weight: 20 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Evaluation',
    category: 'Custom',
    grades: ['All'],
    description: 'Create your own evaluation criteria',
    criteria: [],
  },
];

// Mock teachers for selection
const mockTeachers = [
  { value: '1', label: 'Sarah Johnson - Math, Science (Grades 3-4)' },
  { value: '2', label: 'John Smith - Science (Grades 5-6)' },
  { value: '3', label: 'Emily Brown - English, History (Grades 7-8)' },
  { value: '4', label: 'Michael Davis - Math (Grades 9-10)' },
  { value: '5', label: 'Lisa Wilson - Art, Music (Grades K-2)' },
];

interface CriterionConfig {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  customPrompt?: string;
}

export function UploadWizard() {
  const navigate = useNavigate();
  // const user = useAuthStore((state) => state.user); // Will use when needed
  const [active, setActive] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [duration, setDuration] = useState<number>(45);
  const [notes, setNotes] = useState('');
  
  // Template and criteria state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [criteria, setCriteria] = useState<CriterionConfig[]>([]);
  const [customCriteria, setCustomCriteria] = useState<CriterionConfig[]>([]);
  const [useStudentAudio, setUseStudentAudio] = useState(true);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = mockTemplates.find(t => t.id === templateId);
    if (template && template.id !== 'custom') {
      setCriteria(
        template.criteria.map(c => ({
          ...c,
          enabled: true,
          customPrompt: '',
        }))
      );
      setCustomCriteria([]);
    } else if (template?.id === 'custom') {
      setCriteria([]);
      setCustomCriteria([
        { id: 'custom1', name: '', weight: 25, enabled: true },
      ]);
    }
  };
  
  const handleCriterionToggle = (criterionId: string) => {
    setCriteria(prev =>
      prev.map(c =>
        c.id === criterionId ? { ...c, enabled: !c.enabled } : c
      )
    );
  };
  
  const handleCriterionWeightChange = (criterionId: string, weight: number) => {
    setCriteria(prev =>
      prev.map(c =>
        c.id === criterionId ? { ...c, weight } : c
      )
    );
  };
  
  const addCustomCriterion = () => {
    setCustomCriteria(prev => [
      ...prev,
      { id: `custom${prev.length + 1}`, name: '', weight: 25, enabled: true },
    ]);
  };
  
  const handleSubmit = async () => {
    setIsUploading(true);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
    
    // Simulate API call
    setTimeout(() => {
      clearInterval(interval);
      setIsUploading(false);
      notifications.show({
        title: 'Upload Successful',
        message: 'Recording has been uploaded and processing has started.',
        color: 'green',
        icon: <IconCheck />,
      });
      navigate('/dashboard');
    }, 5000);
  };
  
  const nextStep = () => setActive((current) => (current < 4 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
  
  const isStepValid = () => {
    switch (active) {
      case 0:
        return selectedTeacher && audioFile;
      case 1:
        return className && subject && grade;
      case 2:
        return selectedTemplate;
      case 3:
        const enabledCriteria = criteria.filter(c => c.enabled);
        const totalWeight = enabledCriteria.reduce((sum, c) => sum + c.weight, 0);
        return enabledCriteria.length > 0 && totalWeight === 100;
      default:
        return true;
    }
  };
  
  return (
    <Container size="lg">
      <Paper shadow="sm" radius="md" p="lg" withBorder>
        <Title order={2} mb="xl">Upload Class Recording</Title>
        
        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step
            label="Upload Recording"
            description="Select teacher and audio file"
            icon={<IconUpload size={18} />}
          >
            <Stack mt="xl">
              <Select
                label="Select Teacher"
                placeholder="Choose a teacher"
                data={mockTeachers}
                value={selectedTeacher}
                onChange={(value) => setSelectedTeacher(value || '')}
                required
                searchable
              />
              
              <FileInput
                label="Audio Recording"
                placeholder="Click to select audio file"
                leftSection={<IconFileMusic size={16} />}
                accept="audio/*"
                value={audioFile}
                onChange={setAudioFile}
                required
                description="Supported formats: MP3, WAV, M4A, OGG (max 500MB)"
              />
              
              {audioFile && (
                <Alert icon={<IconInfoCircle size={16} />} variant="light">
                  <Text size="sm">File: {audioFile.name}</Text>
                  <Text size="sm">Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                </Alert>
              )}
            </Stack>
          </Stepper.Step>
          
          <Stepper.Step
            label="Class Information"
            description="Provide class details"
            icon={<IconInfoCircle size={18} />}
          >
            <Stack mt="xl">
              <TextInput
                label="Class Name"
                placeholder="e.g., Math Period 3"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
              
              <Select
                label="Subject"
                placeholder="Select subject"
                data={['Mathematics', 'Science', 'English', 'History', 'Art', 'Music', 'Physical Education', 'Other']}
                value={subject}
                onChange={(value) => setSubject(value || '')}
                required
              />
              
              <Select
                label="Grade Level"
                placeholder="Select grade"
                data={['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                value={grade}
                onChange={(value) => setGrade(value || '')}
                required
              />
              
              <NumberInput
                label="Class Duration (minutes)"
                value={duration}
                onChange={(value) => setDuration(Number(value))}
                min={10}
                max={180}
                step={5}
              />
              
              <Textarea
                label="Additional Notes (optional)"
                placeholder="Any specific context or areas of focus for this evaluation"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Stack>
          </Stepper.Step>
          
          <Stepper.Step
            label="Select Template"
            description="Choose evaluation template"
            icon={<IconTemplate size={18} />}
          >
            <Stack mt="xl">
              <Text size="sm" c="dimmed" mb="md">
                Select an evaluation template that best matches your needs
              </Text>
              
              <Radio.Group value={selectedTemplate} onChange={handleTemplateSelect}>
                <Stack>
                  {mockTemplates.map((template) => (
                    <Card key={template.id} withBorder p="md">
                      <Radio
                        value={template.id}
                        label={
                          <Group justify="space-between" style={{ flex: 1 }}>
                            <div>
                              <Text fw={500}>{template.name}</Text>
                              <Text size="xs" c="dimmed">{template.description}</Text>
                            </div>
                            <Group gap="xs">
                              <Badge variant="light">{template.category}</Badge>
                              <Badge variant="outline" size="sm">
                                Grades: {template.grades.join(', ')}
                              </Badge>
                            </Group>
                          </Group>
                        }
                      />
                      {template.criteria.length > 0 && (
                        <Group gap={4} mt="xs" ml="xl">
                          {template.criteria.map((criterion) => (
                            <Badge key={criterion.id} size="xs" variant="dot">
                              {criterion.name} ({criterion.weight}%)
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Card>
                  ))}
                </Stack>
              </Radio.Group>
            </Stack>
          </Stepper.Step>
          
          <Stepper.Step
            label="Configure Criteria"
            description="Customize evaluation parameters"
            icon={<IconSettings size={18} />}
          >
            <Stack mt="xl">
              <Switch
                label="Include student audio analysis"
                description="Analyze student responses and participation"
                checked={useStudentAudio}
                onChange={(event) => setUseStudentAudio(event.currentTarget.checked)}
              />
              
              <MultiSelect
                label="Focus Areas (optional)"
                placeholder="Select specific areas to emphasize"
                data={[
                  'Differentiated Instruction',
                  'Technology Integration',
                  'Critical Thinking',
                  'Collaborative Learning',
                  'Assessment Strategies',
                  'Classroom Management',
                  'Student Engagement',
                  'Clear Communication',
                ]}
                value={focusAreas}
                onChange={setFocusAreas}
              />
              
              {criteria.length > 0 && (
                <>
                  <Text fw={500} mt="md">Evaluation Criteria</Text>
                  <Text size="xs" c="dimmed">
                    Adjust weights to total 100%. Disable criteria you don't want to evaluate.
                  </Text>
                  
                  <Stack gap="xs">
                    {criteria.map((criterion) => (
                      <Paper key={criterion.id} p="sm" withBorder>
                        <Group justify="space-between">
                          <Checkbox
                            label={criterion.name}
                            checked={criterion.enabled}
                            onChange={() => handleCriterionToggle(criterion.id)}
                          />
                          <NumberInput
                            value={criterion.weight}
                            onChange={(value) => handleCriterionWeightChange(criterion.id, Number(value))}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            disabled={!criterion.enabled}
                            style={{ width: 100 }}
                          />
                        </Group>
                        {criterion.enabled && (
                          <Textarea
                            placeholder="Optional: Add specific instructions for this criterion"
                            value={criterion.customPrompt}
                            onChange={(e) => {
                              setCriteria(prev =>
                                prev.map(c =>
                                  c.id === criterion.id
                                    ? { ...c, customPrompt: e.target.value }
                                    : c
                                )
                              );
                            }}
                            mt="xs"
                            rows={2}
                          />
                        )}
                      </Paper>
                    ))}
                  </Stack>
                  
                  <Text size="sm" fw={500}>
                    Total Weight: {criteria.filter(c => c.enabled).reduce((sum, c) => sum + c.weight, 0)}%
                  </Text>
                  
                  {criteria.filter(c => c.enabled).reduce((sum, c) => sum + c.weight, 0) !== 100 && (
                    <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                      Weights must total exactly 100%
                    </Alert>
                  )}
                </>
              )}
              
              {selectedTemplate === 'custom' && (
                <>
                  <Text fw={500} mt="md">Custom Criteria</Text>
                  <Stack gap="xs">
                    {customCriteria.map((criterion, index) => (
                      <Paper key={criterion.id} p="sm" withBorder>
                        <Group>
                          <TextInput
                            placeholder="Criterion name"
                            value={criterion.name}
                            onChange={(e) => {
                              setCustomCriteria(prev =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, name: e.target.value } : c
                                )
                              );
                            }}
                            style={{ flex: 1 }}
                          />
                          <NumberInput
                            value={criterion.weight}
                            onChange={(value) => {
                              setCustomCriteria(prev =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, weight: Number(value) } : c
                                )
                              );
                            }}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            style={{ width: 100 }}
                          />
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                  <Button variant="outline" onClick={addCustomCriterion} size="sm">
                    Add Criterion
                  </Button>
                </>
              )}
            </Stack>
          </Stepper.Step>
          
          <Stepper.Completed>
            <Stack mt="xl" align="center">
              {isUploading ? (
                <>
                  <IconUpload size={48} />
                  <Title order={3}>Uploading Recording...</Title>
                  <Text c="dimmed">Please don't close this page</Text>
                  <Progress value={uploadProgress} w="100%" mt="md" />
                  <Text size="sm">{uploadProgress}% uploaded</Text>
                </>
              ) : (
                <>
                  <IconCheck size={48} color="green" />
                  <Title order={3}>Ready to Upload</Title>
                  <Text c="dimmed">Review your settings and click submit to start processing</Text>
                  
                  <Paper withBorder p="md" w="100%" mt="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>Teacher:</Text>
                        <Text size="sm">{mockTeachers.find(t => t.value === selectedTeacher)?.label}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>Class:</Text>
                        <Text size="sm">{className} - {subject} (Grade {grade})</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>Template:</Text>
                        <Text size="sm">{mockTemplates.find(t => t.id === selectedTemplate)?.name}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>File:</Text>
                        <Text size="sm">{audioFile?.name}</Text>
                      </Group>
                    </Stack>
                  </Paper>
                  
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    loading={isUploading}
                    leftSection={<IconUpload size={20} />}
                  >
                    Upload and Start Processing
                  </Button>
                </>
              )}
            </Stack>
          </Stepper.Completed>
        </Stepper>
        
        {active < 4 && (
          <Group justify="space-between" mt="xl">
            <Button variant="default" onClick={prevStep} disabled={active === 0}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!isStepValid()}>
              Next
            </Button>
          </Group>
        )}
      </Paper>
    </Container>
  );
}