import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PendingStudent {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string;
  groupName: string;
  class?: string;
  phone?: string;
  mail?: string;
  status: string;
  start_date?: string;
  added_by?: string;
  created_at?: string;
}

export function PendingStudentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endDates, setEndDates] = useState<Record<string, string>>({});

  const { data: pendingData, isLoading } = useQuery<{ students: PendingStudent[] }>({
    queryKey: ['/api/admin/pending-students'],
    retry: false,
  });

  const approveStudentMutation = useMutation({
    mutationFn: async ({ studentId, groupId, endDate }: { studentId: string; groupId: string; endDate?: string }) => {
      await apiRequest('POST', '/api/admin/approve-student', { studentId, groupId, endDate });
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Uczeń został zatwierdzony",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się zatwierdzić ucznia",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (studentId: string, groupId: string) => {
    const endDate = endDates[studentId] || '';
    approveStudentMutation.mutate({ studentId, groupId, endDate });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uczniowie oczekujący na zatwierdzenie</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Instruktorzy dodali tych uczniów. Zatwierdź ich aby mogli uczestniczyć w zajęciach.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !pendingData?.students || pendingData.students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="mx-auto w-12 h-12 mb-4" />
            <p>Brak uczniów oczekujących na zatwierdzenie</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingData.students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-lg">
                        {student.first_name} {student.last_name}
                      </h3>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        ⏳ Oczekuje
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                      <div>
                        <strong>Grupa:</strong> {student.groupName}
                      </div>
                      {student.class && (
                        <div>
                          <strong>Klasa:</strong> {student.class}
                        </div>
                      )}
                      {student.phone && (
                        <div>
                          <strong>Telefon:</strong> {student.phone}
                        </div>
                      )}
                      {student.mail && (
                        <div>
                          <strong>Email:</strong> {student.mail}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      {student.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Data rozpoczęcia: {new Date(student.start_date).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                      {student.created_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Dodano: {new Date(student.created_at).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 w-full sm:max-w-xs">
                      <Label htmlFor={`end-date-${student.id}`} className="text-xs">
                        Data zakończenia (opcjonalnie)
                      </Label>
                      <Input
                        id={`end-date-${student.id}`}
                        type="date"
                        value={endDates[student.id] || ''}
                        onChange={(e) => setEndDates(prev => ({ ...prev, [student.id]: e.target.value }))}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pozostaw puste dla nieograniczonego dostępu
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleApprove(student.id, student.group_id)}
                      disabled={approveStudentMutation.isPending}
                      className="py-2 px-4 font-medium whitespace-nowrap"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Zatwierdź ucznia
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
