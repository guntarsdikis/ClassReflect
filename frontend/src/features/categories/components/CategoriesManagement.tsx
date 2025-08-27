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
  NumberInput,
  Textarea,
  Space,
  Flex,
  Alert,
  Select,
} from '@mantine/core';
import {
  IconCategory,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useAuthStore } from '@store/auth.store';
import { schoolsService, School } from '@features/schools/services/schools.service';

interface AnalysisCriterion {
  id: number;
  school_id: number;
  criteria_name: string;
  criteria_description?: string;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CriterionFormData {
  criteria_name: string;
  criteria_description: string;
  weight: number;
  schoolId: number;
}

export function CategoriesManagement() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user.role === 'super_admin';
  const isSchoolManager = user.role === 'school_manager';
  const currentUserSchoolId = user.schoolId;
  
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  
  const [criteria, setCriteria] = useState<AnalysisCriterion[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSchoolManager ? currentUserSchoolId : 0
  );
  const [editingCriterion, setEditingCriterion] = useState<AnalysisCriterion | null>(null);
  
  const [formData, setFormData] = useState<CriterionFormData>({
    criteria_name: '',
    criteria_description: '',
    weight: 1.0,
    schoolId: isSchoolManager ? currentUserSchoolId : 0,
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load criteria when school selection changes
  useEffect(() => {
    if (selectedSchoolId > 0) {
      loadCriteria(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (isSuperAdmin) {
        // Super admin can see all schools
        const schoolsData = await schoolsService.getAllSchools();
        setSchools(schoolsData);
        if (schoolsData.length > 0 && selectedSchoolId === 0) {
          setSelectedSchoolId(schoolsData[0].id);
        }
      } else if (isSchoolManager) {
        // School manager can only manage their own school
        const schoolData = await schoolsService.getSchool(currentUserSchoolId);
        setSchools([schoolData]);
        setSelectedSchoolId(currentUserSchoolId);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load schools data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCriteria = async (schoolId: number) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/criteria`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch criteria');
      }
      
      const data = await response.json();
      setCriteria(data);
    } catch (error) {
      console.error('Failed to load criteria:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load analysis criteria',
        color: 'red',
      });
    }
  };

  const handleCreateCriterion = () => {
    setEditingCriterion(null);
    setFormData({
      criteria_name: '',
      criteria_description: '',
      weight: 1.0,
      schoolId: selectedSchoolId,
    });
    openModal();
  };

  const handleEditCriterion = (criterion: AnalysisCriterion) => {
    setEditingCriterion(criterion);
    setFormData({
      criteria_name: criterion.criteria_name,
      criteria_description: criterion.criteria_description || '',
      weight: criterion.weight,
      schoolId: criterion.school_id,
    });
    openModal();
  };

  const handleSaveCriterion = async () => {
    try {
      if (!formData.criteria_name) {
        notifications.show({
          title: 'Error',
          message: 'Criterion name is required',
          color: 'red',
        });
        return;
      }

      const url = editingCriterion 
        ? `/api/schools/${formData.schoolId}/criteria/${editingCriterion.id}`
        : `/api/schools/${formData.schoolId}/criteria`;
      
      const method = editingCriterion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria_name: formData.criteria_name,
          criteria_description: formData.criteria_description,
          weight: formData.weight,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save criterion');
      }

      notifications.show({
        title: 'Success',
        message: `Analysis criterion ${editingCriterion ? 'updated' : 'created'} successfully`,
        color: 'green',
      });

      await loadCriteria(selectedSchoolId);
      closeModal();
    } catch (error) {
      console.error('Failed to save criterion:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save analysis criterion',
        color: 'red',
      });
    }
  };

  const handleDeleteCriterion = (criterion: AnalysisCriterion) => {
    modals.openConfirmModal({
      title: 'Delete Analysis Criterion',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{criterion.criteria_name}</strong>? 
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => confirmDeleteCriterion(criterion.id),
    });
  };

  const confirmDeleteCriterion = async (criterionId: number) => {
    try {
      const response = await fetch(`/api/schools/${selectedSchoolId}/criteria/${criterionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete criterion');
      }

      notifications.show({
        title: 'Success',
        message: 'Analysis criterion deleted successfully',
        color: 'green',
      });

      await loadCriteria(selectedSchoolId);
    } catch (error) {
      console.error('Failed to delete criterion:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete analysis criterion',
        color: 'red',
      });
    }
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>
            {isSchoolManager ? 'Analysis Categories' : 'Categories Management'}
          </Title>
          <Text c="dimmed">
            {isSchoolManager 
              ? 'Manage analysis criteria for your school' 
              : 'Manage analysis criteria for schools'
            }
          </Text>
        </div>
        <Group>
          {selectedSchoolId > 0 && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateCriterion}
            >
              Add Criterion
            </Button>
          )}
        </Group>
      </Group>

      {isSuperAdmin && (
        <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
          <Group>
            <Select
              label="School"
              placeholder="Select a school"
              value={selectedSchoolId.toString()}
              onChange={(value) => setSelectedSchoolId(parseInt(value || '0'))}
              data={schools.map(school => ({
                value: school.id.toString(),
                label: school.name,
              }))}
              style={{ flex: 1 }}
            />
          </Group>
        </Card>
      )}

      {selectedSchoolId === 0 ? (
        <Alert variant="light" color="blue" icon={<IconAlertCircle />}>
          Please select a school to manage analysis criteria.
        </Alert>
      ) : (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>
              Analysis Criteria - {selectedSchool?.name}
            </Title>
            <Badge variant="light" color="blue">
              {criteria.length} Criteria
            </Badge>
          </Group>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Text c="dimmed">Loading criteria...</Text>
            </div>
          ) : criteria.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Text c="dimmed">No analysis criteria found</Text>
              <Text size="sm" c="dimmed">
                Create your first analysis criterion to get started.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Criterion Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Weight</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {criteria.map((criterion) => (
                  <Table.Tr key={criterion.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{criterion.criteria_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {criterion.criteria_description || 'No description'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray">
                        {criterion.weight}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue"
                          onClick={() => handleEditCriterion(criterion)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="red"
                          onClick={() => handleDeleteCriterion(criterion)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Create/Edit Criterion Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={
          <Group>
            <IconCategory size={20} />
            <Text fw={600}>
              {editingCriterion ? 'Edit Analysis Criterion' : 'Create Analysis Criterion'}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <TextInput
            label="Criterion Name"
            placeholder="e.g., Student Engagement"
            value={formData.criteria_name}
            onChange={(e) => setFormData({...formData, criteria_name: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe what this criterion evaluates..."
            value={formData.criteria_description}
            onChange={(e) => setFormData({...formData, criteria_description: e.target.value})}
            rows={3}
          />

          <NumberInput
            label="Weight"
            description="Higher weights give this criterion more importance in analysis"
            value={formData.weight}
            onChange={(value) => setFormData({...formData, weight: Number(value)})}
            min={0.1}
            max={5.0}
            step={0.1}
            decimalScale={1}
            required
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCriterion}
              leftSection={editingCriterion ? <IconCheck size={16} /> : <IconPlus size={16} />}
            >
              {editingCriterion ? 'Update Criterion' : 'Create Criterion'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}