import { useState } from 'react';
import { Student, AttendanceItem } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, User, Calendar, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface StudentDetailsModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  groupId: string;
  currentAttendance?: AttendanceItem;
  onNotesUpdate: (studentId: string, notes: string) => void;
}

export function StudentDetailsModal({
  student,
  isOpen,
  onClose,
  selectedDate,
  groupId,
  currentAttendance,
  onNotesUpdate
}: StudentDetailsModalProps) {
  const [notes, setNotes] = useState(currentAttendance?.notes || '');
  const queryClient = useQueryClient();

  const saveNotesMutation = useMutation({
    mutationFn: async ({ studentId, notes: newNotes }: { studentId: string; notes: string }) => {
      return await fetch(`/api/attendance/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          date: selectedDate,
          student_id: studentId,
          notes: newNotes
        })
      }).then(res => res.json());
    },
    onSuccess: (_, variables) => {
      onNotesUpdate(variables.studentId, variables.notes);
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    }
  });

  if (!student) return null;

  const handleSaveNotes = () => {
    saveNotesMutation.mutate({ studentId: student.id, notes });
  };

  const handleCallPhone = () => {
    if (student.phone) {
      window.open(`tel:${student.phone}`, '_self');
    }
  };

  const handleSendEmail = () => {
    const email = `${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}@example.com`;
    const subject = `Wiadomość dotycząca ucznia ${student.first_name} ${student.last_name}`;
    const body = `Dzień dobry,\n\nPiszę w sprawie ucznia ${student.first_name} ${student.last_name} z grupy ${student.group_id}.\n\nPozdrawiam`;
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const attendanceStatus = currentAttendance?.status;
  const isPresent = attendanceStatus === 'obecny';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-student-details">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <User className="w-5 h-5 mr-2" />
            {student.first_name} {student.last_name}
          </DialogTitle>
          <DialogDescription className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            Frekwencja na dzień {formatDate(selectedDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Informacje o uczniu</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Grupa:</span>
                <div className="font-medium">{student.group_id}</div>
              </div>
              {student.class && (
                <div>
                  <span className="text-gray-600">Klasa:</span>
                  <div className="font-medium">{student.class}</div>
                </div>
              )}
              {student.phone && (
                <div>
                  <span className="text-gray-600">Telefon:</span>
                  <div className="font-medium">{student.phone}</div>
                </div>
              )}
              <div>
                <span className="text-gray-600">Status:</span>
                <div className={`font-medium ${isPresent ? 'text-green-700' : 'text-red-600'}`}>
                  {isPresent ? 'Obecny/a' : 'Nieobecny/a'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCallPhone}
              disabled={!student.phone}
              data-testid="button-call-phone"
            >
              <Phone className="w-4 h-4 mr-2" />
              Zadzwoń
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSendEmail}
              data-testid="button-send-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Wyślij email
            </Button>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="student-notes" className="text-sm font-medium text-gray-900">
              Notatki na dzień {formatDate(selectedDate)}
            </Label>
            <Textarea
              id="student-notes"
              placeholder="Dodaj notatkę o uczniu na ten dzień..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-notes"
            />
            <Button
              onClick={handleSaveNotes}
              disabled={saveNotesMutation.isPending || notes === (currentAttendance?.notes || '')}
              className="w-full"
              data-testid="button-save-notes"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveNotesMutation.isPending ? 'Zapisywanie...' : 'Zapisz notatkę'}
            </Button>
          </div>

          {/* Show current notes if any */}
          {currentAttendance?.notes && currentAttendance.notes !== notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Aktualna notatka:</h4>
              <p className="text-sm text-blue-800">{currentAttendance.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}