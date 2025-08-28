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
  ColorInput,
  Space,
  Flex,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTag,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { subjectsService, SchoolCategory, CreateCategoryRequest } from '../services/subjects.service';
import { useAuthStore } from '@store/auth.store';

interface CategoryFormData extends CreateCategoryRequest {
  color?: string;
}

export function CategoryManagement() {
  const currentUser = useAuthStore((state) => state.user);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  
  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<SchoolCategory | null>(null);
  
  const [formData, setFormData] = useState<CategoryFormData>({
    category_name: '',
    description: '',
    color: '#339af0',
  });

  // Role-based access control
  const isSchoolManager = currentUser.role === 'school_manager';
  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentSchoolId = currentUser.schoolId;

  useEffect(() => {
    if (currentSchoolId) {
      loadCategories();
    }
  }, [currentSchoolId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      if (currentSchoolId) {
        const data = await subjectsService.getSchoolCategories(currentSchoolId);
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load categories',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({
      category_name: '',
      description: '',
      color: '#339af0',
    });
    openModal();
  };

  const handleEditCategory = (category: SchoolCategory) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.category_name,
      description: category.description || '',
      color: category.color || '#339af0',
    });
    openModal();
  };

  const handleSaveCategory = async () => {
    try {
      if (!formData.category_name.trim()) {
        notifications.show({
          title: 'Error',
          message: 'Category name is required',
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

      if (editingCategory) {
        await subjectsService.updateCategory(currentSchoolId, editingCategory.id, formData);
        notifications.show({
          title: 'Success',
          message: 'Category updated successfully',
          color: 'green',
        });
      } else {
        await subjectsService.createCategory(currentSchoolId, formData);
        notifications.show({
          title: 'Success',
          message: 'Category created successfully',
          color: 'green',
        });
      }
      
      await loadCategories();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      const message = error?.response?.data?.error || 'Failed to save category';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  };

  const handleDeleteCategory = (category: SchoolCategory) => {
    modals.openConfirmModal({
      title: 'Delete Category',
      children: (
        <div>
          <Text size="sm">
            Are you sure you want to delete the category "{category.category_name}"? 
          </Text>
          {category.subject_count > 0 && (
            <Alert color="orange" mt="md">
              This category is currently used by {category.subject_count} subject(s). 
              You cannot delete it until all subjects are moved to other categories.
            </Alert>
          )}
        </div>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { 
        color: 'red',
        disabled: category.subject_count > 0
      },
      onConfirm: async () => {
        try {
          if (currentSchoolId) {
            await subjectsService.deleteCategory(currentSchoolId, category.id);
            notifications.show({
              title: 'Success',
              message: 'Category deleted successfully',
              color: 'green',
            });
            await loadCategories();
          }
        } catch (error: any) {
          console.error('Failed to delete category:', error);
          const message = error?.response?.data?.error || 'Failed to delete category';
          notifications.show({
            title: 'Error',
            message,
            color: 'red',
          });
        }
      },
    });
  };

  if (!isSchoolManager && !isSuperAdmin) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Access Denied" color="red">
          You don't have permission to manage categories.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <div>
            <Title order={2}>Category Management</Title>
            <Text c="dimmed" size="sm">
              Manage subject categories for your school
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateCategory}
              disabled={loading}
            >
              Add Category
            </Button>
          </Group>
        </Group>

        <Card>
          {loading ? (
            <Group justify="center" py="xl">
              <Loader />
              <Text>Loading categories...</Text>
            </Group>
          ) : categories.length === 0 ? (
            <Group justify="center" py="xl">
              <Stack align="center">
                <IconTag size={48} stroke={1} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed">No categories found</Text>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreateCategory}>
                  Add Your First Category
                </Button>
              </Stack>
            </Group>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Category Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th>Subjects</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500}>{category.category_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {category.description || 'No description'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {category.color && (
                        <Group gap="xs">
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              backgroundColor: category.color,
                              border: '1px solid #ccc'
                            }}
                          />
                          <Text size="xs" c="dimmed">{category.color}</Text>
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" size="sm" variant="light">
                        {category.subject_count} subject{category.subject_count !== 1 ? 's' : ''}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(category.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="blue"
                          onClick={() => handleEditCategory(category)}
                          title="Edit category"
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteCategory(category)}
                          title="Delete category"
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

      {/* Create/Edit Category Modal */}
      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={
          <Group>
            <IconTag size={20} />
            <Text fw={600}>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </Text>
          </Group>
        }
        size="md"
      >
        <Stack>
          <TextInput
            label="Category Name"
            placeholder="e.g., Advanced Sciences"
            value={formData.category_name}
            onChange={(e) => setFormData({...formData, category_name: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Brief description of the category (optional)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
          />

          <ColorInput
            label="Color (Optional)"
            placeholder="Pick a color for this category"
            value={formData.color}
            onChange={(value) => setFormData({...formData, color: value})}
            swatches={[
              '#339af0', '#51cf66', '#ff6b6b', '#ffd43b', '#9775fa', 
              '#ff8cc8', '#74c0fc', '#ffa8a8', '#d0bfff', '#8ce99a'
            ]}
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              leftSection={editingCategory ? <IconCheck size={16} /> : <IconPlus size={16} />}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}