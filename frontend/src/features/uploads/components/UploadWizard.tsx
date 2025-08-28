import { useState, useEffect } from 'react';
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
import { useAuthStore } from '@store/auth.store';
import { templatesService, Template } from '@features/templates/services/templates.service';
import { usersService, User } from '@features/users/services/users.service';

interface CriterionConfig {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  customPrompt?: string;
}

export function UploadWizard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [active, setActive] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
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

  useEffect(() => {
    loadTemplates();
    loadTeachers();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await templatesService.getTemplates();
      console.log('Loaded templates:', templatesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const teachersData = await usersService.getTeachers();
      setTeachers(teachersData);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load teachers',
        color: 'red',
      });
    } finally {
      setLoadingTeachers(false);
    }
  };
  
  const handleTemplateSelect = async (templateId: string) => {
    console.log('Template selected:', templateId);
    setSelectedTemplate(templateId);
    
    try {
      // Get detailed template with criteria
      const detailedTemplate = await templatesService.getTemplate(parseInt(templateId));
      console.log('Detailed template loaded:', detailedTemplate);
      
      if (detailedTemplate.criteria && detailedTemplate.criteria.length > 0) {
        console.log('Template criteria:', detailedTemplate.criteria);
        const mappedCriteria = detailedTemplate.criteria.map(c => ({
          id: c.id?.toString() || Math.random().toString(),
          name: c.criteria_name,
          weight: c.weight * 100, // Convert from 0-1 to percentage
          enabled: true,
          customPrompt: '',
        }));
        console.log('Mapped criteria:', mappedCriteria);
        setCriteria(mappedCriteria);
        setCustomCriteria([]);
      } else {
        console.log('No template criteria found - template has no configured criteria');
        setCriteria([]);
        setCustomCriteria([
          { id: 'custom1', name: 'Teaching Quality', weight: 100, enabled: true },
        ]);
      }
    } catch (error) {
      console.error('Failed to load detailed template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load template details',
        color: 'red',
      });
      setCriteria([]);
      setCustomCriteria([]);
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
    if (!audioFile || !selectedTeacher || !user?.schoolId) {
      notifications.show({
        title: 'Error',
        message: 'Missing required information',
        color: 'red',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Prepare form data for upload
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('teacherId', selectedTeacher);
      formData.append('schoolId', user.schoolId.toString());
      
      // Add class information
      formData.append('className', className);
      formData.append('subject', subject);
      formData.append('grade', grade);
      formData.append('duration', duration.toString());
      formData.append('notes', notes);
      
      // Add template information
      if (selectedTemplate !== 'custom') {
        formData.append('templateId', selectedTemplate);
      }
      
      // Add criteria configuration
      const enabledCriteria = criteria.filter(c => c.enabled);
      formData.append('criteria', JSON.stringify(enabledCriteria));
      formData.append('customCriteria', JSON.stringify(customCriteria));
      formData.append('useStudentAudio', useStudentAudio.toString());
      formData.append('focusAreas', JSON.stringify(focusAreas));

      // Upload file
      const response = await fetch('/api/upload/direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setIsUploading(false);
      notifications.show({
        title: 'Upload Successful',
        message: 'Recording has been uploaded and processing has started.',
        color: 'green',
        icon: <IconCheck />,
      });
      
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      notifications.show({
        title: 'Upload Failed',
        message: error.message || 'Failed to upload recording',
        color: 'red',
      });
    }
  };
  
  const nextStep = () => setActive((current) => (current < 4 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
  
  const isStepValid = () => {
    switch (active) {
      case 0:
        return selectedTemplate;
      case 1:
        return selectedTeacher && audioFile;
      case 2:
        return className && subject && grade;
      case 3:
        const enabledCriteria = criteria.filter(c => c.enabled);
        const totalWeight = enabledCriteria.reduce((sum, c) => sum + c.weight, 0);
        console.log('Step 3 validation:', { enabledCriteria, totalWeight, isValid: enabledCriteria.length > 0 && totalWeight === 100 });
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
            label="Select Template"
            description="Choose evaluation template"
            icon={<IconTemplate size={18} />}
          >
            <Stack mt="xl">
              <Text size="sm" c="dimmed" mb="md">
                Select an evaluation template that best matches your needs
              </Text>
              
              {loading ? (
                <Text>Loading templates...</Text>
              ) : (
                <Radio.Group value={selectedTemplate} onChange={handleTemplateSelect}>
                  <Stack>
                    {templates.map((template) => (
                      <Card key={template.id} withBorder p="md">
                        <Radio
                          value={template.id.toString()}
                          label={
                            <Group justify="space-between" style={{ flex: 1 }}>
                              <div>
                                <Text fw={500}>{template.template_name}</Text>
                                <Text size="xs" c="dimmed">{template.description}</Text>
                              </div>
                              <Group gap="xs">
                                <Badge variant="light">{template.category}</Badge>
                                {template.grade_levels.length > 0 && (
                                  <Badge variant="outline" size="sm">
                                    Grades: {template.grade_levels.join(', ')}
                                  </Badge>
                                )}
                              </Group>
                            </Group>
                          }
                        />
                        {template.criteria && template.criteria.length > 0 && (
                          <Group gap={4} mt="xs" ml="xl">
                            {template.criteria.map((criterion) => (
                              <Badge key={criterion.id || criterion.criteria_name} size="xs" variant="dot">
                                {criterion.criteria_name} ({Math.round(criterion.weight * 100)}%)
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Card>
                    ))}
                    
                    {/* Add custom option */}
                    <Card withBorder p="md">
                      <Radio
                        value="custom"
                        label={
                          <Group justify="space-between" style={{ flex: 1 }}>
                            <div>
                              <Text fw={500}>Custom Evaluation</Text>
                              <Text size="xs" c="dimmed">Create your own evaluation criteria</Text>
                            </div>
                            <Badge variant="light">Custom</Badge>
                          </Group>
                        }
                      />
                    </Card>
                  </Stack>
                </Radio.Group>
              )}
            </Stack>
          </Stepper.Step>
          
          <Stepper.Step
            label="Upload Recording"
            description="Select teacher and audio file"
            icon={<IconUpload size={18} />}
          >
            <Stack mt="xl">
              <Select
                label="Select Teacher"
                placeholder={loadingTeachers ? "Loading teachers..." : "Choose a teacher"}
                data={teachers.map(teacher => ({
                  value: teacher.id.toString(),
                  label: `${teacher.firstName} ${teacher.lastName}${teacher.subjects?.length ? ` - ${teacher.subjects.join(', ')}` : ''}${teacher.grades?.length ? ` (Grades ${teacher.grades.join(', ')})` : ''}`
                }))}
                value={selectedTeacher}
                onChange={(value) => setSelectedTeacher(value || '')}
                required
                searchable
                disabled={loadingTeachers}
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
                  <Button variant="outline" onClick={addCustomCriterion} size={32}>
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
                        <Text size="sm">{(() => {
                          const teacher = teachers.find(t => t.id.toString() === selectedTeacher);
                          return teacher ? `${teacher.firstName} ${teacher.lastName}${teacher.subjects?.length ? ` - ${teacher.subjects.join(', ')}` : ''}${teacher.grades?.length ? ` (Grades ${teacher.grades.join(', ')})` : ''}` : 'Selected teacher';
                        })()}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>Class:</Text>
                        <Text size="sm">{className} - {subject} (Grade {grade})</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>Template:</Text>
                        <Text size="sm">
                          {selectedTemplate === 'custom' 
                            ? 'Custom Evaluation' 
                            : templates.find(t => t.id.toString() === selectedTemplate)?.template_name
                          }
                        </Text>
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