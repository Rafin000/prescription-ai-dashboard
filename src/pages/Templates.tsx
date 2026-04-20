import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { TemplateEditorModal } from '../components/templates/TemplateEditorModal';
import {
  templatesService,
  type RxTemplate,
  type UpsertTemplateRequest,
} from '../services/templatesService';
import { useAuthStore } from '../stores/authStore';

const TEMPLATES_KEY = ['rx-templates'];

export function Templates() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isOwner;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RxTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: templatesService.list,
  });

  const createMutation = useMutation({
    mutationFn: (body: UpsertTemplateRequest) => templatesService.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpsertTemplateRequest }) =>
      templatesService.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => templatesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });

  const useMutation_ = useMutation({
    mutationFn: (id: string) => templatesService.use(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (t: RxTemplate) => {
    setEditing(t);
    setEditorOpen(true);
  };
  const handleSave = async (body: UpsertTemplateRequest) => {
    if (editing) await updateMutation.mutateAsync({ id: editing.id, body });
    else await createMutation.mutateAsync(body);
  };
  const handleDelete = (t: RxTemplate) => {
    if (window.confirm(`Delete the "${t.name}" template? This can't be undone.`)) {
      removeMutation.mutate(t.id);
    }
  };
  const handleUse = async (t: RxTemplate) => {
    useMutation_.mutate(t.id);
    localStorage.setItem('pai.pendingTemplate', JSON.stringify(t));
    navigate('/start-consult');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rx templates"
        description="Save repeat-use prescriptions so you can start a consult three clicks away from sending the patient home."
        actions={
          <Button variant="primary" leftIcon={<Plus />} onClick={openNew}>
            New template
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-[13px] text-ink-3 italic">Loading templates…</div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="p-8">
            <Empty
              icon={<BookMarked />}
              title="No templates yet"
              description="Create one from your common consults — it'll live here and can seed a draft in one click."
              action={
                <Button variant="primary" leftIcon={<Plus />} onClick={openNew}>
                  New template
                </Button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-serif text-[16px] font-semibold text-ink truncate">
                    {t.name}
                  </div>
                  {t.description && (
                    <div className="text-[12.5px] text-ink-3 mt-1 leading-relaxed line-clamp-2">
                      {t.description}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge tone="accent" variant="soft" icon={<BookMarked />}>
                    {t.medicines.length} meds
                  </Badge>
                  {t.shared && (
                    <Badge tone="info" variant="soft" icon={<Users />}>
                      Team
                    </Badge>
                  )}
                </div>
              </div>

              {t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10.5px] font-semibold uppercase tracking-[1px] text-ink-3 bg-bg-muted rounded-xs px-1.5 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-[11.5px] text-ink-3 font-mono">
                Used {t.usageCount}× · updated{' '}
                {new Date(t.updatedAt).toLocaleDateString()}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-line">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Copy />}
                  onClick={() => handleUse(t)}
                >
                  Use
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Pencil />}
                  onClick={() => openEdit(t)}
                  disabled={t.shared && !isAdmin}
                  title={
                    t.shared && !isAdmin
                      ? 'Only the admin can edit shared templates'
                      : undefined
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 />}
                  onClick={() => handleDelete(t)}
                  disabled={t.shared && !isAdmin}
                  title={
                    t.shared && !isAdmin
                      ? 'Only the admin can delete shared templates'
                      : undefined
                  }
                  className="ml-auto text-danger hover:bg-danger-soft"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        initial={editing}
        canShare={!!isAdmin}
      />
    </div>
  );
}
