import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Tabs,
  Divider,
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
import { subjectsService, type SchoolSubject } from '@features/schools/services/subjects.service';
import { usersService, User } from '@features/users/services/users.service';
import { RecordingPanel } from './RecordingPanel';

interface CriterionConfig {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  customPrompt?: string;
}

export function UploadWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const [active, setActive] = useState(0);
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
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
  const isTeacher = user?.role === 'teacher';

  // If URL contains ?mode=record, default to recording tab
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'record') setInputMode('record');
  }, [searchParams]);

  useEffect(() => {
    // If current user is a teacher, auto-select themselves
    if (isTeacher && user?.id) {
      setSelectedTeacher(user.id.toString());
    }
    // Only load teachers list for school managers/admins
    else if (currentSchoolId && !isTeacher) {
      loadTeachers();
    }
    // Load subjects for the selected school
    if (currentSchoolId) {
      loadSubjects();
    }
  }, [currentSchoolId, selectedSchool, isTeacher, user?.id]);

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

  const handleFileChange = async (file: File | null) => {
    if (file) {
      console.log('🚀 File Debug - Starting file selection:', file.name);
      setIsFileLoading(true);
      
      // Small delay to ensure loading state is visible and file is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🚀 File Debug - File selection complete:', file.name);
      setAudioFile(file);
      setIsFileLoading(false);
    } else {
      setAudioFile(null);
      setIsFileLoading(false);
    }
  };

  const handleRecordingComplete = (file: File) => {
    // When recording completes, set as selected audio file and switch to Upload mode for clarity
    setAudioFile(file);
    setInputMode('upload');
    notifications.show({
      title: 'Recording Ready',
      message: `Captured ${file.name}. You can proceed to the next step.`,
      color: 'green',
    });
  };
  
  const loadSubjects = async () => {
    if (!currentSchoolId) return;
    try {
      setLoadingSubjects(true);
      const subjects = await subjectsService.getSchoolSubjects(currentSchoolId);
      setSchoolSubjects(subjects);
      // Keep existing selection if still valid; otherwise clear
      if (subject && !subjects.some(s => s.subject_name === subject)) {
        setSubject('');
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
      // Fallback to defaults so the user can still proceed
      const defaults = subjectsService.getDefaultSubjects();
      setSchoolSubjects(defaults.map((name, idx) => ({
        id: idx + 1,
        subject_name: name,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as unknown as SchoolSubject[]);
    } finally {
      setLoadingSubjects(false);
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
      // Upload file - get token
      const authStoreToken = useAuthStore.getState().token;
      const localStorageToken = localStorage.getItem('authToken');
      const token = authStoreToken || localStorageToken;
      if (!token) throw new Error('No authentication token available');

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const presignUrl = `${baseUrl}/api/upload/presigned-put`;

      // 1) Ask backend for a presigned PUT URL (create job in DB)
      console.log('🚀 Frontend Upload Debug - Requesting presigned URL:', presignUrl);
      const presignRes = await fetch(presignUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: audioFile.name,
          fileType: audioFile.type || 'application/octet-stream',
          fileSize: audioFile.size,
          teacherId: selectedTeacher,
          schoolId: currentSchoolId,
          className,
          subject,
          grade,
          duration,
          notes
        })
      });

      if (!presignRes.ok) {
        // If file is very large, avoid direct memory upload fallback
        if (audioFile.size > 500 * 1024 * 1024) {
          throw new Error('S3 presign failed. Cannot upload large files via direct path. Please retry.');
        }
        console.warn('⚠️ Presign failed; falling back to direct upload');
        await directUploadViaBackend(token);
        return;
      }

      const { jobId, uploadUrl, uploadHost, uploadPath, sse, sseKmsKeyId, acl, signingAccessKeyId } = await presignRes.json();
      console.log('🚀 Frontend Upload Debug - Presigned URL details:', { uploadHost, uploadPath, hasUrl: !!uploadUrl, sse, sseKmsKeyId, acl, signingAccessKeyId });
      if (!jobId || !uploadUrl) {
        throw new Error('Invalid presigned URL response');
      }
      try {
        const u = new URL(uploadUrl);
        console.log('🚀 Frontend Upload Debug - Using upload URL:', { host: u.host, path: u.pathname });
        if (u.host === 's3.eu-west-2.amazonaws.com' && (u.pathname === '/' || u.pathname === '')) {
          throw new Error('Invalid presigned URL host/path (root S3). Please retry.');
        }
      } catch (e) {
        console.warn('⚠️ Invalid presigned URL format', e);
      }

      // 2) PUT to S3 with progress
      console.log('🚀 Frontend Upload Debug - Uploading to S3:', { jobId });
      let usedDirectFallback = false;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Extract S3 XML error details if present
            let s3ErrorCode: string | undefined;
            let s3ErrorMessage: string | undefined;
            const body = xhr.responseText || '';
            try {
              const matchCode = body.match(/<Code>([^<]+)<\/Code>/i);
              const matchMsg = body.match(/<Message>([^<]+)<\/Message>/i);
              s3ErrorCode = matchCode?.[1];
              s3ErrorMessage = matchMsg?.[1];
            } catch {}
            console.error('❌ S3 Upload Error', {
              status: xhr.status,
              statusText: xhr.statusText,
              url: uploadUrl,
              responseText: body?.slice(0, 1000)
            });
            const errText = s3ErrorCode || s3ErrorMessage
              ? `S3 upload failed: ${xhr.status} ${xhr.statusText} (${s3ErrorCode}: ${s3ErrorMessage})`
              : `S3 upload failed: ${xhr.status} ${xhr.statusText}`;
            // Optional fallback for 403s within size limits
            if (xhr.status === 403 && audioFile.size <= 500 * 1024 * 1024) {
              console.warn('⚠️ S3 PUT 403. Attempting direct upload fallback...');
              usedDirectFallback = true;
              directUploadViaBackend(token)
                .then(() => resolve())
                .catch((e) => reject(e));
              return;
            }
            reject(new Error(errText));
          }
        });
        xhr.addEventListener('error', () => {
          console.error('❌ S3 upload network error', { url: uploadUrl });
          reject(new Error('S3 upload network error'));
        });
        xhr.addEventListener('timeout', () => reject(new Error('S3 upload timeout')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', audioFile.type || 'application/octet-stream');
        // If backend indicates SSE is required, include matching headers so the signature is valid.
        if (sse === 'AES256') {
          xhr.setRequestHeader('x-amz-server-side-encryption', 'AES256');
        } else if (sse === 'aws:kms') {
          xhr.setRequestHeader('x-amz-server-side-encryption', 'aws:kms');
          if (sseKmsKeyId) {
            xhr.setRequestHeader('x-amz-server-side-encryption-aws-kms-key-id', sseKmsKeyId);
          }
        }
        if (acl) {
          xhr.setRequestHeader('x-amz-acl', acl);
        }
        xhr.timeout = 4 * 60 * 60 * 1000; // up to 4 hours for very large files
        xhr.send(audioFile);
      });

      // 3) If we fell back to direct upload, skip S3 completion and finish here
      if (usedDirectFallback) {
        console.log('ℹ️ Frontend Upload Debug - Skipping S3 /complete due to direct fallback');
        setIsUploading(false);
        notifications.show({
          title: 'Upload Successful',
          message: 'Recording uploaded. Processing started.',
          color: 'green',
          icon: <IconCheck />,
        });
        // Invalidate recordings cache to trigger refresh
        queryClient.invalidateQueries({ queryKey: ['recordings'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-recordings'] });
        // Redirect based on user role
        const redirectPath = user?.role === 'teacher' ? '/reports' : '/recordings';
        navigate(redirectPath);
        return; // do not proceed to /complete
      }

      // Otherwise, notify backend to start processing from S3
      const completeUrl = `${baseUrl}/api/upload/complete`;
      const completeRes = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId })
      });
      if (!completeRes.ok) {
        const msg = await completeRes.text();
        throw new Error(`Failed to start processing: ${msg}`);
      }

      setIsUploading(false);
      notifications.show({
        title: 'Upload Successful',
        message: 'File uploaded to S3. Processing started.',
        color: 'green',
        icon: <IconCheck />,
      });
      // Invalidate recordings cache to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-recordings'] });
      // After successful upload, return to one-pager recordings view
      // Redirect based on user role
        const redirectPath = user?.role === 'teacher' ? '/reports' : '/recordings';
        navigate(redirectPath);

    } catch (error: any) {
      console.error('❌ Frontend Upload Debug - Error occurred:', error);
      setIsUploading(false);
      setUploadProgress(0);
      notifications.show({
        title: 'Upload Failed',
        message: error.message || 'Failed to upload recording',
        color: 'red',
      });
    }
  };

  // Fallback direct upload to backend (existing behavior)
  const directUploadViaBackend = async (token: string) => {
    const formData = new FormData();
    formData.append('audio', audioFile!);
    formData.append('teacherId', selectedTeacher);
    formData.append('schoolId', currentSchoolId!.toString());
    formData.append('className', className);
    formData.append('subject', subject);
    formData.append('grade', grade);
    formData.append('duration', duration.toString());
    formData.append('notes', notes);

    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/direct`;
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(null);
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Upload failed: Network error')));
      xhr.addEventListener('timeout', () => reject(new Error('Upload failed: Request timeout')));
      xhr.open('POST', apiUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 4 * 60 * 60 * 1000;
      xhr.send(formData);
    });

    notifications.show({
      title: 'Upload Successful',
      message: 'Recording uploaded. Processing started.',
      color: 'green',
      icon: <IconCheck />,
    });
    // Invalidate recordings cache to trigger refresh
    queryClient.invalidateQueries({ queryKey: ['recordings'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-recordings'] });
    // After successful upload, return to one-pager recordings view
    // Redirect based on user role
        const redirectPath = user?.role === 'teacher' ? '/reports' : '/recordings';
        navigate(redirectPath);
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
        valid = !!audioFile && !isFileLoading;
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
      isFileLoading,
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
          <Text size="sm" mt="sm" c="dimmed">
            Super admins can upload for any school, but you must select which school this recording belongs to.
          </Text>
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
            label="Select Recording"
            description="Record or choose a file"
            icon={<IconUpload size={18} />}
          >
            <Stack mt="xl">
              <Tabs value={inputMode} onChange={(v) => setInputMode((v as any) || 'upload')}>
                <Tabs.List>
                  <Tabs.Tab value="record">Record in Browser</Tabs.Tab>
                  <Tabs.Tab value="upload">Upload File</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="record" pl="xs" pt="md">
                  <RecordingPanel
                    onRecorded={handleRecordingComplete}
                    onError={(msg) => notifications.show({ title: 'Recording Error', message: msg, color: 'red' })}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="upload" pl="xs" pt="md">
                  <FileInput
                    label="Audio Recording"
                    placeholder={isFileLoading ? "Processing file..." : "Click to select audio file"}
                    leftSection={<IconFileMusic size={16} />}
                    accept="audio/*"
                    value={audioFile}
                    onChange={handleFileChange}
                    required
                    disabled={isFileLoading}
                    description="Supported: MP3, WAV, M4A, OGG, WEBM. Large files (≤ 1GB) upload via S3 with progress."
                  />
                  {isFileLoading && (
                    <Alert icon={<IconInfoCircle size={16} />} variant="light" color="blue" mt="md">
                      <Text size="sm">Processing file...</Text>
                      <Text size="xs" c="dimmed">Please wait while we prepare your file</Text>
                    </Alert>
                  )}
                  {audioFile && !isFileLoading && (
                    <Alert icon={<IconInfoCircle size={16} />} variant="light" mt="md">
                      <Text size="sm">File: {audioFile.name}</Text>
                      <Text size="sm">Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                    </Alert>
                  )}
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Stepper.Step>
          
          <Stepper.Step
            label="Class Information"
            description="Provide class details"
            icon={<IconInfoCircle size={18} />}
          >
            <Stack mt="xl">
              {isTeacher ? (
                // For teachers - show their info as read-only
                <TextInput
                  label="Teacher"
                  value={`${user?.firstName} ${user?.lastName}`}
                  disabled
                  description="Recording will be associated with your account"
                />
              ) : (
                // For managers/admins - show teacher selection dropdown
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
              )}
              
              <TextInput
                label="Class Name"
                placeholder="e.g., Math Period 3"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
              
              <Select
                label="Subject"
                placeholder={loadingSubjects ? 'Loading subjects...' : 'Select subject'}
                data={schoolSubjects.map(s => s.subject_name)}
                value={subject}
                onChange={(value) => setSubject(value || '')}
                required
                searchable
                nothingFoundMessage={loadingSubjects ? 'Loading...' : 'No subjects found'}
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
        
        {active < 2 && (
          <Group justify="space-between" mt="xl">
            <Button variant="default" onClick={prevStep} disabled={active === 0}>
              Back
            </Button>
            <Button onClick={nextStep} disabled={!isStepValid()}>
              Next
            </Button>
          </Group>
        )}
        
        {active === 2 && !isUploading && (
          <Group justify="center" mt="xl">
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
          </Group>
        )}
      </Paper>
    </Container>
  );
}
