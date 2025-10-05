import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function AddStudentModal({ isOpen, onClose, groupId, groupName }: AddStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    startDate: new Date().toISOString().split('T')[0],
    class: '',
    phone: '',
    mail: '',
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest('POST', '/api/students', { ...data, groupId });
    },
    onSuccess: () => {
      toast({
        title: "Sukces!",
        description: "Uczeń został dodany i oczekuje na zatwierdzenie przez administratora",
      });
      // Invalidate all student queries to show new pending student immediately
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-students'] });
      onClose();
      setFormData({
        firstName: '',
        lastName: '',
        startDate: new Date().toISOString().split('T')[0],
        class: '',
        phone: '',
        mail: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się dodać ucznia",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStudentMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj ucznia do grupy: {groupName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Imię *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="startDate">Data rozpoczęcia *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Od kiedy uczeń zacznie zajęcia</p>
          </div>

          <div>
            <Label htmlFor="class">Klasa *</Label>
            <Input
              id="class"
              value={formData.class}
              onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
              required
              placeholder="np. 1A, 2B, 3C"
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="mail">Email</Label>
            <Input
              id="mail"
              type="email"
              value={formData.mail}
              onChange={(e) => setFormData(prev => ({ ...prev, mail: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={addStudentMutation.isPending}>
              {addStudentMutation.isPending ? 'Dodawanie...' : 'Dodaj ucznia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
