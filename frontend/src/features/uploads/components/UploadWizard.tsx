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
import { useSchoolContextStore } from '@store/school-context.store';
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
  const { selectedSchool } = useSchoolContextStore();
  const [active, setActive] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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

  // Determine which school ID to use
  const getEffectiveSchoolId = () => {
    if (user?.role === 'super_admin') {
      return selectedSchool?.id || null;
    }
    return user?.schoolId || null;
  };

  const currentSchoolId = getEffectiveSchoolId();

  useEffect(() => {
    if (currentSchoolId) {
      loadTeachers();
    }
  }, [currentSchoolId, selectedSchool]);

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const teachersData = await usersService.getTeachers(currentSchoolId);
      console.log('Loaded teachers for school:', currentSchoolId, teachersData);
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
  
  const handleSubmit = async () => {
    console.log('🚀 Frontend Upload Debug - handleSubmit called');
    console.log('🚀 Upload Debug - Form validation check:', {
      audioFile: audioFile ? `File: ${audioFile.name}` : 'NULL',
      selectedTeacher,
      currentSchoolId,
      className,
      subject,
      grade
    });
    
    if (!audioFile || !selectedTeacher || !currentSchoolId) {
      console.log('❌ Frontend Upload Debug - Validation failed:', {
        audioFile: !!audioFile,
        selectedTeacher: !!selectedTeacher,
        currentSchoolId: !!currentSchoolId
      });
      notifications.show({
        title: 'Error',
        message: 'Missing required information',
        color: 'red',
      });
      return;
    }
    
    console.log('✅ Frontend Upload Debug - Validation passed, proceeding with upload');

    setIsUploading(true);
    setUploadProgress(0); // Reset progress for new upload
    
    try {
      // Prepare form data for upload
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('teacherId', selectedTeacher);
      formData.append('schoolId', currentSchoolId.toString());
      
      // Add class information
      formData.append('className', className);
      formData.append('subject', subject);
      formData.append('grade', grade);
      formData.append('duration', duration.toString());
      formData.append('notes', notes);

      // Upload file - get token from auth store (consistent with other API calls)
      const authStoreToken = useAuthStore.getState().token;
      const localStorageToken = localStorage.getItem('authToken');
      
      console.log('🔍 Upload Debug - Auth store token:', authStoreToken ? `Length: ${authStoreToken.length}` : 'NULL');
      console.log('🔍 Upload Debug - localStorage token:', localStorageToken ? `Length: ${localStorageToken.length}` : 'NULL');
      
      const token = authStoreToken || localStorageToken;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/direct`;
      console.log('🚀 Frontend Upload Debug - Making XMLHttpRequest with progress tracking to:', apiUrl);
      console.log('🚀 Frontend Upload Debug - Token available:', token ? `Length: ${token.length}` : 'NULL');
      console.log('🚀 Frontend Upload Debug - File size:', audioFile.size, 'bytes (', Math.round(audioFile.size / 1024 / 1024), 'MB)');
      
      // Use XMLHttpRequest for upload progress tracking
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            console.log('📊 Upload progress:', percentComplete, '% (', event.loaded, '/', event.total, 'bytes)');
            setUploadProgress(percentComplete);
          }
        });
        
        // Handle upload completion
        xhr.addEventListener('load', () => {
          console.log('🚀 Frontend Upload Debug - Response received:', {
            status: xhr.status,
            statusText: xhr.statusText,
            ok: xhr.status >= 200 && xhr.status < 300
          });
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Failed to parse response JSON'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });
        
        // Handle upload errors
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed: Network error'));
        });
        
        // Handle upload timeout
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload failed: Request timeout'));
        });
        
        // Configure and send request
        xhr.open('POST', apiUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 10 * 60 * 1000; // 10 minutes timeout for large files
        xhr.send(formData);
      });
      
      setIsUploading(false);
      notifications.show({
        title: 'Upload Successful',
        message: 'Recording has been uploaded and processing has started.',
        color: 'green',
        icon: <IconCheck />,
      });
      
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('❌ Frontend Upload Debug - Error occurred:', error);
      console.error('❌ Frontend Upload Debug - Error message:', error.message);
      console.error('❌ Frontend Upload Debug - Error stack:', error.stack);
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
      notifications.show({
        title: 'Upload Failed',
        message: error.message || 'Failed to upload recording',
        color: 'red',
      });
    }
  };
  
  const nextStep = () => {
    console.log('🚀 Upload Debug - Next step clicked, current:', active);
    const newStep = current => (current < 2 ? current + 1 : current);
    setActive(newStep);
    console.log('🚀 Upload Debug - New step will be:', newStep(active));
  };
  const prevStep = () => {
    console.log('🚀 Upload Debug - Previous step clicked, current:', active);
    setActive((current) => (current > 0 ? current - 1 : current));
  };
  
  const isStepValid = () => {
    let valid = false;
    switch (active) {
      case 0:
        valid = !!audioFile;
        break;
      case 1:
        valid = !!(selectedTeacher && className && subject && grade);
        break;
      case 2:
        valid = true; // Review step
        break;
      default:
        valid = true;
    }
    console.log('🚀 Upload Debug - Step validation:', { 
      step: active, 
      valid, 
      audioFile: !!audioFile,
      selectedTeacher: !!selectedTeacher,
      className: !!className,
      subject: !!subject,
      grade: !!grade
    });
    return valid;
  };

  // Show message for super admin when no school is selected
  if (user?.role === 'super_admin' && !currentSchoolId) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to upload recordings.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container size="lg">
      <Paper shadow="sm" radius="md" p="lg" withBorder>
        <Title order={2} mb="xl">
          Upload Class Recording
          {user?.role === 'super_admin' && selectedSchool && (
            <Text size="sm" c="dimmed" fw={400} mt={4}>
              Uploading for {selectedSchool.name}
            </Text>
          )}
        </Title>
        
        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step
            label="Upload File"
            description="Select audio file"
            icon={<IconUpload size={18} />}
          >
            <Stack mt="xl">
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
              <Select
                label="Teacher"
                placeholder={loadingTeachers ? "Loading teachers..." : "Select a teacher"}
                data={teachers.map(teacher => ({
                  value: teacher.id.toString(),
                  label: `${teacher.firstName} ${teacher.lastName}${teacher.subjects?.length ? ` - ${teacher.subjects.join(', ')}` : ''}${teacher.grades?.length ? ` (Grades ${teacher.grades.join(', ')})` : ''}`
                }))}
                value={selectedTeacher}
                onChange={(value) => setSelectedTeacher(value || '')}
                required
                disabled={loadingTeachers}
              />
              
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
                placeholder="Any specific context or notes about this recording"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
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
                        <Text size="sm" fw={500}>Duration:</Text>
                        <Text size="sm">{duration} minutes</Text>
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
        
        {active < 3 && (
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