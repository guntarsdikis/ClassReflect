import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Space,
  Flex,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconBook,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { subjectsService, SchoolSubject, CreateSubjectRequest } from '../services/subjects.service';
import { useAuthStore } from '@store/auth.store';
import { useSchoolContextStore } from '@store/school-context.store';

interface SubjectFormData extends CreateSubjectRequest {}

export function SubjectManagement() {
  const currentUser = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
  
  const [formData, setFormData] = useState<SubjectFormData>({
    subject_name: '',
    description: '',
  });

  // Role-based access control
  const isSchoolManager = currentUser.role === 'school_manager';
  const isSuperAdmin = currentUser.role === 'super_admin';
  
  // Determine which school ID to use
  const getEffectiveSchoolId = () => {
    if (isSuperAdmin) {
      return selectedSchool?.id || null;
    }
    return currentUser.schoolId;
  };
  
  const currentSchoolId = getEffectiveSchoolId();

  useEffect(() => {
    if (currentSchoolId) {
      loadSubjects();
    }
  }, [currentSchoolId, selectedSchool]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      if (currentSchoolId) {
        const data = await subjectsService.getSchoolSubjects(currentSchoolId);
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load subjects',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleCreateSubject = () => {
    setEditingSubject(null);
    setFormData({
      subject_name: '',
      description: '',
    });
    openModal();
  };

  const handleEditSubject = (subject: SchoolSubject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      description: subject.description || '',
    });
    openModal();
  };

  const handleSaveSubject = async () => {
    try {
      if (!formData.subject_name.trim()) {
        notifications.show({
          title: 'Error',
          message: 'Subject name is required',
          color: 'red',
        });
        return;
      }

      if (!currentSchoolId) {
        notifications.show({
          title: 'Error',
          message: 'School ID is required',
          color: 'red',
        });
        return;
      }

      if (editingSubject) {
        await subjectsService.updateSubject(currentSchoolId, editingSubject.id, formData);
        notifications.show({
          title: 'Success',
          message: 'Subject updated successfully',
          color: 'green',
        });
      } else {
        await subjectsService.createSubject(currentSchoolId, formData);
        notifications.show({
          title: 'Success',
          message: 'Subject created successfully',
          color: 'green',
        });
      }
      
      await loadSubjects();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save subject:', error);
      const message = error?.response?.data?.error || 'Failed to save subject';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  };

  const handleDeleteSubject = (subject: SchoolSubject) => {
    modals.openConfirmModal({
      title: 'Delete Subject',
      children: (
        <div>
          <Text size="sm">
            Are you sure you want to delete "{subject.subject_name}"? This action cannot be undone.
            Teachers assigned to this subject will need to be updated.
          </Text>
        </div>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          if (currentSchoolId) {
            await subjectsService.deleteSubject(currentSchoolId, subject.id);
            notifications.show({
              title: 'Success',
              message: 'Subject deleted successfully',
              color: 'green',
            });
            await loadSubjects();
          }
        } catch (error: any) {
          console.error('Failed to delete subject:', error);
          const message = error?.response?.data?.error || 'Failed to delete subject';
          notifications.show({
            title: 'Error',
            message,
            color: 'red',
          });
        }
      },
    });
  };

  const handleAddDefaultSubjects = async () => {
    try {
      if (!currentSchoolId) return;

      const defaultSubjects = subjectsService.getDefaultSubjects();
      const existingNames = subjects.map(s => s.subject_name);
      const newSubjects = defaultSubjects.filter(name => !existingNames.includes(name));

      if (newSubjects.length === 0) {
        notifications.show({
          title: 'Info',
          message: 'All default test subjects are already added for this school',
          color: 'blue',
        });
        return;
      }

      let successCount = 0;
      for (const subjectName of newSubjects) {
        try {
          await subjectsService.createSubject(currentSchoolId, {
            subject_name: subjectName,
            description: `Default ${subjectName} subject for testing`,
          });
          successCount++;
        } catch (error) {
          console.warn(`Failed to create ${subjectName}:`, error);
        }
      }

      notifications.show({
        title: 'Success',
        message: `Added ${successCount} default test subjects`,
        color: 'green',
      });

      await loadSubjects();
    } catch (error) {
      console.error('Failed to add default subjects:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add default subjects',
        color: 'red',
      });
    }
  };

  if (!isSchoolManager && !isSuperAdmin) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Access Denied" color="red">
          You don't have permission to manage subjects.
        </Alert>
      </Container>
    );
  }

  // Show message for super admin when no school is selected
  if (isSuperAdmin && !currentSchoolId) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to manage subjects.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <div>
            <Title order={2}>Subject Management</Title>
            <Text c="dimmed" size="sm">
              {isSuperAdmin && selectedSchool 
                ? `Managing subjects for ${selectedSchool.name}`
                : 'Manage the subjects available for teachers in your school'
              }
            </Text>
          </div>
          <Group>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddDefaultSubjects}
              disabled={loading}
            >
              Add Test Subjects
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateSubject}
              disabled={loading}
            >
              Add Subject
            </Button>
          </Group>
        </Group>

        <Card>
          {loading ? (
            <Group justify="center" py="xl">
              <Loader />
              <Text>Loading subjects...</Text>
            </Group>
          ) : subjects.length === 0 ? (
            <Group justify="center" py="xl">
              <Stack align="center">
                <IconBook size={48} stroke={1} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed">No subjects found</Text>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreateSubject}>
                  Add Your First Subject
                </Button>
              </Stack>
            </Group>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Subject Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subjects.map((subject) => (
                  <Table.Tr key={subject.id}>
                    <Table.Td>
                      <Text fw={500}>{subject.subject_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {subject.description || 'No description'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={subject.is_active ? 'green' : 'red'} size="sm">
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(subject.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="blue"
                          onClick={() => handleEditSubject(subject)}
                          title="Edit subject"
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteSubject(subject)}
                          title="Delete subject"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>

      {/* Create/Edit Subject Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={
          <Group>
            <IconBook size={20} />
            <Text fw={600}>
              {editingSubject ? 'Edit Subject' : 'Create New Subject'}
            </Text>
          </Group>
        }
        size="md"
      >
        <Stack>
          <TextInput
            label="Subject Name"
            placeholder="e.g., Advanced Mathematics"
            value={formData.subject_name}
            onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Brief description of the subject (optional)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSubject}
              leftSection={editingSubject ? <IconCheck size={16} /> : <IconPlus size={16} />}
            >
              {editingSubject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}