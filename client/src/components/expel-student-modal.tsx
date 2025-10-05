import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Student } from "@shared/schema";

interface ExpelStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function ExpelStudentModal({ isOpen, onClose, student }: ExpelStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const expelStudentMutation = useMutation({
    mutationFn: async ({ studentId, groupId, endDate }: { studentId: string; groupId: string; endDate: string }) => {
      await apiRequest('PATCH', '/api/admin/expel-student', { studentId, groupId, endDate });
    },
    onSuccess: () => {
      toast({
        title: "Sukces!",
        description: "Uczeń został wypisany",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      onClose();
      setEndDate(new Date().toISOString().split('T')[0]);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się wypisać ucznia",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !endDate) return;

    expelStudentMutation.mutate({ studentId: student.id, groupId: student.group_id, endDate });
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wypisz ucznia</DialogTitle>
          <DialogDescription>
            Wypisujesz ucznia: <strong>{student.first_name} {student.last_name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="end-date">Data wypisania *</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Data ostatniego dnia uczestnictwa w zajęciach
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={expelStudentMutation.isPending || !endDate}
              variant="destructive"
            >
              {expelStudentMutation.isPending ? 'Wypisywanie...' : 'Wypisz ucznia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
